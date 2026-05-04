import { and, desc, eq, gte } from "drizzle-orm";

import type { db as appDb } from "@/server/db";
import { calendarSyncRuns } from "@/server/db/schema";

type Database = typeof appDb;

export const calendarSyncLockWindowMs = 10 * 60 * 1000;
export const calendarSyncStaleThresholdMs = 6 * 60 * 60 * 1000;

export type CalendarSyncCounts = {
  eventsCancelled: number;
  eventsInserted: number;
  eventsScanned: number;
  eventsSkipped: number;
  eventsUpdated: number;
};

export class CalendarSyncAlreadyRunningError extends Error {
  constructor(syncRunId: string) {
    super(`Calendar sync is already running (${syncRunId})`);
    this.name = "CalendarSyncAlreadyRunningError";
  }
}

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
  const runningSyncRun = await findRecentRunningCalendarSyncRun({
    db,
    now: startedAt,
    userId,
  });

  if (runningSyncRun) {
    throw new CalendarSyncAlreadyRunningError(runningSyncRun.id);
  }

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

export async function findRecentRunningCalendarSyncRun({
  db,
  lockWindowMs = calendarSyncLockWindowMs,
  now = new Date(),
  userId,
}: {
  db: Database;
  lockWindowMs?: number;
  now?: Date;
  userId: string;
}) {
  const [syncRun] = await db
    .select({
      id: calendarSyncRuns.id,
      startedAt: calendarSyncRuns.startedAt,
    })
    .from(calendarSyncRuns)
    .where(
      and(
        eq(calendarSyncRuns.userId, userId),
        eq(calendarSyncRuns.status, "running"),
        gte(calendarSyncRuns.startedAt, getCalendarSyncLockCutoff(now, lockWindowMs)),
      ),
    )
    .orderBy(desc(calendarSyncRuns.startedAt))
    .limit(1);

  return syncRun ?? null;
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

export function isCalendarSyncStale({
  lastSyncedAt,
  now = new Date(),
  staleThresholdMs = calendarSyncStaleThresholdMs,
}: {
  lastSyncedAt: Date | null;
  now?: Date;
  staleThresholdMs?: number;
}) {
  if (!lastSyncedAt) {
    return true;
  }

  return now.getTime() - lastSyncedAt.getTime() > staleThresholdMs;
}

export function isCalendarSyncRunWithinLockWindow({
  lockWindowMs = calendarSyncLockWindowMs,
  now = new Date(),
  startedAt,
}: {
  lockWindowMs?: number;
  now?: Date;
  startedAt: Date;
}) {
  return startedAt.getTime() >= getCalendarSyncLockCutoff(now, lockWindowMs).getTime();
}

function getCalendarSyncLockCutoff(now: Date, lockWindowMs: number) {
  return new Date(now.getTime() - lockWindowMs);
}

function requireStoredRow<T>(row: T | undefined, message: string) {
  if (!row) {
    throw new Error(message);
  }

  return row;
}
