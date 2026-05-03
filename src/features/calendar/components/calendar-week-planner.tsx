"use client";

import Link from "next/link";

import type { CalendarEventReviewStatus } from "@/features/calendar/components/calendar-event-detail-drawer";
import type { CalendarPageData } from "@/features/calendar/queries";

type WeekAgendaDayData = CalendarPageData["weekAgenda"][number];
type WeekAgendaItemData = WeekAgendaDayData["items"][number];

export function CalendarWeekPlanner({
  openEvent,
  reviewFocus,
  weekAgenda,
}: {
  openEvent: (item: WeekAgendaItemData) => void;
  reviewFocus: CalendarEventReviewStatus | "all";
  weekAgenda: CalendarPageData["weekAgenda"];
}) {
  return (
    <div className="min-h-0 overflow-y-auto pr-1">
      <div className="grid auto-rows-[minmax(17rem,17rem)] gap-3 md:grid-cols-2 xl:grid-cols-7">
        {weekAgenda.map((day) => (
          <WeekAgendaDay
            day={day}
            key={day.dateKey}
            openEvent={openEvent}
            reviewFocus={reviewFocus}
          />
        ))}
      </div>
    </div>
  );
}

function WeekAgendaDay({
  day,
  openEvent,
  reviewFocus,
}: {
  day: WeekAgendaDayData;
  openEvent: (item: WeekAgendaItemData) => void;
  reviewFocus: CalendarEventReviewStatus | "all";
}) {
  const isQuiet = day.items.length === 0;
  const todayHref = {
    pathname: "/today",
    query: { date: day.dateKey },
  };

  return (
    <div className="flex min-h-0 flex-col rounded-xl border border-[var(--line)] bg-[var(--empty)] p-3 transition hover:border-[var(--accent)]">
      <div className="flex items-start justify-between gap-2">
        <Link
          className="min-w-0 rounded-lg transition hover:text-[var(--accent)]"
          href={todayHref}
        >
          <p className="text-sm font-semibold">
            {weekdayFormatter.format(toLocalDate(day.dateKey))}
          </p>
          <p className="text-xs text-[var(--muted)]">
            {shortDateFormatter.format(toLocalDate(day.dateKey))}
          </p>
        </Link>
        <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-xs font-semibold text-[var(--muted)]">
          {day.items.length}
        </span>
      </div>

      {isQuiet ? (
        <p className="mt-6 rounded-lg border border-dashed border-[var(--line)] px-3 py-2 text-xs leading-5 text-[var(--muted)]">
          {reviewFocus === "all" ? "No cached events" : "No matching events"}
        </p>
      ) : (
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid gap-2">
            {day.items.slice(0, 8).map((item) => (
              <WeekAgendaItem
                item={item}
                key={item.id}
                openEvent={() => openEvent(item)}
              />
            ))}
          </div>
          {day.items.length > 8 ? (
            <Link
              className="mt-2 inline-flex text-xs font-semibold text-[var(--accent)] transition hover:text-[var(--foreground)]"
              href={todayHref}
            >
              +{day.items.length - 8} more
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}

function WeekAgendaItem({
  item,
  openEvent,
}: {
  item: WeekAgendaItemData;
  openEvent: () => void;
}) {
  const reviewStatus = item.localReviewStatus ?? "none";
  const timeLabel = item.isAllDay
    ? "All day"
    : item.startsAt
      ? eventTimeFormatter.format(item.startsAt)
      : "Time TBD";

  return (
    <button
      className={[
        "w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-left transition hover:border-[var(--accent)]",
        reviewStatus === "ignored" ? "opacity-55" : "",
      ].join(" ")}
      onClick={openEvent}
      type="button"
    >
      <div className="grid grid-cols-[0.75rem_minmax(0,1fr)] items-center gap-2">
        <span
          aria-hidden="true"
          className="h-2 w-2 justify-self-center rounded-full border border-[var(--line)]"
          style={{ backgroundColor: item.calendarColor ?? "var(--accent)" }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="min-w-0 truncate text-xs font-semibold">
                {item.title}
              </p>
            </div>
            <span className="shrink-0 text-xs font-semibold text-[var(--accent)]">
              {timeLabel}
            </span>
          </div>
          {item.location ? (
            <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
              {item.location}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function toLocalDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`);
}

const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
});

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
});

const eventTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});
