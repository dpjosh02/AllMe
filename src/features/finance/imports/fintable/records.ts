import { eq } from "drizzle-orm";

import type { FintableImportPlan } from "@/features/finance/imports/fintable/plan";
import type { db as appDb } from "@/server/db";
import {
  financeBalanceSnapshots,
  financeRawRecords,
  financeTransactions,
} from "@/server/db/schema";

type Database = typeof appDb;

export async function upsertRawRecords({
  db,
  importRunId,
  plan,
  userId,
}: {
  db: Database;
  importRunId: string;
  plan: FintableImportPlan;
  userId: string;
}) {
  const rawRecordIdsByHash = new Map<string, string>();

  for (const record of plan.rawRecords) {
    const [rawRecord] = await db
      .insert(financeRawRecords)
      .values({
        userId,
        importRunId,
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
          importRunId,
          payload: record.payload,
          importedAt: new Date(),
        },
      })
      .returning({
        id: financeRawRecords.id,
        rowHash: financeRawRecords.rowHash,
      });

    addStoredRowToHashLookup(rawRecordIdsByHash, rawRecord);
  }

  return rawRecordIdsByHash;
}

export async function upsertBalanceSnapshots({
  accountIdsBySourceId,
  db,
  plan,
  rawRecordIdsByHash,
  userId,
}: {
  accountIdsBySourceId: Map<string, string>;
  db: Database;
  plan: FintableImportPlan;
  rawRecordIdsByHash: Map<string, string>;
  userId: string;
}) {
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
}

export async function upsertTransactions({
  accountIdsByName,
  db,
  plan,
  rawRecordIdsByHash,
  userId,
}: {
  accountIdsByName: Map<string, string>;
  db: Database;
  plan: FintableImportPlan;
  rawRecordIdsByHash: Map<string, string>;
  userId: string;
}) {
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
        target: [
          financeTransactions.userId,
          financeTransactions.sourceFingerprint,
        ],
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
}

function addStoredRowToHashLookup(
  rawRecordIdsByHash: Map<string, string>,
  rawRecord:
    | {
        id: string;
        rowHash: string;
      }
    | undefined,
) {
  if (rawRecord) {
    rawRecordIdsByHash.set(rawRecord.rowHash, rawRecord.id);
  }
}
