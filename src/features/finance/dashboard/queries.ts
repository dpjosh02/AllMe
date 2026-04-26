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

export type FinanceDashboardData = Awaited<ReturnType<typeof getFinanceDashboardData>>;

export async function getFinanceDashboardData() {
  const [accountSummary] = await db
    .select({
      accountCount: sql<number>`count(*)::int`,
    })
    .from(financeAccounts)
    .where(eq(financeAccounts.isActive, true));

  const [transactionSummary] = await db
    .select({
      transactionCount: sql<number>`count(*)::int`,
      totalOutflow:
        sql<string>`coalesce(sum(case when ${financeTransactions.amount}::numeric < 0 then abs(${financeTransactions.amount}::numeric) else 0 end), 0)::text`,
      totalInflow:
        sql<string>`coalesce(sum(case when ${financeTransactions.amount}::numeric > 0 then ${financeTransactions.amount}::numeric else 0 end), 0)::text`,
    })
    .from(financeTransactions);

  const [categorizationSummary] = await db
    .select({
      categorizedCount:
        sql<number>`count(${financeTransactionCategoryAssignments.id}) filter (where ${financeTransactionCategoryAssignments.source} <> 'uncategorized')::int`,
      uncategorizedCount:
        sql<number>`count(*) filter (where ${financeTransactionCategoryAssignments.id} is null or ${financeTransactionCategoryAssignments.source} = 'uncategorized')::int`,
    })
    .from(financeTransactions)
    .leftJoin(
      financeTransactionCategoryAssignments,
      eq(financeTransactionCategoryAssignments.transactionId, financeTransactions.id),
    );

  const activeAccounts = await db
    .select({
      id: financeAccounts.id,
      name: financeAccounts.name,
      displayName: financeAccounts.displayName,
      institutionName: financeAccounts.institutionName,
      type: financeAccounts.type,
      currency: financeAccounts.currency,
    })
    .from(financeAccounts)
    .where(eq(financeAccounts.isActive, true))
    .orderBy(financeAccounts.institutionName, financeAccounts.name);

  const accounts = await Promise.all(
    activeAccounts.map(async (account) => {
      const [latestBalance] = await db
        .select({
          balance: financeBalanceSnapshots.balance,
          snapshotDate: financeBalanceSnapshots.snapshotDate,
        })
        .from(financeBalanceSnapshots)
        .where(eq(financeBalanceSnapshots.accountId, account.id))
        .orderBy(desc(financeBalanceSnapshots.snapshotDate))
        .limit(1);

      return {
        ...account,
        balance: latestBalance?.balance ?? null,
        snapshotDate: latestBalance?.snapshotDate ?? null,
      };
    }),
  );

  const recentTransactions = await getRecentFinanceTransactions({ limit: 1000 });

  const metricTransactions = await db
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
      eq(financeTransactionCategoryAssignments.transactionId, financeTransactions.id),
    )
    .leftJoin(
      financeUserCategories,
      eq(financeUserCategories.id, financeTransactionCategoryAssignments.categoryId),
    );

  const [latestImport] = await db
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
    .orderBy(desc(financeImportRuns.createdAt))
    .limit(1);

  return {
    summary: {
      accountCount: accountSummary?.accountCount ?? 0,
      transactionCount: transactionSummary?.transactionCount ?? 0,
      totalOutflow: transactionSummary?.totalOutflow ?? "0",
      totalInflow: transactionSummary?.totalInflow ?? "0",
      categorizedCount: categorizationSummary?.categorizedCount ?? 0,
      uncategorizedCount: categorizationSummary?.uncategorizedCount ?? 0,
    },
    accounts,
    categories: await getFinanceCategoryOptions(),
    metricTransactions,
    recentTransactions,
    latestImport: latestImport ?? null,
  };
}

export async function getFinanceAccountDetail(accountId: string) {
  const [account] = await db
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
    .where(and(eq(financeAccounts.id, accountId), eq(financeAccounts.isActive, true)))
    .limit(1);

  if (!account) {
    return null;
  }

  const [latestBalance] = await db
    .select({
      balance: financeBalanceSnapshots.balance,
      snapshotDate: financeBalanceSnapshots.snapshotDate,
    })
    .from(financeBalanceSnapshots)
    .where(eq(financeBalanceSnapshots.accountId, account.id))
    .orderBy(desc(financeBalanceSnapshots.snapshotDate))
    .limit(1);

  const transactions = await getRecentFinanceTransactions({
    accountId: account.id,
    limit: 1000,
  });

  return {
    ...account,
    balance: latestBalance?.balance ?? null,
    categories: await getFinanceCategoryOptions(),
    snapshotDate: latestBalance?.snapshotDate ?? null,
    transactions,
  };
}

async function getFinanceCategoryOptions() {
  return db
    .select({
      id: financeUserCategories.id,
      name: financeUserCategories.name,
      slug: financeUserCategories.slug,
      color: financeUserCategories.color,
      includeInIncome: financeUserCategories.includeInIncome,
      includeInSpending: financeUserCategories.includeInSpending,
      transactionCount:
        sql<number>`count(${financeTransactionCategoryAssignments.id})::int`,
    })
    .from(financeUserCategories)
    .leftJoin(
      financeTransactionCategoryAssignments,
      eq(financeTransactionCategoryAssignments.categoryId, financeUserCategories.id),
    )
    .groupBy(financeUserCategories.id)
    .orderBy(financeUserCategories.sortOrder, financeUserCategories.name);
}

async function getRecentFinanceTransactions({
  accountId,
  limit,
}: {
  accountId?: string;
  limit: number;
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
    .innerJoin(financeAccounts, eq(financeAccounts.id, financeTransactions.accountId))
    .leftJoin(
      financeTransactionCategoryAssignments,
      eq(financeTransactionCategoryAssignments.transactionId, financeTransactions.id),
    )
    .leftJoin(
      financeUserCategories,
      eq(financeUserCategories.id, financeTransactionCategoryAssignments.categoryId),
    )
    .leftJoin(financeRawRecords, eq(financeRawRecords.id, financeTransactions.rawRecordId))
    .where(accountId ? eq(financeTransactions.accountId, accountId) : undefined)
    .orderBy(desc(financeTransactions.postedDate), desc(financeTransactions.createdAt))
    .limit(limit);

  return rows.map(({ rawPayload, ...transaction }) => ({
    ...transaction,
    ...extractRawTransactionDetails(rawPayload),
  }));
}

function extractRawTransactionDetails(payload: Record<string, unknown> | null) {
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
    rawPersonalFinanceConfidence: getString(personalFinanceCategory?.confidence_level),
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
