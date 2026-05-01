import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/server/db";
import {
  financeAccounts,
  financeBalanceSnapshots,
  financeTransactionCategoryAssignments,
  financeImportRuns,
  financeRawRecords,
  financeTransactions,
  financeUserCategories,
} from "@/server/db/schema";

export type FinanceDashboardData = Awaited<
  ReturnType<typeof getFinanceDashboardData>
>;

export async function getFinanceDashboardData(userId: string) {
  const [
    accountSummary,
    transactionSummary,
    categorizationSummary,
    activeAccounts,
    recentTransactions,
    metricTransactions,
    latestImport,
    categories,
  ] = await Promise.all([
    getAccountSummary(userId),
    getTransactionSummary(userId),
    getCategorizationSummary(userId),
    getActiveFinanceAccounts(userId),
    getRecentFinanceTransactions({ limit: 1000, userId }),
    getFinanceMetricTransactions(userId),
    getLatestFinanceImport(userId),
    getFinanceCategoryOptions(userId),
  ]);
  const accounts = await hydrateAccountsWithLatestBalances(
    activeAccounts,
    userId,
  );

  return {
    summary: createDashboardSummary(
      accountSummary,
      transactionSummary,
      categorizationSummary,
    ),
    accounts,
    categories,
    metricTransactions,
    recentTransactions,
    latestImport,
  };
}

export async function getFinanceAccountDetail({
  accountId,
  userId,
}: {
  accountId: string;
  userId: string;
}) {
  const account = await getActiveFinanceAccount(accountId, userId);

  if (!account) {
    return null;
  }

  const [latestBalance, transactions, categories] = await Promise.all([
    getLatestAccountBalance(account.id, userId),
    getRecentFinanceTransactions({
      accountId: account.id,
      limit: 1000,
      userId,
    }),
    getFinanceCategoryOptions(userId),
  ]);

  return {
    ...account,
    balance: latestBalance?.balance ?? null,
    categories,
    snapshotDate: latestBalance?.snapshotDate ?? null,
    transactions,
  };
}

async function getAccountSummary(userId: string) {
  const rows = await db
    .select({
      accountCount: sql<number>`count(*)::int`,
    })
    .from(financeAccounts)
    .where(
      and(
        eq(financeAccounts.userId, userId),
        eq(financeAccounts.isActive, true),
      ),
    );

  return firstRow(rows);
}

async function getTransactionSummary(userId: string) {
  const rows = await db
    .select({
      transactionCount: sql<number>`count(*)::int`,
      totalOutflow: sql<string>`coalesce(sum(case when ${financeTransactions.amount}::numeric < 0 then abs(${financeTransactions.amount}::numeric) else 0 end), 0)::text`,
      totalInflow: sql<string>`coalesce(sum(case when ${financeTransactions.amount}::numeric > 0 then ${financeTransactions.amount}::numeric else 0 end), 0)::text`,
    })
    .from(financeTransactions)
    .where(eq(financeTransactions.userId, userId));

  return firstRow(rows);
}

async function getCategorizationSummary(userId: string) {
  const rows = await db
    .select({
      categorizedCount: sql<number>`count(${financeTransactionCategoryAssignments.id}) filter (where ${financeTransactionCategoryAssignments.source} <> 'uncategorized')::int`,
      uncategorizedCount: sql<number>`count(*) filter (where ${financeTransactionCategoryAssignments.id} is null or ${financeTransactionCategoryAssignments.source} = 'uncategorized')::int`,
    })
    .from(financeTransactions)
    .leftJoin(
      financeTransactionCategoryAssignments,
      eq(
        financeTransactionCategoryAssignments.transactionId,
        financeTransactions.id,
      ),
    )
    .where(eq(financeTransactions.userId, userId));

  return firstRow(rows);
}

async function getActiveFinanceAccounts(userId: string) {
  return db
    .select({
      id: financeAccounts.id,
      name: financeAccounts.name,
      displayName: financeAccounts.displayName,
      institutionName: financeAccounts.institutionName,
      type: financeAccounts.type,
      currency: financeAccounts.currency,
    })
    .from(financeAccounts)
    .where(
      and(
        eq(financeAccounts.userId, userId),
        eq(financeAccounts.isActive, true),
      ),
    )
    .orderBy(financeAccounts.institutionName, financeAccounts.name);
}

