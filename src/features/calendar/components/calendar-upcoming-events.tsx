"use client";

import { useState } from "react";

import {
  CalendarEventDetailDrawer,
  type CalendarEventDetail,
} from "@/features/calendar/components/calendar-event-detail-drawer";
import type { CalendarPageData } from "@/features/calendar/queries";

type UpcomingCalendarEvent = CalendarPageData["upcomingEvents"][number];

export function CalendarUpcomingEvents({
  events,
}: {
  events: UpcomingCalendarEvent[];
}) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventDetail | null>(
    null,
  );

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--empty)] p-5">
        <p className="text-lg font-semibold">No upcoming events</p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Run Calendar sync to refresh the local cache.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-0 overflow-y-auto pr-1">
        <div className="grid gap-2">
          {events.map((event) => (
            <UpcomingEventRow
              event={event}
              key={event.id}
              openEvent={() => setSelectedEvent(toEventDetail(event))}
            />
          ))}
        </div>
      </div>
      <CalendarEventDetailDrawer
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </>
  );
}

function UpcomingEventRow({
  event,
  openEvent,
}: {
  event: UpcomingCalendarEvent;
  openEvent: () => void;
}) {
  const dateLabel = event.isAllDay
    ? event.startDate
      ? eventDateFormatter.format(toLocalDate(event.startDate))
      : "Date TBD"
    : event.startAt
      ? eventDateFormatter.format(event.startAt)
      : "Date TBD";
  const timeLabel = event.isAllDay
    ? "All day"
    : event.startAt
      ? eventTimeFormatter.format(event.startAt)
      : "Time TBD";

  return (
    <button
      className="w-full rounded-lg border border-[var(--line)] bg-[var(--empty)] px-3 py-2 text-left transition hover:border-[var(--accent)]"
      onClick={openEvent}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full border border-[var(--line)]"
              style={{ backgroundColor: event.calendarColor ?? "var(--accent)" }}
            />
            <p className="truncate text-sm font-semibold">{event.title}</p>
          </div>
          <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
            {event.calendarName} · {dateLabel}
            {event.location ? ` · ${event.location}` : ""}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-[var(--line)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">
          {timeLabel}
        </span>
      </div>
    </button>
  );
}

function toEventDetail(event: UpcomingCalendarEvent): CalendarEventDetail {
  return {
    calendarColor: event.calendarColor,
    calendarName: event.calendarName,
    description: event.description,
    endDate: event.endDate,
    endsAt: event.endAt,
    htmlLink: event.htmlLink,
    id: event.id,
    isAllDay: event.isAllDay,
    location: event.location,
    startDate: event.startDate,
    startsAt: event.startAt,
    status: event.status,
    title: event.title,
  };
}

function toLocalDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`);
}

const eventDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

const eventTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});
