import {
  markGoogleCalendarConnectionSynced,
} from "@/features/calendar/sync/connection";
import {
  createCalendarSyncRun,
  markCalendarSyncRunFailed,
  markCalendarSyncRunSucceeded,
  markCalendarSyncTokenWritten,
} from "@/features/calendar/sync/lifecycle";
import {
  createCalendarSyncImportPlan,
  type CalendarSyncSnapshot,
} from "@/features/calendar/sync/plan";
import {
  updateCalendarSyncToken,
  upsertCalendarEventRecords,
  upsertCalendarRecords,
} from "@/features/calendar/sync/records";
import type { db as appDb } from "@/server/db";

type Database = typeof appDb;

export type ImportCalendarSnapshotInput = {
  connectionId: string;
  db: Database;
  snapshot: CalendarSyncSnapshot;
  syncKind?: "full" | "incremental" | "recovery_full";
  userId: string;
  windowEnd?: Date;
  windowStart?: Date;
};

export async function importCalendarSnapshot({
  connectionId,
  db,
  snapshot,
  syncKind = "full",
  userId,
  windowEnd,
  windowStart,
}: ImportCalendarSnapshotInput) {
  const startedAt = new Date();
  const plan = createCalendarSyncImportPlan(snapshot, { observedAt: startedAt });
  const syncRun = await createCalendarSyncRun({
    connectionId,
    db,
    startedAt,
    syncKind,
    userId,
    windowEnd,
    windowStart,
  });

  try {
    const calendarIdsBySourceId = await upsertCalendarRecords({
      connectionId,
      db,
      plan,
      userId,
    });

    await upsertCalendarEventRecords({
      calendarIdsBySourceId,
      connectionId,
      db,
      plan,
      userId,
    });

    await updateCalendarSyncTokens({
      connectionId,
      db,
      plan,
      userId,
    });
    await markCalendarSyncTokenWritten({
      db,
      syncRunId: syncRun.id,
      userId,
    });

    await markCalendarSyncRunSucceeded({
      counts: getCalendarSyncCounts(plan),
      db,
      syncRunId: syncRun.id,
      userId,
    });
    await markGoogleCalendarConnectionSynced({
      connectionId,
      db,
      syncedAt: new Date(),
      userId,
    });

    return {
      syncRunId: syncRun.id,
      calendars: plan.calendars.length,
      events: plan.events.length,
      unmatchedEvents: plan.unmatchedEvents.length,
      cancelledEvents: plan.events.filter((event) => event.status === "cancelled")
        .length,
    };
  } catch (error) {
    await markCalendarSyncRunFailed({
      db,
      error,
      syncRunId: syncRun.id,
      userId,
    });

    throw error;
  }
}

async function updateCalendarSyncTokens({
  connectionId,
  db,
  plan,
  userId,
}: {
  connectionId: string;
  db: Database;
  plan: ReturnType<typeof createCalendarSyncImportPlan>;
  userId: string;
}) {
  for (const calendar of plan.calendars) {
    if (!calendar.syncToken) {
      continue;
    }

    await updateCalendarSyncToken({
      connectionId,
      db,
      sourceCalendarId: calendar.sourceCalendarId,
      syncToken: calendar.syncToken,
      userId,
    });
  }
}

function getCalendarSyncCounts(plan: ReturnType<typeof createCalendarSyncImportPlan>) {
  return {
    eventsCancelled: plan.events.filter((event) => event.status === "cancelled")
      .length,
    eventsInserted: plan.events.length,
    eventsScanned: plan.events.length + plan.unmatchedEvents.length,
    eventsSkipped: plan.unmatchedEvents.length,
    eventsUpdated: 0,
  };
}
