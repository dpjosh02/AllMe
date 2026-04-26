import {
  addDays,
  addMonths,
  createDeterministicRandom,
  formatMoney,
  hashStableValue,
  parseDateKey,
  randomInt,
  requireImportUserEmail,
  startOfMonth,
  SYNTHETIC_FINANCE_PROVIDER,
  SYNTHETIC_FINANCE_SOURCE_TYPE,
  toDateKey,
} from "./finance-test-data-utils";

type AccountSeedTarget = {
  id: string;
  name: string;
  institutionName: string | null;
  currency: string;
  currentBalance: number;
  latestSnapshotDate: string;
};

type SyntheticTransactionTemplate = {
  description: string;
  category: string;
  amount: [number, number];
  rawCategory: string[];
  personalFinanceCategory: {
    primary: string;
    detailed: string;
    confidence_level: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
  };
};

const userEmail = requireImportUserEmail();

const [
  { and, desc, eq, sql },
  { categorizeFinanceTransactions },
  { db },
  {
    financeAccounts,
    financeBalanceSnapshots,
    financeRawRecords,
    financeTransactions,
    users,
  },
] = await Promise.all([
  import("drizzle-orm"),
  import("@/features/finance/categorization/service"),
  import("@/server/db"),
  import("@/server/db/schema"),
]);

async function main() {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, userEmail));

  if (!user) {
    console.error(`No AllMe user found for ALLME_IMPORT_USER_EMAIL=${userEmail}`);
    process.exit(1);
  }

  const accounts = await loadAccountSeedTargets(user.id);

  if (accounts.length === 0) {
    console.error("No finance accounts found. Import Fintable data before seeding test data.");
    process.exit(1);
  }

  let balanceSnapshotsUpserted = 0;
  let transactionsUpserted = 0;
  let rawRecordsUpserted = 0;

  for (const account of accounts) {
    const result = await seedAccountHistory({ account, userId: user.id });
    balanceSnapshotsUpserted += result.balanceSnapshotsUpserted;
    transactionsUpserted += result.transactionsUpserted;
    rawRecordsUpserted += result.rawRecordsUpserted;
  }

  const categorization = await categorizeFinanceTransactions({
    db,
    userId: user.id,
  });

  console.info("Synthetic finance test data seeded.");
  console.info(`Accounts used as anchors: ${accounts.length}`);
  console.info(`Synthetic raw records upserted: ${rawRecordsUpserted}`);
  console.info(`Synthetic balance snapshots upserted: ${balanceSnapshotsUpserted}`);
  console.info(`Synthetic transactions upserted: ${transactionsUpserted}`);
  console.info(`Transactions scanned for categorization: ${categorization.transactionsScanned}`);
  console.info(`Transactions categorized by rule: ${categorization.ruleAssigned}`);
  console.info(`Transactions left uncategorized: ${categorization.uncategorized}`);
}

async function loadAccountSeedTargets(userId: string) {
  const activeAccounts = await db
    .select({
      id: financeAccounts.id,
      name: financeAccounts.name,
      institutionName: financeAccounts.institutionName,
      currency: financeAccounts.currency,
    })
    .from(financeAccounts)
    .where(and(eq(financeAccounts.userId, userId), eq(financeAccounts.isActive, true)))
    .orderBy(financeAccounts.institutionName, financeAccounts.name);

  const targets: AccountSeedTarget[] = [];

  for (const account of activeAccounts) {
    const [latestSnapshot] = await db
      .select({
        balance: financeBalanceSnapshots.balance,
        snapshotDate: financeBalanceSnapshots.snapshotDate,
      })
      .from(financeBalanceSnapshots)
      .where(eq(financeBalanceSnapshots.accountId, account.id))
      .orderBy(desc(financeBalanceSnapshots.snapshotDate))
      .limit(1);

    targets.push({
      ...account,
      currentBalance: Number(latestSnapshot?.balance ?? "1000"),
      latestSnapshotDate: latestSnapshot?.snapshotDate ?? toDateKey(new Date()),
    });
  }

  return targets;
}

