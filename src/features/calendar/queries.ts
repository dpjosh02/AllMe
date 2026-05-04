import { and, asc, desc, eq, gte, ne, sql } from "drizzle-orm";

import { getCalendarWeekAgenda } from "@/features/calendar/agenda-query";
import {
  attachLinkedNotesToCalendarEvents,
  getCalendarEventNoteLinksForEvents,
} from "@/features/calendar/event-note-links";
import {
  getGoogleCalendarConnectionStatus,
  googleCalendarReadonlyScope,
} from "@/features/calendar/sync/connection";
import {
  isCalendarSyncRunWithinLockWindow,
  isCalendarSyncStale,
} from "@/features/calendar/sync/lifecycle";
import { getLocalDateKey } from "@/features/today/date";
import { db } from "@/server/db";
import {
  calendarCalendars,
  calendarEventAnnotations,
  calendarEvents,
  calendarSyncRuns,
  userSettings,
} from "@/server/db/schema";

export type CalendarPageData = Awaited<ReturnType<typeof getCalendarPageData>>;
type CalendarStatusTone = "attention" | "neutral" | "ready";
type CalendarSyncStatusTone = "attention" | "neutral" | "ready";
const defaultTimezone = "America/Chicago";

export async function getCalendarPageData(userId: string) {
  const timezone = await getCalendarTimezone(userId);
  const weekStartDateKey = getLocalDateKey({ timezone });
  const [
    connection,
    latestSyncRun,
    calendarCounts,
    calendarSources,
    upcomingEvents,
    weekAgenda,
  ] = await Promise.all([
      getGoogleCalendarConnectionStatus({ db, userId }),
      getLatestCalendarSyncRun(userId),
      getCalendarCounts(userId),
      getCalendarSources(userId),
      getUpcomingCalendarEvents(userId),
      getCalendarWeekAgenda({
        startDateKey: weekStartDateKey,
        timezone,
        userId,
      }),
    ]);
  const hasReadonlyScope = Boolean(
    connection?.scopes.includes(googleCalendarReadonlyScope),
  );
  const connectionReady = connection?.status === "active" && hasReadonlyScope;
  const tone: CalendarStatusTone = connectionReady
    ? "ready"
    : connection
      ? "attention"
      : "neutral";
  const syncStatus = getCalendarSyncStatus({
    connectionReady,
    lastSyncedAt: connection?.lastSyncedAt ?? null,
    latestSyncRun,
    now: new Date(),
  });

  return {
    calendars: calendarCounts.calendars,
    calendarSources,
    connection: {
      accountEmail: connection?.accountEmail ?? "Not connected",
      badgeLabel: connectionReady
        ? "Connected"
        : connection
          ? "Needs reauthorization"
          : "Not connected",
      hasReadonlyScope,
      isReady: connectionReady,
      lastSyncedAt: connection?.lastSyncedAt ?? null,
      status: connection?.status ?? "not_connected",
      tone,
    },
    events: calendarCounts.events,
    selectedCalendars: calendarCounts.selectedCalendars,
    latestSyncRun,
    syncStatus,
    timezone,
    upcomingEvents,
    weekAgenda,
    weekStartDateKey,
  };
}

function getCalendarSyncStatus({
  connectionReady,
  lastSyncedAt,
  latestSyncRun,
  now,
}: {
  connectionReady: boolean;
  lastSyncedAt: Date | null;
  latestSyncRun: Awaited<ReturnType<typeof getLatestCalendarSyncRun>>;
  now: Date;
}) {
  if (!connectionReady) {
    return {
      detail: "Connect Google Calendar before syncing local data.",
      label: "Not connected",
      status: "not_connected" as const,
      tone: "neutral" as CalendarSyncStatusTone,
    };
  }

  if (
    latestSyncRun?.status === "running" &&
    latestSyncRun.startedAt &&
    isCalendarSyncRunWithinLockWindow({ now, startedAt: latestSyncRun.startedAt })
  ) {
    return {
      detail: "A sync is currently running. New manual syncs are temporarily blocked.",
      label: "Syncing",
      status: "running" as const,
      tone: "neutral" as CalendarSyncStatusTone,
    };
  }

  if (latestSyncRun?.status === "failed") {
    return {
      detail: "The latest sync failed. Local Calendar data may be stale.",
      label: "Sync failed",
      status: "failed" as const,
      tone: "attention" as CalendarSyncStatusTone,
    };
  }

  if (!lastSyncedAt) {
    return {
      detail: "No successful Calendar sync has completed yet.",
      label: "Never synced",
      status: "never" as const,
      tone: "neutral" as CalendarSyncStatusTone,
    };
  }

  if (isCalendarSyncStale({ lastSyncedAt, now })) {
    return {
      detail: "Local Calendar data is older than the freshness window.",
      label: "Stale",
      status: "stale" as const,
      tone: "attention" as CalendarSyncStatusTone,
    };
  }

  return {
    detail: "Local Calendar data is inside the freshness window.",
    label: "Fresh",
    status: "fresh" as const,
    tone: "ready" as CalendarSyncStatusTone,
  };
}

