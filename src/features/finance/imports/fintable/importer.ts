import { categorizeFinanceTransactions } from "@/features/finance/categorization/service";
import { upsertAccounts } from "@/features/finance/imports/fintable/accounts";
import {
  createImportRun,
  markImportRunFailed,
  markImportRunSucceeded,
  upsertFintableConnection,
} from "@/features/finance/imports/fintable/lifecycle";
import { createFintableImportPlan } from "@/features/finance/imports/fintable/plan";
import {
  upsertBalanceSnapshots,
  upsertRawRecords,
  upsertTransactions,
} from "@/features/finance/imports/fintable/records";
import type { FintableGoogleSheetsSnapshot } from "@/features/finance/integrations/fintable/google-sheets";
import type { db as appDb } from "@/server/db";

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

  const connection = await upsertFintableConnection({ db, userId });
  const importRun = await createImportRun({
    connectionId: connection.id,
    db,
    rowsScanned,
    startedAt,
    userId,
  });

  try {
    const rawRecordIdsByHash = await upsertRawRecords({
      db,
      importRunId: importRun.id,
      plan,
      userId,
    });
    const accountLookup = await upsertAccounts({
      connectionId: connection.id,
      db,
      plan,
      userId,
    });

    await upsertBalanceSnapshots({
      accountIdsBySourceId: accountLookup.bySourceId,
      db,
      plan,
      rawRecordIdsByHash,
      userId,
    });
    await upsertTransactions({
      accountIdsByName: accountLookup.byName,
      db,
      plan,
      rawRecordIdsByHash,
      userId,
    });
    await markImportRunSucceeded({ db, importRunId: importRun.id, plan });

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
    await markImportRunFailed({
      db,
      error,
      importRunId: importRun.id,
      userId,
    });

    throw error;
  }
}
