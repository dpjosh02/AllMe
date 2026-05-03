import { addDaysToDateKey } from "@/features/today/date";

export type CalendarAgendaEventStatus = "cancelled" | "confirmed" | "tentative";

export type TodayAgendaSourceRow = {
  calendarColor: string | null;
  calendarId: string;
  calendarIsDeleted: boolean;
  calendarIsSelected: boolean;
  calendarName: string;
  endAt: Date | null;
  endDate: string | null;
  htmlLink: string | null;
  id: string;
  isAllDay: boolean;
  location: string | null;
  startAt: Date | null;
  startDate: string | null;
  status: CalendarAgendaEventStatus;
  title: string;
};

export type TodayAgendaItem = {
  calendarColor: string | null;
  calendarId: string;
  calendarName: string;
  endDate: string | null;
  endsAt: Date | null;
  htmlLink: string | null;
  id: string;
  isAllDay: boolean;
  location: string | null;
  source: "google_calendar";
  startDate: string | null;
  startsAt: Date | null;
  status: Exclude<CalendarAgendaEventStatus, "cancelled">;
  title: string;
};

export function getTodayAgendaItems({
  dateKey,
  rows,
  timezone,
}: {
  dateKey: string;
  rows: TodayAgendaSourceRow[];
  timezone: string;
}) {
  const dayWindow = getUtcDayWindow({ dateKey, timezone });

  return rows
    .filter((row) => shouldIncludeAgendaRow({ dayWindow, row, dateKey }))
    .sort(compareAgendaRows)
    .map(toTodayAgendaItem);
}

function shouldIncludeAgendaRow({
  dateKey,
  dayWindow,
  row,
}: {
  dateKey: string;
  dayWindow: UtcDayWindow;
  row: TodayAgendaSourceRow;
}) {
  if (row.status === "cancelled" || !row.calendarIsSelected || row.calendarIsDeleted) {
    return false;
  }

  if (row.isAllDay) {
    return isAllDayEventOnDate({ dateKey, endDate: row.endDate, startDate: row.startDate });
  }

  return isTimedEventInDayWindow({
    dayWindow,
    endAt: row.endAt,
    startAt: row.startAt,
  });
}

function isAllDayEventOnDate({
  dateKey,
  endDate,
  startDate,
}: {
  dateKey: string;
  endDate: string | null;
  startDate: string | null;
}) {
  if (!startDate) {
    return false;
  }

  if (!endDate) {
    return startDate === dateKey;
  }

  return startDate <= dateKey && dateKey < endDate;
}

function isTimedEventInDayWindow({
  dayWindow,
  endAt,
  startAt,
}: {
  dayWindow: UtcDayWindow;
  endAt: Date | null;
  startAt: Date | null;
}) {
  if (!startAt) {
    return false;
  }

  if (!endAt) {
    return startAt >= dayWindow.start && startAt < dayWindow.end;
  }

  return startAt < dayWindow.end && endAt > dayWindow.start;
}

function compareAgendaRows(left: TodayAgendaSourceRow, right: TodayAgendaSourceRow) {
  if (left.isAllDay !== right.isAllDay) {
    return left.isAllDay ? -1 : 1;
  }

  if (left.isAllDay) {
    return left.title.localeCompare(right.title);
  }

  return getSortTime(left) - getSortTime(right);
}

function getSortTime(row: TodayAgendaSourceRow) {
  return row.startAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
}

function toTodayAgendaItem(row: TodayAgendaSourceRow): TodayAgendaItem {
  if (row.status === "cancelled") {
    throw new Error("Cancelled calendar events cannot be agenda items.");
  }

  return {
    calendarColor: row.calendarColor,
    calendarId: row.calendarId,
    calendarName: row.calendarName,
    endDate: row.endDate,
    endsAt: row.endAt,
    htmlLink: row.htmlLink,
    id: row.id,
    isAllDay: row.isAllDay,
    location: row.location,
    source: "google_calendar",
    startDate: row.startDate,
    startsAt: row.startAt,
    status: row.status,
    title: row.title,
  };
}

type UtcDayWindow = {
  end: Date;
  start: Date;
};

function getUtcDayWindow({
  dateKey,
  timezone,
}: {
  dateKey: string;
  timezone: string;
}): UtcDayWindow {
  return {
    end: getUtcInstantForLocalDateTime({
      dateKey: addDaysToDateKey(dateKey, 1),
      timezone,
    }),
    start: getUtcInstantForLocalDateTime({ dateKey, timezone }),
  };
}

function getUtcInstantForLocalDateTime({
  dateKey,
  timezone,
}: {
  dateKey: string;
  timezone: string;
}) {
  const [year, month, day] = dateKey.split("-").map(Number);
  let candidate = new Date(Date.UTC(year, month - 1, day));

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const offset = getTimezoneOffsetMs({ instant: candidate, timezone });
    candidate = new Date(Date.UTC(year, month - 1, day) - offset);
  }

  return candidate;
}

function getTimezoneOffsetMs({
  instant,
  timezone,
}: {
  instant: Date;
  timezone: string;
}) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).formatToParts(instant);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  const localAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );

  return localAsUtc - instant.getTime();
}
