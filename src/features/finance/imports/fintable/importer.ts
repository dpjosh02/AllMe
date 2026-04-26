import { and, eq } from "drizzle-orm";

import { categorizeFinanceTransactions } from "@/features/finance/categorization/service";
import { createFintableImportPlan } from "@/features/finance/imports/fintable/plan";
import type { FintableGoogleSheetsSnapshot } from "@/features/finance/integrations/fintable/google-sheets";
import type { db as appDb } from "@/server/db";
import {
  financeAccounts,
  financeBalanceSnapshots,
  financeConnections,
  financeImportRuns,
  financeRawRecords,
  financeTransactions,
} from "@/server/db/schema";

type Database = typeof appDb;

export type ImportFintableSnapshotInput = {
  db: Database;
  userId: string;
  snapshot: FintableGoogleSheetsSnapshot;
};

export async function importFintableSnapshot({
  db,
  userId,
  snapshot,
}: ImportFintableSnapshotInput) {
  const startedAt = new Date();
  const plan = createFintableImportPlan(snapshot);
  const rowsScanned = plan.rawRecords.length;

  const [connection] = await db
    .insert(financeConnections)
    .values({
      userId,
      provider: "fintable",
      displayName: "Fintable Google Sheets",
      sourceType: "google_sheets",
    })
    .onConflictDoUpdate({
      target: [financeConnections.userId, financeConnections.provider],
      set: {
        displayName: "Fintable Google Sheets",
        sourceType: "google_sheets",
        isActive: true,
        updatedAt: new Date(),
      },
    })
    .returning({ id: financeConnections.id });

  if (!connection) {
    throw new Error("Failed to create or load Fintable finance connection");
  }

  const [importRun] = await db
    .insert(financeImportRuns)
    .values({
      userId,
      connectionId: connection.id,
      sourceType: "fintable_google_sheets",
      status: "running",
      startedAt,
      rowsScanned,
    })
    .returning({ id: financeImportRuns.id });

  if (!importRun) {
    throw new Error("Failed to create Fintable import run");
  }

  try {
    const rawRecordIdsByHash = new Map<string, string>();

    for (const record of plan.rawRecords) {
      const [rawRecord] = await db
        .insert(financeRawRecords)
        .values({
          userId,
          importRunId: importRun.id,
          provider: record.provider,
          sourceName: record.sourceName,
          rowHash: record.rowHash,
          payload: record.payload,
        })
        .onConflictDoUpdate({
          target: [
            financeRawRecords.userId,
            financeRawRecords.provider,
            financeRawRecords.rowHash,
          ],
          set: {
            importRunId: importRun.id,
            payload: record.payload,
            importedAt: new Date(),
          },
        })
        .returning({ id: financeRawRecords.id, rowHash: financeRawRecords.rowHash });

      if (rawRecord) {
        rawRecordIdsByHash.set(rawRecord.rowHash, rawRecord.id);
      }
    }

    const accountIdsBySourceId = new Map<string, string>();
    const accountIdsByName = new Map<string, string>();

    for (const account of plan.accounts) {
      const [existingAccountBySourceId] = await db
        .select({
          id: financeAccounts.id,
          sourceAccountId: financeAccounts.sourceAccountId,
          name: financeAccounts.name,
        })
        .from(financeAccounts)
        .where(
          and(
            eq(financeAccounts.userId, userId),
            eq(financeAccounts.sourceAccountId, account.sourceAccountId),
          ),
        )
        .limit(1);

      if (!existingAccountBySourceId) {
        const [existingAccountByName] = await db
          .select({
            id: financeAccounts.id,
            sourceAccountId: financeAccounts.sourceAccountId,
            name: financeAccounts.name,
          })
          .from(financeAccounts)
          .where(and(eq(financeAccounts.userId, userId), eq(financeAccounts.name, account.name)))
          .limit(1);

        if (existingAccountByName) {
          const [mergedAccount] = await db
            .update(financeAccounts)
            .set({
              connectionId: connection.id,
              sourceAccountId: account.sourceAccountId,
              institutionName: account.institutionName,
              currency: account.currency,
              isActive: true,
              updatedAt: new Date(),
            })
            .where(eq(financeAccounts.id, existingAccountByName.id))
            .returning({
              id: financeAccounts.id,
              sourceAccountId: financeAccounts.sourceAccountId,
              name: financeAccounts.name,
            });

          if (mergedAccount) {
            accountIdsBySourceId.set(mergedAccount.sourceAccountId, mergedAccount.id);
            accountIdsByName.set(mergedAccount.name, mergedAccount.id);
          }

          continue;
        }
      }

      const [storedAccount] = await db
        .insert(financeAccounts)
        .values({
          userId,
          connectionId: connection.id,
          sourceAccountId: account.sourceAccountId,
          name: account.name,
          institutionName: account.institutionName,
          type: account.type,
          currency: account.currency,
        })
        .onConflictDoUpdate({
          target: [financeAccounts.userId, financeAccounts.sourceAccountId],
          set: {
            connectionId: connection.id,
            name: account.name,
            institutionName: account.institutionName,
            currency: account.currency,
            isActive: true,
            updatedAt: new Date(),
          },
        })
        .returning({
          id: financeAccounts.id,
          sourceAccountId: financeAccounts.sourceAccountId,
          name: financeAccounts.name,
        });

      if (storedAccount) {
        accountIdsBySourceId.set(storedAccount.sourceAccountId, storedAccount.id);
        accountIdsByName.set(storedAccount.name, storedAccount.id);
      }
    }

    for (const balance of plan.balances) {
      const accountId = accountIdsBySourceId.get(balance.sourceAccountId);
      if (!accountId) {
        continue;
      }

      await db
        .insert(financeBalanceSnapshots)
        .values({
          userId,
          accountId,
          snapshotDate: balance.snapshotDate,
          balance: balance.balance,
          currency: balance.currency,
          rawRecordId: rawRecordIdsByHash.get(balance.rowHash),
        })
        .onConflictDoUpdate({
          target: [
            financeBalanceSnapshots.accountId,
            financeBalanceSnapshots.snapshotDate,
          ],
          set: {
            balance: balance.balance,
            currency: balance.currency,
            rawRecordId: rawRecordIdsByHash.get(balance.rowHash),
          },
        });
    }

    for (const transaction of plan.transactions) {
      const accountId = accountIdsByName.get(transaction.sourceAccountName);
      if (!accountId) {
        continue;
      }

      await db
        .insert(financeTransactions)
        .values({
          userId,
          accountId,
          rawRecordId: rawRecordIdsByHash.get(transaction.rowHash),
          sourceFingerprint: transaction.sourceFingerprint,
          postedDate: transaction.postedDate,
          amount: transaction.amount,
          currency: transaction.currency,
          description: transaction.description,
          category: transaction.category,
          sourceType: transaction.sourceType,
        })
        .onConflictDoUpdate({
          target: [financeTransactions.userId, financeTransactions.sourceFingerprint],
          set: {
            accountId,
            rawRecordId: rawRecordIdsByHash.get(transaction.rowHash),
            postedDate: transaction.postedDate,
            amount: transaction.amount,
            currency: transaction.currency,
            description: transaction.description,
            category: transaction.category,
            updatedAt: new Date(),
          },
        });
    }

    await db
      .update(financeImportRuns)
      .set({
        status: "succeeded",
        finishedAt: new Date(),
        rowsInserted: plan.rawRecords.length + plan.accounts.length + plan.transactions.length,
        rowsSkipped: plan.unmatchedTransactions.length,
      })
      .where(eq(financeImportRuns.id, importRun.id));

    const categorization = await categorizeFinanceTransactions({ db, userId });

    return {
      importRunId: importRun.id,
      accounts: plan.accounts.length,
      balances: plan.balances.length,
      transactions: plan.transactions.length,
      rawRecords: plan.rawRecords.length,
      unmatchedTransactions: plan.unmatchedTransactions.length,
      categorizedTransactions: categorization.ruleAssigned,
      uncategorizedTransactions: categorization.uncategorized,
    };
  } catch (error) {
    await db
      .update(financeImportRuns)
      .set({
        status: "failed",
        finishedAt: new Date(),
        errorSummary: error instanceof Error ? error.message : "Unknown import error",
      })
      .where(and(eq(financeImportRuns.id, importRun.id), eq(financeImportRuns.userId, userId)));

    throw error;
  }
}