async function hydrateAccountsWithLatestBalances(
  accounts: Awaited<ReturnType<typeof getActiveFinanceAccounts>>,
  userId: string,
) {
  return Promise.all(
    accounts.map(async (account) => {
      const latestBalance = await getLatestAccountBalance(account.id, userId);

      return {
        ...account,
        balance: latestBalance?.balance ?? null,
        snapshotDate: latestBalance?.snapshotDate ?? null,
      };
    }),
  );
}

async function getLatestAccountBalance(accountId: string, userId: string) {
  const rows = await db
    .select({
      balance: financeBalanceSnapshots.balance,
      snapshotDate: financeBalanceSnapshots.snapshotDate,
    })
    .from(financeBalanceSnapshots)
    .where(
      and(
        eq(financeBalanceSnapshots.userId, userId),
        eq(financeBalanceSnapshots.accountId, accountId),
      ),
    )
    .orderBy(desc(financeBalanceSnapshots.snapshotDate))
    .limit(1);

  return firstRow(rows);
}

async function getFinanceMetricTransactions(userId: string) {
  return db
    .select({
      id: financeTransactions.id,
      postedDate: financeTransactions.postedDate,
      amount: financeTransactions.amount,
      assignedCategoryName: financeUserCategories.name,
      categoryAssignmentSource: financeTransactionCategoryAssignments.source,
      includeInIncome: financeUserCategories.includeInIncome,
      includeInSpending: financeUserCategories.includeInSpending,
    })
    .from(financeTransactions)
    .leftJoin(
      financeTransactionCategoryAssignments,
      eq(
        financeTransactionCategoryAssignments.transactionId,
        financeTransactions.id,
      ),
    )
    .leftJoin(
      financeUserCategories,
      eq(
        financeUserCategories.id,
        financeTransactionCategoryAssignments.categoryId,
      ),
    )
    .where(eq(financeTransactions.userId, userId));
}

async function getLatestFinanceImport(userId: string) {
  const rows = await db
    .select({
      id: financeImportRuns.id,
      status: financeImportRuns.status,
      startedAt: financeImportRuns.startedAt,
      finishedAt: financeImportRuns.finishedAt,
      rowsScanned: financeImportRuns.rowsScanned,
      rowsInserted: financeImportRuns.rowsInserted,
      rowsSkipped: financeImportRuns.rowsSkipped,
      errorSummary: financeImportRuns.errorSummary,
    })
    .from(financeImportRuns)
    .where(eq(financeImportRuns.userId, userId))
    .orderBy(desc(financeImportRuns.createdAt))
    .limit(1);

  return firstRow(rows);
}

async function getActiveFinanceAccount(accountId: string, userId: string) {
  const rows = await db
    .select({
      id: financeAccounts.id,
      name: financeAccounts.name,
      displayName: financeAccounts.displayName,
      institutionName: financeAccounts.institutionName,
      type: financeAccounts.type,
      subtype: financeAccounts.subtype,
      currency: financeAccounts.currency,
      sourceAccountId: financeAccounts.sourceAccountId,
    })
    .from(financeAccounts)
    .where(
      and(
        eq(financeAccounts.id, accountId),
        eq(financeAccounts.userId, userId),
        eq(financeAccounts.isActive, true),
      ),
    )
    .limit(1);

  return firstRow(rows);
}

function createDashboardSummary(
  accountSummary: Awaited<ReturnType<typeof getAccountSummary>>,
  transactionSummary: Awaited<ReturnType<typeof getTransactionSummary>>,
  categorizationSummary: Awaited<ReturnType<typeof getCategorizationSummary>>,
) {
  const account = accountSummary ?? { accountCount: 0 };
  const transaction = transactionSummary ?? {
    transactionCount: 0,
    totalInflow: "0",
    totalOutflow: "0",
  };
  const categorization = categorizationSummary ?? {
    categorizedCount: 0,
    uncategorizedCount: 0,
  };

  return {
    accountCount: account.accountCount,
    transactionCount: transaction.transactionCount,
    totalOutflow: transaction.totalOutflow,
    totalInflow: transaction.totalInflow,
    categorizedCount: categorization.categorizedCount,
    uncategorizedCount: categorization.uncategorizedCount,
  };
}