async function seedAccountHistory({
  account,
  userId,
}: {
  account: AccountSeedTarget;
  userId: string;
}) {
  const random = createDeterministicRandom(account.id);
  const latestDate = parseDateKey(account.latestSnapshotDate);
  const startDate = addMonths(latestDate, -24);
  const balanceEndDate = addDays(latestDate, -1);
  const accountKind = getAccountKind(account);

  let rawRecordsUpserted = 0;
  let balanceSnapshotsUpserted = 0;
  let transactionsUpserted = 0;

  for (let date = startDate, dayIndex = 0; date <= balanceEndDate; date = addDays(date, 1), dayIndex += 1) {
    const snapshotDate = toDateKey(date);
    const balance = estimateHistoricalBalance({
      account,
      accountKind,
      dayIndex,
      random,
      totalDays: Math.max(1, daysBetween(startDate, latestDate)),
    });
    const rawRecord = await upsertSyntheticRawRecord({
      payload: {
        account_id: account.id,
        balance,
        currency: account.currency,
        snapshot_date: snapshotDate,
        synthetic: true,
        type: "balance_snapshot",
      },
      rowHash: hashStableValue({
        accountId: account.id,
        provider: SYNTHETIC_FINANCE_PROVIDER,
        snapshotDate,
        type: "balance_snapshot",
      }),
      sourceName: "balance_snapshots",
      userId,
    });

    rawRecordsUpserted += 1;

    await db
      .insert(financeBalanceSnapshots)
      .values({
        userId,
        accountId: account.id,
        snapshotDate,
        balance: formatMoney(balance),
        currency: account.currency,
        rawRecordId: rawRecord.id,
      })
      .onConflictDoUpdate({
        target: [financeBalanceSnapshots.accountId, financeBalanceSnapshots.snapshotDate],
        set: {
          balance: formatMoney(balance),
          currency: account.currency,
          rawRecordId: rawRecord.id,
        },
        setWhere: sql`${financeBalanceSnapshots.rawRecordId} in (
          select id from ${financeRawRecords}
          where ${financeRawRecords.provider} = ${SYNTHETIC_FINANCE_PROVIDER}
        )`,
      });

    balanceSnapshotsUpserted += 1;
  }

  for (
    let month = startOfMonth(startDate);
    month < latestDate;
    month = addMonths(month, 1)
  ) {
    const transactionCount = randomInt(random, 3, 4);

    for (let index = 0; index < transactionCount; index += 1) {
      const postedDate = toDateKey(
        new Date(month.getFullYear(), month.getMonth(), randomInt(random, 1, 25)),
      );
      const template = chooseTransactionTemplate({ accountKind, random });
      const amount = randomAmount(random, template.amount);
      const syntheticTransactionId = `synthetic_${hashStableValue({
        accountId: account.id,
        index,
        month: toDateKey(month),
        template: template.description,
      }).slice(0, 24)}`;
      const sourceFingerprint = hashStableValue({
        accountId: account.id,
        postedDate,
        provider: SYNTHETIC_FINANCE_PROVIDER,
        syntheticTransactionId,
      });
      const rawRecord = await upsertSyntheticRawRecord({
        payload: {
          account_id: account.id,
          amount,
          category: template.rawCategory,
          currency: account.currency,
          date: postedDate,
          name: template.description,
          pending: false,
          personal_finance_category: template.personalFinanceCategory,
          synthetic: true,
          transaction_id: syntheticTransactionId,
          type: accountKind === "investment" ? getInvestmentType(template) : "place",
        },
        rowHash: hashStableValue({
          provider: SYNTHETIC_FINANCE_PROVIDER,
          sourceFingerprint,
          type: "transaction",
        }),
        sourceName: "transactions",
        userId,
      });

      rawRecordsUpserted += 1;

      await db
        .insert(financeTransactions)
        .values({
          userId,
          accountId: account.id,
          rawRecordId: rawRecord.id,
          sourceFingerprint,
          postedDate,
          amount: formatMoney(amount),
          currency: account.currency,
          description: template.description,
          category: template.category,
          sourceType: SYNTHETIC_FINANCE_SOURCE_TYPE,
        })
        .onConflictDoUpdate({
          target: [
            financeTransactions.userId,
            financeTransactions.sourceFingerprint,
          ],
          set: {
            accountId: account.id,
            rawRecordId: rawRecord.id,
            postedDate,
            amount: formatMoney(amount),
            currency: account.currency,
            description: template.description,
            category: template.category,
            updatedAt: new Date(),
          },
        });

      transactionsUpserted += 1;
    }
  }

  return {
    balanceSnapshotsUpserted,
    rawRecordsUpserted,
    transactionsUpserted,
  };
}