async function getCalendarTimezone(userId: string) {
  const [settings] = await db
    .select({ timezone: userSettings.timezone })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  return settings?.timezone ?? defaultTimezone;
}

async function getCalendarSources(userId: string) {
  const rows = await db
    .select({
      color: calendarCalendars.color,
      eventCount: sql<number>`count(${calendarEvents.id})::int`,
      id: calendarCalendars.id,
      isPrimary: calendarCalendars.isPrimary,
      isSelected: calendarCalendars.isSelected,
      name: calendarCalendars.name,
      timezone: calendarCalendars.timezone,
    })
    .from(calendarCalendars)
    .leftJoin(calendarEvents, eq(calendarEvents.calendarId, calendarCalendars.id))
    .where(
      and(
        eq(calendarCalendars.userId, userId),
        eq(calendarCalendars.isDeleted, false),
      ),
    )
    .groupBy(
      calendarCalendars.id,
      calendarCalendars.color,
      calendarCalendars.isPrimary,
      calendarCalendars.isSelected,
      calendarCalendars.name,
      calendarCalendars.timezone,
    )
    .orderBy(desc(calendarCalendars.isPrimary), asc(calendarCalendars.name));

  return rows;
}

async function getUpcomingCalendarEvents(userId: string) {
  const rows = await db
    .select({
      calendarColor: calendarCalendars.color,
      calendarId: calendarEvents.calendarId,
      calendarName: calendarCalendars.name,
      description: calendarEvents.description,
      endAt: calendarEvents.endAt,
      endDate: calendarEvents.endDate,
      htmlLink: calendarEvents.htmlLink,
      id: calendarEvents.id,
      isAllDay: calendarEvents.isAllDay,
      location: calendarEvents.location,
      localReviewStatus: calendarEventAnnotations.reviewStatus,
      recurringEventId: calendarEvents.recurringEventId,
      sourceIcalUid: calendarEvents.sourceIcalUid,
      startAt: calendarEvents.startAt,
      startDate: calendarEvents.startDate,
      status: calendarEvents.status,
      title: calendarEvents.title,
    })
    .from(calendarEvents)
    .innerJoin(
      calendarCalendars,
      eq(calendarEvents.calendarId, calendarCalendars.id),
    )
    .leftJoin(
      calendarEventAnnotations,
      and(
        eq(calendarEventAnnotations.eventId, calendarEvents.id),
        eq(calendarEventAnnotations.userId, userId),
      ),
    )
    .where(
      and(
        eq(calendarEvents.userId, userId),
        eq(calendarCalendars.userId, userId),
        eq(calendarCalendars.isSelected, true),
        eq(calendarCalendars.isDeleted, false),
        ne(calendarEvents.status, "cancelled"),
        gte(
          sql`coalesce(${calendarEvents.startAt}, ${calendarEvents.startDate})`,
          new Date(),
        ),
      ),
    )
    .orderBy(
      asc(sql`coalesce(${calendarEvents.startAt}, ${calendarEvents.startDate})`),
    )
    .limit(8);

  const links = await getCalendarEventNoteLinksForEvents({ events: rows, userId });

  return attachLinkedNotesToCalendarEvents({ events: rows, links });
}

async function getLatestCalendarSyncRun(userId: string) {
  const [run] = await db
    .select({
      createdAt: calendarSyncRuns.createdAt,
      eventsCancelled: calendarSyncRuns.eventsCancelled,
      eventsInserted: calendarSyncRuns.eventsInserted,
      eventsScanned: calendarSyncRuns.eventsScanned,
      eventsSkipped: calendarSyncRuns.eventsSkipped,
      eventsUpdated: calendarSyncRuns.eventsUpdated,
      finishedAt: calendarSyncRuns.finishedAt,
      hasErrorSummary: sql<boolean>`${calendarSyncRuns.errorSummary} is not null`,
      id: calendarSyncRuns.id,
      startedAt: calendarSyncRuns.startedAt,
      status: calendarSyncRuns.status,
      windowEnd: calendarSyncRuns.windowEnd,
      windowStart: calendarSyncRuns.windowStart,
    })
    .from(calendarSyncRuns)
    .where(eq(calendarSyncRuns.userId, userId))
    .orderBy(desc(calendarSyncRuns.createdAt))
    .limit(1);

  return run ?? null;
}

async function getCalendarCounts(userId: string) {
  const [[calendarCount], [selectedCalendarCount], [eventCount]] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(calendarCalendars)
      .where(eq(calendarCalendars.userId, userId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(calendarCalendars)
      .where(
        and(
          eq(calendarCalendars.userId, userId),
          eq(calendarCalendars.isSelected, true),
          eq(calendarCalendars.isDeleted, false),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(calendarEvents)
      .where(eq(calendarEvents.userId, userId)),
  ]);

  return {
    calendars: calendarCount?.count ?? 0,
    events: eventCount?.count ?? 0,
    selectedCalendars: selectedCalendarCount?.count ?? 0,
  };
}
