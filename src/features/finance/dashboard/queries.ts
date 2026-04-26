import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/server/db";
import {
  financeAccounts,
  financeBalanceSnapshots,
  financeImportRuns,
  financeTransactions,
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

  const accounts = await db
    .select({
      id: financeAccounts.id,
      name: financeAccounts.name,
      institutionName: financeAccounts.institutionName,
      type: financeAccounts.type,
      currency: financeAccounts.currency,
      balance: financeBalanceSnapshots.balance,
      snapshotDate: financeBalanceSnapshots.snapshotDate,
    })
    .from(financeAccounts)
    .leftJoin(
      financeBalanceSnapshots,
      eq(financeBalanceSnapshots.accountId, financeAccounts.id),
    )
    .where(eq(financeAccounts.isActive, true))
    .orderBy(financeAccounts.institutionName, financeAccounts.name);

  const recentTransactions = await db
    .select({
      id: financeTransactions.id,
      postedDate: financeTransactions.postedDate,
      description: financeTransactions.description,
      amount: financeTransactions.amount,
      currency: financeTransactions.currency,
      category: financeTransactions.category,
      accountName: financeAccounts.name,
    })
    .from(financeTransactions)
    .innerJoin(financeAccounts, eq(financeAccounts.id, financeTransactions.accountId))
    .orderBy(desc(financeTransactions.postedDate), desc(financeTransactions.createdAt))
    .limit(12);

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
    },
    accounts,
    recentTransactions,
    latestImport: latestImport ?? null,
  };
}
