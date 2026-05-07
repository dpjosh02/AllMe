import { and, desc, eq } from "drizzle-orm";

import { db } from "@/server/db";
import {
  financeAccounts,
  financeBalanceSnapshots,
  financeImportRuns,
  financeTransactionCategoryAssignments,
  financeTransactions,
  financeUserCategories,
} from "@/server/db/schema";

export type TodayFinanceSnapshot = {
  dateKey: string;
  hasFinanceData: boolean;
  isUnavailable: boolean;
  latestImport: TodayFinanceSnapshotImport | null;
  postedCount: number;
  totalIncome: number;
  totalSpending: number;
  uncategorizedCount: number;
};

export type TodayFinanceSnapshotImport = {
  finishedAt: Date | null;
  startedAt: Date | null;
  status: "pending" | "running" | "succeeded" | "failed";
};

export type TodayFinanceSnapshotTransaction = {
  amount: string;
  assignedCategoryId: string | null;
  categoryAssignmentSource:
    | "manual"
    | "rule"
    | "system"
    | "uncategorized"
    | null;
  includeInIncome: boolean | null;
  includeInSpending: boolean | null;
};

export async function getTodayFinanceSnapshot({
  dateKey,
  userId,
}: {
  dateKey: string;
  userId: string;
}) {
  const [transactions, hasFinanceData, latestImport] = await Promise.all([
    getTodayFinanceSnapshotTransactions({ dateKey, userId }),
    hasNormalizedFinanceData(userId),
    getLatestFinanceImport(userId),
  ]);

  return buildTodayFinanceSnapshot({
    dateKey,
    hasFinanceData,
    latestImport,
    transactions,
  });
}

export function buildTodayFinanceSnapshot({
  dateKey,
  hasFinanceData,
  latestImport,
  transactions,
}: {
  dateKey: string;
  hasFinanceData: boolean;
  latestImport: TodayFinanceSnapshotImport | null;
  transactions: TodayFinanceSnapshotTransaction[];
}): TodayFinanceSnapshot {
  return {
    dateKey,
    hasFinanceData,
    isUnavailable: false,
    latestImport,
    postedCount: transactions.length,
    totalIncome: transactions.reduce(
      (sum, transaction) =>
        Number(transaction.amount) > 0 && transaction.includeInIncome
          ? sum + Number(transaction.amount)
          : sum,
      0,
    ),
    totalSpending: transactions.reduce(
      (sum, transaction) =>
        Number(transaction.amount) < 0 && transaction.includeInSpending
          ? sum + Math.abs(Number(transaction.amount))
          : sum,
      0,
    ),
    uncategorizedCount: transactions.filter(isUncategorizedTransaction).length,
  };
}

export function createUnavailableTodayFinanceSnapshot(
  dateKey: string,
): TodayFinanceSnapshot {
  return {
    dateKey,
    hasFinanceData: true,
    isUnavailable: true,
    latestImport: null,
    postedCount: 0,
    totalIncome: 0,
    totalSpending: 0,
    uncategorizedCount: 0,
  };
}

async function getTodayFinanceSnapshotTransactions({
  dateKey,
  userId,
}: {
  dateKey: string;
  userId: string;
}) {
  return db
    .select({
      amount: financeTransactions.amount,
      assignedCategoryId: financeUserCategories.id,
      categoryAssignmentSource: financeTransactionCategoryAssignments.source,
      includeInIncome: financeUserCategories.includeInIncome,
      includeInSpending: financeUserCategories.includeInSpending,
    })
    .from(financeTransactions)
    .leftJoin(
      financeTransactionCategoryAssignments,
      and(
        eq(
          financeTransactionCategoryAssignments.transactionId,
          financeTransactions.id,
        ),
        eq(financeTransactionCategoryAssignments.userId, userId),
      ),
    )
    .leftJoin(
      financeUserCategories,
      and(
        eq(
          financeUserCategories.id,
          financeTransactionCategoryAssignments.categoryId,
        ),
        eq(financeUserCategories.userId, userId),
      ),
    )
    .where(
      and(
        eq(financeTransactions.userId, userId),
        eq(financeTransactions.postedDate, dateKey),
        eq(financeTransactions.status, "posted"),
      ),
    );
}

async function hasNormalizedFinanceData(userId: string) {
  const [transaction] = await db
    .select({ id: financeTransactions.id })
    .from(financeTransactions)
    .where(eq(financeTransactions.userId, userId))
    .limit(1);

  if (transaction) {
    return true;
  }

  const [activeAccount] = await db
    .select({ id: financeAccounts.id })
    .from(financeAccounts)
    .where(
      and(eq(financeAccounts.userId, userId), eq(financeAccounts.isActive, true)),
    )
    .limit(1);

  if (activeAccount) {
    return true;
  }

  const [balanceSnapshot] = await db
    .select({ id: financeBalanceSnapshots.id })
    .from(financeBalanceSnapshots)
    .where(eq(financeBalanceSnapshots.userId, userId))
    .limit(1);

  return Boolean(balanceSnapshot);
}

async function getLatestFinanceImport(userId: string) {
  const [latestImport] = await db
    .select({
      finishedAt: financeImportRuns.finishedAt,
      startedAt: financeImportRuns.startedAt,
      status: financeImportRuns.status,
    })
    .from(financeImportRuns)
    .where(eq(financeImportRuns.userId, userId))
    .orderBy(desc(financeImportRuns.createdAt))
    .limit(1);

  return latestImport ?? null;
}

function isUncategorizedTransaction(
  transaction: TodayFinanceSnapshotTransaction,
) {
  return (
    !transaction.categoryAssignmentSource ||
    transaction.categoryAssignmentSource === "uncategorized" ||
    !transaction.assignedCategoryId
  );
}
