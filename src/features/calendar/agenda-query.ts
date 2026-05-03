import { and, eq, gt, gte, isNull, lt, ne, or } from "drizzle-orm";

import {
  getTodayAgendaDayWindow,
  getTodayAgendaItems,
  type TodayAgendaItem,
} from "@/features/calendar/agenda-read-model";
import { addDaysToDateKey } from "@/features/today/date";
import { db } from "@/server/db";
import { calendarCalendars, calendarEvents } from "@/server/db/schema";

export type GetTodayAgendaInput = {
  dateKey: string;
  timezone: string;
  userId: string;
};

export type CalendarWeekAgendaDay = {
  dateKey: string;
  items: TodayAgendaItem[];
};

export async function getTodayAgenda({
  dateKey,
  timezone,
  userId,
}: GetTodayAgendaInput): Promise<TodayAgendaItem[]> {
  const dayWindow = getTodayAgendaDayWindow({ dateKey, timezone });
  const rows = await db
    .select({
      calendarColor: calendarCalendars.color,
      calendarId: calendarEvents.calendarId,
      calendarIsDeleted: calendarCalendars.isDeleted,
      calendarIsSelected: calendarCalendars.isSelected,
      calendarName: calendarCalendars.name,
      endAt: calendarEvents.endAt,
      endDate: calendarEvents.endDate,
      htmlLink: calendarEvents.htmlLink,
      id: calendarEvents.id,
      isAllDay: calendarEvents.isAllDay,
      location: calendarEvents.location,
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
    .where(
      and(
        eq(calendarEvents.userId, userId),
        eq(calendarCalendars.userId, userId),
        eq(calendarCalendars.isSelected, true),
        eq(calendarCalendars.isDeleted, false),
        ne(calendarEvents.status, "cancelled"),
        or(
          getAllDayAgendaPredicate(dateKey),
          getTimedAgendaPredicate(dayWindow),
        ),
      ),
    )
    .limit(100);

  return getTodayAgendaItems({ dateKey, rows, timezone });
}

export async function getCalendarWeekAgenda({
  startDateKey,
  timezone,
  userId,
}: {
  startDateKey: string;
  timezone: string;
  userId: string;
}): Promise<CalendarWeekAgendaDay[]> {
  const dateKeys = Array.from({ length: 7 }, (_, index) =>
    addDaysToDateKey(startDateKey, index),
  );
  const days = await Promise.all(
    dateKeys.map(async (dateKey) => ({
      dateKey,
      items: await getTodayAgenda({ dateKey, timezone, userId }),
    })),
  );

  return days;
}

function getAllDayAgendaPredicate(dateKey: string) {
  return and(
    eq(calendarEvents.isAllDay, true),
    or(
      eq(calendarEvents.startDate, dateKey),
      and(
        lt(calendarEvents.startDate, dateKey),
        gt(calendarEvents.endDate, dateKey),
      ),
    ),
  );
}

function getTimedAgendaPredicate({
  end,
  start,
}: {
  end: Date;
  start: Date;
}) {
  return and(
    eq(calendarEvents.isAllDay, false),
    lt(calendarEvents.startAt, end),
    or(
      gt(calendarEvents.endAt, start),
      and(isNull(calendarEvents.endAt), gte(calendarEvents.startAt, start)),
    ),
  );
}
