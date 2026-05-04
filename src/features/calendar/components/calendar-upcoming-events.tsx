"use client";

import type { CalendarEventReviewStatus } from "@/features/calendar/components/calendar-event-detail-drawer";
import { CalendarEventReviewBadge } from "@/features/calendar/components/calendar-event-review-badge";
import type { CalendarPageData } from "@/features/calendar/queries";

type UpcomingCalendarEvent = CalendarPageData["upcomingEvents"][number];

export function CalendarUpcomingEvents({
  events,
  openEvent,
  reviewFocus,
}: {
  events: UpcomingCalendarEvent[];
  openEvent: (event: UpcomingCalendarEvent) => void;
  reviewFocus: CalendarEventReviewStatus | "all";
}) {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--empty)] p-5">
        <p className="text-lg font-semibold">No upcoming events</p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          {reviewFocus === "all"
            ? "Run Calendar sync to refresh the local cache."
            : "No upcoming events match the current focus."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
      <div className="grid gap-2">
        {events.map((event) => (
          <UpcomingEventRow
            event={event}
            key={event.id}
            openEvent={() => openEvent(event)}
          />
        ))}
      </div>
    </div>
  );
}

function UpcomingEventRow({
  event,
  openEvent,
}: {
  event: UpcomingCalendarEvent;
  openEvent: () => void;
}) {
  const reviewStatus = event.localReviewStatus ?? "none";
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
      className={[
        "w-full rounded-lg border border-[var(--line)] bg-[var(--empty)] px-3 py-2 text-left transition hover:border-[var(--accent)]",
        reviewStatus === "ignored" ? "opacity-55" : "",
      ].join(" ")}
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
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
            <CalendarEventReviewBadge status={reviewStatus} />
            <p className="truncate text-xs text-[var(--muted)]">
              {event.calendarName} · {dateLabel}
              {event.location ? ` · ${event.location}` : ""}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-[var(--line)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">
          {timeLabel}
        </span>
      </div>
    </button>
  );
}

function toLocalDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`);
}

const eventDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
});

const eventTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});
