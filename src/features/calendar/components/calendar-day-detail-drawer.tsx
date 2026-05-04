"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import type { CalendarPageData } from "@/features/calendar/queries";

type CalendarDayDetail = CalendarPageData["weekAgenda"][number];
type CalendarDayEvent = CalendarDayDetail["items"][number];

export function CalendarDayDetailDrawer({
  day,
  onClose,
  openEvent,
}: {
  day: CalendarDayDetail | null;
  onClose: () => void;
  openEvent: (event: CalendarDayEvent) => void;
}) {
  if (!day) {
    return null;
  }

  return (
    <CalendarDayDetailDrawerContent
      day={day}
      onClose={onClose}
      openEvent={openEvent}
    />
  );
}

function CalendarDayDetailDrawerContent({
  day,
  onClose,
  openEvent,
}: {
  day: CalendarDayDetail;
  onClose: () => void;
  openEvent: (event: CalendarDayEvent) => void;
}) {
  const todayHref = {
    pathname: "/today",
    query: { date: day.dateKey },
  };

  useEffect(() => {
    function closeOnEscape(keyboardEvent: KeyboardEvent) {
      if (keyboardEvent.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", closeOnEscape);

    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-40 grid place-items-end bg-black/25 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
    >
      <button
        aria-label="Close day agenda"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <section className="relative flex max-h-[calc(100vh-3rem)] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--panel-strong)] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] p-5">
          <div className="min-w-0">
            <p className="allme-kicker">Day agenda</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
              {weekdayFormatter.format(toLocalDate(day.dateKey))}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {compactDateFormatter.format(toLocalDate(day.dateKey))} ·{" "}
              {formatEventCount(day.items.length)}
            </p>
          </div>
          <button
            aria-label="Close day agenda"
            className="allme-control inline-flex h-10 w-10 shrink-0 items-center justify-center p-0"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto p-5">
          {day.items.length > 0 ? (
            <div className="grid gap-2">
              {day.items.map((event) => (
                <button
                  className={[
                    "w-full rounded-2xl border border-[var(--line)] bg-[var(--empty)] p-3 text-left transition hover:border-[var(--accent)]",
                    event.localReviewStatus === "ignored" ? "opacity-55" : "",
                  ].join(" ")}
                  key={event.id}
                  onClick={() => openEvent(event)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {event.title}
                      </p>
                      <p className="mt-1 truncate text-xs text-[var(--muted)]">
                        {event.calendarName}
                        {event.location ? ` · ${event.location}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-[var(--line)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">
                      {getEventTime(event)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--empty)] p-5">
              <p className="text-sm font-semibold">No matching events</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                This day has no cached events for the current Calendar focus.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-[var(--line)] p-4">
          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--line)] px-4 text-sm font-semibold text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            href={todayHref}
          >
            Open in Today
          </Link>
        </div>
      </section>
    </div>
  );
}

function getEventTime(event: CalendarDayEvent) {
  if (event.isAllDay) {
    return "All day";
  }

  return event.startsAt ? eventTimeFormatter.format(event.startsAt) : "TBD";
}

function formatEventCount(count: number) {
  return `${count} ${count === 1 ? "event" : "events"}`;
}

function toLocalDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`);
}

const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
});

const compactDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
});

const eventTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});
