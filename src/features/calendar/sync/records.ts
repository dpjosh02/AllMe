import { and, eq } from "drizzle-orm";

import type { CalendarSyncImportPlan } from "@/features/calendar/sync/plan";
import type { db as appDb } from "@/server/db";
import { calendarCalendars, calendarEvents } from "@/server/db/schema";

type Database = typeof appDb;

export async function upsertCalendarRecords({
  connectionId,
  db,
  plan,
  userId,
}: {
  connectionId: string;
  db: Database;
  plan: CalendarSyncImportPlan;
  userId: string;
}) {
  const calendarIdsBySourceId = new Map<string, string>();

  for (const calendar of plan.calendars) {
    const [storedCalendar] = await db
      .insert(calendarCalendars)
      .values({
        userId,
        connectionId,
        sourceCalendarId: calendar.sourceCalendarId,
        name: calendar.name,
        description: calendar.description,
        timezone: calendar.timezone,
        color: calendar.color,
        accessRole: calendar.accessRole,
        isPrimary: calendar.isPrimary,
        isSelected: calendar.isSelected,
        isDeleted: calendar.isDeleted,
        syncToken: calendar.syncToken,
        rawPayload: calendar.rawPayload,
      })
      .onConflictDoUpdate({
        target: [
          calendarCalendars.userId,
          calendarCalendars.connectionId,
          calendarCalendars.sourceCalendarId,
        ],
        set: {
          name: calendar.name,
          description: calendar.description,
          timezone: calendar.timezone,
          color: calendar.color,
          accessRole: calendar.accessRole,
          isPrimary: calendar.isPrimary,
          isDeleted: calendar.isDeleted,
          syncToken: calendar.syncToken,
          rawPayload: calendar.rawPayload,
          updatedAt: new Date(),
        },
      })
      .returning({
        id: calendarCalendars.id,
        sourceCalendarId: calendarCalendars.sourceCalendarId,
      });

    addStoredCalendarToLookup(calendarIdsBySourceId, storedCalendar);
  }

  return calendarIdsBySourceId;
}

export async function upsertCalendarEventRecords({
  calendarIdsBySourceId,
  connectionId,
  db,
  plan,
  userId,
}: {
  calendarIdsBySourceId: Map<string, string>;
  connectionId: string;
  db: Database;
  plan: CalendarSyncImportPlan;
  userId: string;
}) {
  for (const event of plan.events) {
    const calendarId = calendarIdsBySourceId.get(event.sourceCalendarId);
    if (!calendarId) {
      continue;
    }

    await db
      .insert(calendarEvents)
      .values({
        userId,
        connectionId,
        calendarId,
        sourceEventId: event.sourceEventId,
        sourceIcalUid: event.sourceIcalUid,
        recurringEventId: event.recurringEventId,
        originalStartAt: event.originalStartAt,
        title: event.title,
        description: event.description,
        location: event.location,
        status: event.status,
        visibility: event.visibility,
        transparency: event.transparency,
        startAt: event.startAt,
        endAt: event.endAt,
        startDate: event.startDate,
        endDate: event.endDate,
        isAllDay: event.isAllDay,
        timezone: event.timezone,
        htmlLink: event.htmlLink,
        etag: event.etag,
        providerUpdatedAt: event.providerUpdatedAt,
        cancelledAt: event.cancelledAt,
        rawPayload: event.rawPayload,
      })
      .onConflictDoUpdate({
        target: [
          calendarEvents.userId,
          calendarEvents.calendarId,
          calendarEvents.sourceEventId,
        ],
        set: {
          sourceIcalUid: event.sourceIcalUid,
          recurringEventId: event.recurringEventId,
          originalStartAt: event.originalStartAt,
          title: event.title,
          description: event.description,
          location: event.location,
          status: event.status,
          visibility: event.visibility,
          transparency: event.transparency,
          startAt: event.startAt,
          endAt: event.endAt,
          startDate: event.startDate,
          endDate: event.endDate,
          isAllDay: event.isAllDay,
          timezone: event.timezone,
          htmlLink: event.htmlLink,
          etag: event.etag,
          providerUpdatedAt: event.providerUpdatedAt,
          cancelledAt: event.cancelledAt,
          rawPayload: event.rawPayload,
          updatedAt: new Date(),
        },
      });
  }
}

export async function updateCalendarSyncToken({
  connectionId,
  db,
  sourceCalendarId,
  syncToken,
  userId,
}: {
  connectionId: string;
  db: Database;
  sourceCalendarId: string;
  syncToken: string;
  userId: string;
}) {
  await db
    .update(calendarCalendars)
    .set({
      syncToken,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(calendarCalendars.userId, userId),
        eq(calendarCalendars.connectionId, connectionId),
        eq(calendarCalendars.sourceCalendarId, sourceCalendarId),
      ),
    );
}

function addStoredCalendarToLookup(
  calendarIdsBySourceId: Map<string, string>,
  storedCalendar:
    | {
        id: string;
        sourceCalendarId: string;
      }
    | undefined,
) {
  if (storedCalendar) {
    calendarIdsBySourceId.set(storedCalendar.sourceCalendarId, storedCalendar.id);
  }
}
