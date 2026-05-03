import { and, eq } from "drizzle-orm";

import type { db as appDb } from "@/server/db";
import { calendarSyncRuns } from "@/server/db/schema";

type Database = typeof appDb;

export type CalendarSyncCounts = {
  eventsCancelled: number;
  eventsInserted: number;
  eventsScanned: number;
  eventsSkipped: number;
  eventsUpdated: number;
};

export async function createCalendarSyncRun({
  calendarId,
  connectionId,
  db,
  startedAt,
  syncKind,
  userId,
  windowEnd,
  windowStart,
}: {
  calendarId?: string;
  connectionId?: string;
  db: Database;
  startedAt: Date;
  syncKind: "full" | "incremental" | "recovery_full";
  userId: string;
  windowEnd?: Date;
  windowStart?: Date;
}) {
  const [syncRun] = await db
    .insert(calendarSyncRuns)
    .values({
      calendarId,
      connectionId,
      sourceType: "google_calendar",
      startedAt,
      status: "running",
      syncKind,
      userId,
      windowEnd,
      windowStart,
    })
    .returning({ id: calendarSyncRuns.id });

  return requireStoredRow(syncRun, "Failed to create Calendar sync run");
}

export async function markCalendarSyncTokenWritten({
  db,
  syncRunId,
  userId,
}: {
  db: Database;
  syncRunId: string;
  userId: string;
}) {
  await db
    .update(calendarSyncRuns)
    .set({ nextSyncTokenWritten: true })
    .where(
      and(
        eq(calendarSyncRuns.id, syncRunId),
        eq(calendarSyncRuns.userId, userId),
      ),
    );
}

export async function markCalendarSyncRunSucceeded({
  counts,
  db,
  finishedAt = new Date(),
  syncRunId,
  userId,
}: {
  counts: CalendarSyncCounts;
  db: Database;
  finishedAt?: Date;
  syncRunId: string;
  userId: string;
}) {
  await db
    .update(calendarSyncRuns)
    .set({
      eventsCancelled: counts.eventsCancelled,
      eventsInserted: counts.eventsInserted,
      eventsScanned: counts.eventsScanned,
      eventsSkipped: counts.eventsSkipped,
      eventsUpdated: counts.eventsUpdated,
      finishedAt,
      status: "succeeded",
    })
    .where(
      and(
        eq(calendarSyncRuns.id, syncRunId),
        eq(calendarSyncRuns.userId, userId),
      ),
    );
}

export async function markCalendarSyncRunFailed({
  db,
  error,
  finishedAt = new Date(),
  syncRunId,
  userId,
}: {
  db: Database;
  error: unknown;
  finishedAt?: Date;
  syncRunId: string;
  userId: string;
}) {
  await db
    .update(calendarSyncRuns)
    .set({
      errorSummary: getCalendarSyncErrorSummary(error),
      finishedAt,
      status: "failed",
    })
    .where(
      and(
        eq(calendarSyncRuns.id, syncRunId),
        eq(calendarSyncRuns.userId, userId),
      ),
    );
}

export function getCalendarSyncErrorSummary(error: unknown) {
  return error instanceof Error ? error.message : "Unknown calendar sync error";
}

function requireStoredRow<T>(row: T | undefined, message: string) {
  if (!row) {
    throw new Error(message);
  }

  return row;
}
