"use client";

import { X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect } from "react";

export type CalendarEventDetail = {
  calendarColor: string | null;
  calendarName: string;
  description: string | null;
  endDate: string | null;
  endsAt: Date | null;
  htmlLink: string | null;
  id: string;
  isAllDay: boolean;
  location: string | null;
  startDate: string | null;
  startsAt: Date | null;
  status: string;
  title: string;
};

export function CalendarEventDetailDrawer({
  event,
  onClose,
}: {
  event: CalendarEventDetail | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!event) {
      return;
    }

    function closeOnEscape(keyboardEvent: KeyboardEvent) {
      if (keyboardEvent.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", closeOnEscape);

    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [event, onClose]);

  if (!event) {
    return null;
  }

  const timeLabel = getEventTimeLabel(event);
  const todayDateKey = getEventTodayDateKey(event);
  const todayHref = todayDateKey
    ? { pathname: "/today", query: { date: todayDateKey } }
    : null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-end bg-black/35 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
    >
      <button
        aria-label="Close event details"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <section className="relative flex max-h-[calc(100vh-3rem)] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--panel-strong)] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] p-5">
          <div className="min-w-0">
            <p className="allme-kicker">Event details</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
              {event.title}
            </h2>
          </div>
          <button
            aria-label="Close event details"
            className="allme-control inline-flex h-10 w-10 shrink-0 items-center justify-center p-0"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto p-5">
          <div className="grid gap-3">
            <EventDetailRow label="When" value={timeLabel} />
            <EventDetailRow
              label="Calendar"
              value={
                <span className="inline-flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0 rounded-full border border-[var(--line)]"
                    style={{
                      backgroundColor: event.calendarColor ?? "var(--accent)",
                    }}
                  />
                  <span className="truncate">{event.calendarName}</span>
                </span>
              }
            />
            {event.location ? (
              <EventDetailRow label="Location" value={event.location} />
            ) : null}
            <EventDetailRow label="Status" value={formatStatus(event.status)} />
          </div>

          {event.description ? (
            <div className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--empty)] p-4">
              <p className="allme-kicker">Description</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">
                {event.description}
              </p>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            {todayHref ? (
              <Link
                className="inline-flex rounded-full border border-[var(--accent)] bg-[var(--accent)]/10 px-4 py-2 text-sm font-semibold text-[var(--accent)] transition hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
                href={todayHref}
                onClick={onClose}
              >
                Review day in Today
              </Link>
            ) : null}
            {event.htmlLink ? (
              <a
                className="inline-flex rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
                href={event.htmlLink}
                rel="noreferrer"
                target="_blank"
              >
                Open in Google Calendar
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function EventDetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid gap-2 rounded-2xl border border-[var(--line)] bg-[var(--empty)] px-4 py-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
      <p className="allme-kicker">{label}</p>
      <div className="min-w-0 text-sm font-semibold text-[var(--foreground)]">
        {value}
      </div>
    </div>
  );
}

export function getEventTimeLabel(event: CalendarEventDetail) {
  if (event.isAllDay) {
    return event.startDate
      ? `All day · ${formatDateKey(event.startDate)}`
      : "All day";
  }

  if (!event.startsAt) {
    return "Time TBD";
  }

  const startLabel = eventDateTimeFormatter.format(event.startsAt);

  if (!event.endsAt) {
    return startLabel;
  }

  const endLabel = isSameLocalDate(event.startsAt, event.endsAt)
    ? eventTimeFormatter.format(event.endsAt)
    : eventDateTimeFormatter.format(event.endsAt);

  return `${startLabel} - ${endLabel}`;
}

function formatDateKey(dateKey: string) {
  return eventDateFormatter.format(new Date(`${dateKey}T00:00:00`));
}

function getEventTodayDateKey(event: CalendarEventDetail) {
  if (event.startDate) {
    return event.startDate;
  }

  if (!event.startsAt) {
    return null;
  }

  return [
    event.startsAt.getFullYear(),
    String(event.startsAt.getMonth() + 1).padStart(2, "0"),
    String(event.startsAt.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatStatus(status: string) {
  return status.slice(0, 1).toUpperCase() + status.slice(1);
}

function isSameLocalDate(left: Date, right: Date) {
  return eventDateFormatter.format(left) === eventDateFormatter.format(right);
}

const eventDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

const eventDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

const eventTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});