async function getFinanceCategoryOptions(userId: string) {
  return db
    .select({
      id: financeUserCategories.id,
      name: financeUserCategories.name,
      slug: financeUserCategories.slug,
      color: financeUserCategories.color,
      includeInIncome: financeUserCategories.includeInIncome,
      includeInSpending: financeUserCategories.includeInSpending,
      transactionCount: sql<number>`count(${financeTransactionCategoryAssignments.id})::int`,
    })
    .from(financeUserCategories)
    .leftJoin(
      financeTransactionCategoryAssignments,
      eq(
        financeTransactionCategoryAssignments.categoryId,
        financeUserCategories.id,
      ),
    )
    .where(eq(financeUserCategories.userId, userId))
    .groupBy(financeUserCategories.id)
    .orderBy(financeUserCategories.sortOrder, financeUserCategories.name);
}

async function getRecentFinanceTransactions({
  accountId,
  limit,
  userId,
}: {
  accountId?: string;
  limit: number;
  userId: string;
}) {
  const rows = await db
    .select({
      id: financeTransactions.id,
      postedDate: financeTransactions.postedDate,
      description: financeTransactions.description,
      amount: financeTransactions.amount,
      currency: financeTransactions.currency,
      storedCategory: financeTransactions.category,
      assignedCategoryId: financeUserCategories.id,
      assignedCategoryName: financeUserCategories.name,
      assignedCategoryColor: financeUserCategories.color,
      categoryAssignmentSource: financeTransactionCategoryAssignments.source,
      accountId: financeAccounts.id,
      accountName: sql<string>`coalesce(${financeAccounts.displayName}, ${financeAccounts.name})`,
      rawPayload: financeRawRecords.payload,
    })
    .from(financeTransactions)
    .innerJoin(
      financeAccounts,
      eq(financeAccounts.id, financeTransactions.accountId),
    )
    .leftJoin(
      financeTransactionCategoryAssignments,
      eq(
        financeTransactionCategoryAssignments.transactionId,
        financeTransactions.id,
      ),
    )
    .leftJoin(
      financeUserCategories,
      eq(
        financeUserCategories.id,
        financeTransactionCategoryAssignments.categoryId,
      ),
    )
    .leftJoin(
      financeRawRecords,
      eq(financeRawRecords.id, financeTransactions.rawRecordId),
    )
    .where(
      accountId
        ? and(
            eq(financeTransactions.userId, userId),
            eq(financeTransactions.accountId, accountId),
          )
        : eq(financeTransactions.userId, userId),
    )
    .orderBy(
      desc(financeTransactions.postedDate),
      desc(financeTransactions.createdAt),
    )
    .limit(limit);

  return rows.map(({ rawPayload, ...transaction }) => ({
    ...transaction,
    ...extractRawTransactionDetails(rawPayload),
  }));
}

export function extractRawTransactionDetails(
  payload: Record<string, unknown> | null,
) {
  const personalFinanceCategory = getObject(payload?.personal_finance_category);
  const legacyCategory = Array.isArray(payload?.category)
    ? payload.category
        .map((entry) => (typeof entry === "string" ? entry : null))
        .filter(Boolean)
        .join(" > ")
    : getString(payload?.category);

  return {
    rawDescription: getString(payload?.name),
    rawMerchantName: getString(payload?.merchant_name),
    rawCategoryPath: legacyCategory,
    rawPersonalFinancePrimary: getString(personalFinanceCategory?.primary),
    rawPersonalFinanceDetailed: getString(personalFinanceCategory?.detailed),
    rawPersonalFinanceConfidence: getString(
      personalFinanceCategory?.confidence_level,
    ),
  };
}

function getObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getString(value: unknown) {
  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
}

function firstRow<T>(rows: T[]) {
  return rows.at(0) ?? null;
}