async function upsertSyntheticRawRecord({
  payload,
  rowHash,
  sourceName,
  userId,
}: {
  payload: Record<string, unknown>;
  rowHash: string;
  sourceName: string;
  userId: string;
}) {
  const [rawRecord] = await db
    .insert(financeRawRecords)
    .values({
      userId,
      provider: SYNTHETIC_FINANCE_PROVIDER,
      sourceName,
      rowHash,
      payload,
    })
    .onConflictDoUpdate({
      target: [
        financeRawRecords.userId,
        financeRawRecords.provider,
        financeRawRecords.rowHash,
      ],
      set: {
        payload,
        importedAt: new Date(),
      },
    })
    .returning({ id: financeRawRecords.id });

  if (!rawRecord) {
    throw new Error("Failed to upsert synthetic raw record");
  }

  return rawRecord;
}

function getAccountKind(account: AccountSeedTarget) {
  const label = `${account.name} ${account.institutionName ?? ""}`.toLowerCase();

  if (label.includes("credit card") || label.includes("card")) {
    return "credit";
  }

  if (
    label.includes("fidelity") ||
    label.includes("ira") ||
    label.includes("invest") ||
    label.includes("savings plan")
  ) {
    return "investment";
  }

  return "cash";
}

function estimateHistoricalBalance({
  account,
  accountKind,
  dayIndex,
  random,
  totalDays,
}: {
  account: AccountSeedTarget;
  accountKind: string;
  dayIndex: number;
  random: () => number;
  totalDays: number;
}) {
  const progress = dayIndex / totalDays;
  const volatility =
    accountKind === "investment" ? 0.08 : accountKind === "credit" ? 0.18 : 0.04;
  const trendStart =
    account.currentBalance *
    (accountKind === "credit"
      ? 0.45 + random() * 0.5
      : 0.65 + random() * 0.25);
  const trend = trendStart + (account.currentBalance - trendStart) * progress;
  const cycle = Math.sin(dayIndex / 28) * Math.abs(account.currentBalance) * volatility;
  const noise = (random() - 0.5) * Math.abs(account.currentBalance) * volatility;

  return Math.round((trend + cycle + noise) * 100) / 100;
}

function chooseTransactionTemplate({
  accountKind,
  random,
}: {
  accountKind: string;
  random: () => number;
}) {
  const templates =
    accountKind === "investment"
      ? investmentTemplates
      : accountKind === "credit"
        ? creditTemplates
        : cashTemplates;

  return templates[randomInt(random, 0, templates.length - 1)];
}

function randomAmount(random: () => number, [min, max]: [number, number]) {
  return Math.round((min + random() * (max - min)) * 100) / 100;
}

function getInvestmentType(template: SyntheticTransactionTemplate) {
  if (template.description.includes("Dividend")) {
    return "DIVIDEND";
  }

  if (template.description.includes("Contribution")) {
    return "CONTRIBUTION";
  }

  if (template.description.includes("Sale")) {
    return "SELL";
  }

  return "BUY";
}

function daysBetween(start: Date, end: Date) {
  return Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
}

const cashTemplates = [
  {
    description: "Synthetic Payroll Deposit",
    category: "Income",
    amount: [1200, 2600],
    rawCategory: ["Transfer", "Payroll"],
    personalFinanceCategory: {
      primary: "INCOME",
      detailed: "INCOME_WAGES",
      confidence_level: "VERY_HIGH",
    },
  },
  {
    description: "Synthetic Grocery Market",
    category: "Groceries",
    amount: [-145, -38],
    rawCategory: ["Shops", "Supermarkets and Groceries"],
    personalFinanceCategory: {
      primary: "FOOD_AND_DRINK",
      detailed: "FOOD_AND_DRINK_GROCERIES",
      confidence_level: "VERY_HIGH",
    },
  },
  {
    description: "Synthetic Rent Payment",
    category: "Transfer",
    amount: [-1900, -900],
    rawCategory: ["Transfer", "Withdrawal"],
    personalFinanceCategory: {
      primary: "TRANSFER_OUT",
      detailed: "TRANSFER_OUT_ACCOUNT_TRANSFER",
      confidence_level: "HIGH",
    },
  },
  {
    description: "Synthetic Ride Share",
    category: "Transportation",
    amount: [-45, -12],
    rawCategory: ["Travel", "Taxi"],
    personalFinanceCategory: {
      primary: "TRANSPORTATION",
      detailed: "TRANSPORTATION_TAXIS_AND_RIDE_SHARES",
      confidence_level: "VERY_HIGH",
    },
  },
] satisfies SyntheticTransactionTemplate[];

