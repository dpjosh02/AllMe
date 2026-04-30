import { and, eq } from "drizzle-orm";

import type { FintableImportPlan } from "@/features/finance/imports/fintable/plan";
import type { db as appDb } from "@/server/db";
import { financeConnections, financeImportRuns } from "@/server/db/schema";

type Database = typeof appDb;

export async function upsertFintableConnection({
  db,
  userId,
}: {
  db: Database;
  userId: string;
}) {
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

  return requireStoredRow(
    connection,
    "Failed to create or load Fintable finance connection",
  );
}

export async function createImportRun({
  connectionId,
  db,
  rowsScanned,
  startedAt,
  userId,
}: {
  connectionId: string;
  db: Database;
  rowsScanned: number;
  startedAt: Date;
  userId: string;
}) {
  const [importRun] = await db
    .insert(financeImportRuns)
    .values({
      userId,
      connectionId,
      sourceType: "fintable_google_sheets",
      status: "running",
      startedAt,
      rowsScanned,
    })
    .returning({ id: financeImportRuns.id });

  return requireStoredRow(importRun, "Failed to create Fintable import run");
}

export async function markImportRunSucceeded({
  db,
  importRunId,
  plan,
}: {
  db: Database;
  importRunId: string;
  plan: FintableImportPlan;
}) {
  await db
    .update(financeImportRuns)
    .set({
      status: "succeeded",
      finishedAt: new Date(),
      rowsInserted:
        plan.rawRecords.length +
        plan.accounts.length +
        plan.transactions.length,
      rowsSkipped: plan.unmatchedTransactions.length,
    })
    .where(eq(financeImportRuns.id, importRunId));
}

export async function markImportRunFailed({
  db,
  error,
  importRunId,
  userId,
}: {
  db: Database;
  error: unknown;
  importRunId: string;
  userId: string;
}) {
  await db
    .update(financeImportRuns)
    .set({
      status: "failed",
      finishedAt: new Date(),
      errorSummary:
        error instanceof Error ? error.message : "Unknown import error",
    })
    .where(
      and(
        eq(financeImportRuns.id, importRunId),
        eq(financeImportRuns.userId, userId),
      ),
    );
}

function requireStoredRow<T>(row: T | undefined, message: string) {
  if (!row) {
    throw new Error(message);
  }

  return row;
}