const creditTemplates = [
  {
    description: "Synthetic Coffee Shop",
    category: "Restaurant",
    amount: [-18, -4],
    rawCategory: ["Food and Drink", "Restaurants", "Coffee Shop"],
    personalFinanceCategory: {
      primary: "FOOD_AND_DRINK",
      detailed: "FOOD_AND_DRINK_COFFEE",
      confidence_level: "VERY_HIGH",
    },
  },
  {
    description: "Synthetic Restaurant",
    category: "Restaurant",
    amount: [-95, -18],
    rawCategory: ["Food and Drink", "Restaurants"],
    personalFinanceCategory: {
      primary: "FOOD_AND_DRINK",
      detailed: "FOOD_AND_DRINK_RESTAURANT",
      confidence_level: "VERY_HIGH",
    },
  },
  {
    description: "Synthetic Pharmacy",
    category: "Medical Expenses",
    amount: [-80, -12],
    rawCategory: ["Shops", "Pharmacies"],
    personalFinanceCategory: {
      primary: "MEDICAL",
      detailed: "MEDICAL_PHARMACIES_AND_SUPPLEMENTS",
      confidence_level: "VERY_HIGH",
    },
  },
  {
    description: "Synthetic Online Marketplace",
    category: "Shopping",
    amount: [-160, -20],
    rawCategory: ["Shops", "Digital Purchase"],
    personalFinanceCategory: {
      primary: "GENERAL_MERCHANDISE",
      detailed: "GENERAL_MERCHANDISE_ONLINE_MARKETPLACES",
      confidence_level: "HIGH",
    },
  },
  {
    description: "Synthetic Credit Card Payment",
    category: "Payment",
    amount: [250, 900],
    rawCategory: ["Payment", "Credit Card"],
    personalFinanceCategory: {
      primary: "LOAN_PAYMENTS",
      detailed: "LOAN_PAYMENTS_CREDIT_CARD_PAYMENT",
      confidence_level: "VERY_HIGH",
    },
  },
] satisfies SyntheticTransactionTemplate[];

const investmentTemplates = [
  {
    description: "Synthetic Index Fund Purchase",
    category: "Investment",
    amount: [-750, -75],
    rawCategory: ["Service", "Financial", "Financial Planning and Investments"],
    personalFinanceCategory: {
      primary: "TRANSFER_OUT",
      detailed: "TRANSFER_OUT_INVESTMENT_AND_RETIREMENT_FUNDS",
      confidence_level: "HIGH",
    },
  },
  {
    description: "Synthetic Dividend",
    category: "Investment Income",
    amount: [8, 220],
    rawCategory: ["Service", "Financial", "Financial Planning and Investments"],
    personalFinanceCategory: {
      primary: "INCOME",
      detailed: "INCOME_DIVIDENDS",
      confidence_level: "HIGH",
    },
  },
  {
    description: "Synthetic Contribution",
    category: "Investment",
    amount: [100, 900],
    rawCategory: ["Transfer", "Deposit"],
    personalFinanceCategory: {
      primary: "TRANSFER_IN",
      detailed: "TRANSFER_IN_ACCOUNT_TRANSFER",
      confidence_level: "HIGH",
    },
  },
  {
    description: "Synthetic Fund Sale",
    category: "Investment",
    amount: [150, 1200],
    rawCategory: ["Service", "Financial", "Financial Planning and Investments"],
    personalFinanceCategory: {
      primary: "TRANSFER_IN",
      detailed: "TRANSFER_IN_ACCOUNT_TRANSFER",
      confidence_level: "HIGH",
    },
  },
] satisfies SyntheticTransactionTemplate[];

await main();
