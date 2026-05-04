"use client";

import { CalendarDays, CheckCircle2, ChevronDown, Flag } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import {
  AllMeCard,
  PageGridItem,
  PageSection,
} from "@/components/layout/page-scaffold";
import { CalendarDayDetailDrawer } from "@/features/calendar/components/calendar-day-detail-drawer";
import type { CalendarEventReviewStatus } from "@/features/calendar/components/calendar-event-detail-drawer";
import {
  CalendarEventDetailDrawer,
  type CalendarEventDetail,
} from "@/features/calendar/components/calendar-event-detail-drawer";
import { CalendarPlanningFilter } from "@/features/calendar/components/calendar-planning-filter";
import {
  filterCalendarEventsByReviewFocus,
  type CalendarReviewFocus,
} from "@/features/calendar/components/calendar-review-filtering";
import { CalendarUpcomingEvents } from "@/features/calendar/components/calendar-upcoming-events";
import { CalendarWeekPlanner } from "@/features/calendar/components/calendar-week-planner";
import type { CalendarPageData } from "@/features/calendar/queries";

type CalendarDashboardEvent =
  | CalendarPageData["upcomingEvents"][number]
  | CalendarPageData["weekAgenda"][number]["items"][number];
type CalendarDayDetail = CalendarPageData["weekAgenda"][number];
type CalendarEventCollectionItem = {
  localReviewStatus: CalendarEventReviewStatus | null;
};

export function CalendarDashboardInteractive({
  data,
  updateCalendarSelection,
  updateEventReviewStatus,
}: {
  data: CalendarPageData;
  updateCalendarSelection: (formData: FormData) => Promise<void>;
  updateEventReviewStatus: (formData: FormData) => Promise<void>;
}) {
  const [reviewFocus, setReviewFocus] = useState<CalendarReviewFocus>("all");
  const [reviewStatusOverrides, setReviewStatusOverrides] = useState<
    Record<string, CalendarEventReviewStatus>
  >({});
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventDetail | null>(
    null,
  );
  const [selectedDay, setSelectedDay] = useState<CalendarDayDetail | null>(null);
  const effectiveWeekAgenda = applyWeekAgendaReviewStatusOverrides(
    data.weekAgenda,
    reviewStatusOverrides,
  );
  const effectiveUpcomingEvents = applyEventReviewStatusOverrides(
    data.upcomingEvents,
    reviewStatusOverrides,
  );
  const todayAgenda = effectiveWeekAgenda[0];
  const todayAgendaItems = todayAgenda?.items ?? [];
  const todayActionItems = getTodayActionItems(todayAgendaItems);
  const nextUpcomingEvent = effectiveUpcomingEvents[0] ?? null;
  const todayNeedsPrepCount = getReviewStatusCount(
    todayAgendaItems,
    "needs_prep",
  );
  const todayDoneCount = getReviewStatusCount(todayAgendaItems, "done");
  const filteredWeekAgenda = filterWeekAgenda(effectiveWeekAgenda, reviewFocus);
  const filteredUpcomingEvents = filterEvents(
    effectiveUpcomingEvents,
    reviewFocus,
  );
  const weekRangeLabel = getWeekRangeLabel(effectiveWeekAgenda);

  function openEvent(event: CalendarDashboardEvent) {
    setSelectedEvent(toEventDetail(event));
  }

  function openDay(day: CalendarDayDetail) {
    setSelectedDay(day);
  }

  function updateLocalReviewStatus(
    eventId: string,
    reviewStatus: CalendarEventReviewStatus,
  ) {
    setReviewStatusOverrides((currentOverrides) => ({
      ...currentOverrides,
      [eventId]: reviewStatus,
    }));
  }

  return (
    <>
      <PageGridItem span="full">
        <AllMeCard className="p-3 sm:p-4" variant="metrics">
          <CalendarReadinessNotice data={data} />
          <div className="grid gap-3 xl:grid-cols-[minmax(18rem,0.85fr)_minmax(0,1.15fr)] xl:items-start">
            <div className="grid gap-2 sm:grid-cols-2">
              <TodayAgendaLinkStat
                detail="Open today's operating view."
                href={{
                  pathname: "/today",
                  query: { date: todayAgenda?.dateKey },
                }}
                label="Today"
                value={formatEventCount(todayAgendaItems.length)}
              />
              <TodayAgendaButtonStat
                detail={getNextEventSummaryDetail(nextUpcomingEvent)}
                disabled={!nextUpcomingEvent}
                label="Next event"
                onClick={() => {
                  if (nextUpcomingEvent) {
                    openEvent(nextUpcomingEvent);
                  }
                }}
                value={
                  nextUpcomingEvent
                    ? getCompactEventTime(nextUpcomingEvent)
                    : "None"
                }
              />
              <TodayAgendaButtonStat
                detail="Focus preparation."
                icon={<Flag aria-hidden="true" className="h-4 w-4" />}
                isActive={reviewFocus === "needs_prep"}
                label="Needs prep"
                onClick={() => setReviewFocus("needs_prep")}
                value={String(todayNeedsPrepCount)}
              />
              <TodayAgendaButtonStat
                detail="Focus completed."
                icon={<CheckCircle2 aria-hidden="true" className="h-4 w-4" />}
                isActive={reviewFocus === "done"}
                label="Done"
                onClick={() => setReviewFocus("done")}
                value={String(todayDoneCount)}
              />
            </div>
            <div className="min-w-0 xl:border-l xl:border-[var(--line)] xl:pl-4">
              <TodayActionStrip
                events={todayActionItems}
                openEvent={openEvent}
              />
              <CalendarReviewFocusControls
                reviewFocus={reviewFocus}
                setReviewFocus={setReviewFocus}
              />
            </div>
          </div>
        </AllMeCard>
      </PageGridItem>

      <PageGridItem span="full">
        <AllMeCard
          className="flex max-h-[42rem] min-h-0 flex-col"
          variant="activity"
        >
          <PageSection
            className="flex min-h-0 flex-1 flex-col"
            description={`Selected-calendar plan for the next seven local days in ${data.timezone}.`}
            eyebrow="Planning"
            icon={
              <CalendarPlanningFilter
                calendars={data.calendarSources}
                updateCalendarSelection={updateCalendarSelection}
              />
            }
            title={weekRangeLabel ? `Next 7 days · ${weekRangeLabel}` : "Next 7 days"}
          >
            <p className="-mt-2 mb-3 text-xs font-semibold text-[var(--muted)]">
              {data.selectedCalendars}/{data.calendars} calendars shown
              {reviewFocus !== "all"
                ? ` · ${getReviewFocusLabel(reviewFocus)} focus`
                : ""}
            </p>
            <CalendarWeekPlanner
              openDay={openDay}
              openEvent={openEvent}
              weekAgenda={filteredWeekAgenda}
            />
          </PageSection>
        </AllMeCard>
      </PageGridItem>

      <PageGridItem span="full">
        <AllMeCard
          className="flex max-h-[30rem] min-h-0 flex-col overflow-hidden"
          variant="activity"
        >
          <PageSection
            className="flex min-h-0 flex-1 flex-col"
            description="Quick access to upcoming cached events from selected calendars."
            eyebrow="Agenda"
            icon={<CalendarDays aria-hidden="true" className="h-6 w-6" />}
            title="Next events"
          >
            <CalendarUpcomingEvents
              events={filteredUpcomingEvents}
              openEvent={openEvent}
              reviewFocus={reviewFocus}
            />
          </PageSection>
        </AllMeCard>
      </PageGridItem>

      <CalendarDayDetailDrawer
        day={selectedDay}
        onClose={() => setSelectedDay(null)}
        openEvent={(event) => {
          setSelectedDay(null);
          openEvent(event);
        }}
      />
      <CalendarEventDetailDrawer
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onReviewStatusChange={updateLocalReviewStatus}
        updateEventReviewStatus={updateEventReviewStatus}
      />
    </>
  );
}

function CalendarReadinessNotice({ data }: { data: CalendarPageData }) {
  const notice = getCalendarReadinessNotice(data);

  if (!notice) {
    return null;
  }

  return (
    <div className="mb-3 rounded-xl border border-[var(--line)] bg-[var(--empty)] px-4 py-3">
      <p className="text-sm font-semibold text-[var(--foreground)]">
        {notice.title}
      </p>
      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
        {notice.detail}
      </p>
    </div>
  );
}

function getCalendarReadinessNotice(data: CalendarPageData) {
  if (!data.connection.isReady) {
    return {
      detail:
        "Authorize Google Calendar read-only access, then run sync to populate the local Calendar cache.",
      title: "Google Calendar is not connected.",
    };
  }

  if (data.calendars === 0) {
    return {
      detail:
        "Run Sync Google Calendar to import calendars before the planning surface can show agenda data.",
      title: "No calendars are cached yet.",
    };
  }

  if (data.selectedCalendars === 0) {
    return {
      detail:
        "Open the Planning filter and show at least one calendar to restore agenda visibility.",
      title: "All calendars are hidden.",
    };
  }

  if (data.events === 0) {
    return {
      detail:
        "The connection exists, but no events are cached for the current sync window. Run sync or check Google Calendar source data.",
      title: "No cached events yet.",
    };
  }

  return null;
}

function TodayActionStrip({
  events,
  openEvent,
}: {
  events: CalendarPageData["weekAgenda"][number]["items"];
  openEvent: (event: CalendarPageData["weekAgenda"][number]["items"][number]) => void;
}) {
  if (events.length === 0) {
    return (
      <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--empty)] px-3 py-2">
        <p className="text-sm font-semibold text-[var(--foreground)]">
          Today is reviewed
          <span className="ml-2 text-xs font-medium text-[var(--muted)]">
            No selected-calendar events need prep or review.
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--empty)] px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">
            Today action queue
          </p>
          <p className="text-xs text-[var(--muted)]">
            Prep or review these before the day moves.
          </p>
        </div>
        <span className="rounded-full border border-[var(--line)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)]">
          {formatEventCount(events.length)}
        </span>
      </div>
      <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
        {events.map((event) => (
          <button
            className="h-14 w-56 shrink-0 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-left transition hover:border-[var(--accent)]"
            key={event.id}
            onClick={() => openEvent(event)}
            type="button"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                {event.title}
              </p>
              <span className="shrink-0 text-xs font-semibold text-[var(--accent)]">
                {getCompactAgendaItemTime(event)}
              </span>
            </div>
            <p className="mt-1 truncate text-xs text-[var(--muted)]">
              {getReviewFocusLabel(event.localReviewStatus ?? "none")}
              {event.location ? ` · ${event.location}` : ""}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function CalendarReviewFocusControls({
  reviewFocus,
  setReviewFocus,
}: {
  reviewFocus: CalendarReviewFocus;
  setReviewFocus: (reviewFocus: CalendarReviewFocus) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnOutsidePointer(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <div className="relative flex items-center" ref={menuRef}>
        <button
          aria-expanded={isOpen}
          className="relative z-30 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--empty)] px-3 py-1 text-xs font-semibold text-[var(--muted)] shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--foreground)]"
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          Focus:{" "}
          <span className="text-[var(--foreground)]">
            {getReviewFocusLabel(reviewFocus)}
          </span>
          <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
        <div
          aria-hidden={!isOpen}
          className={[
            "absolute left-[calc(100%+0.5rem)] top-0 z-20 flex items-center",
            isOpen ? "pointer-events-auto" : "pointer-events-none",
          ].join(" ")}
        >
          {reviewFocusOptions.map((option, index) => (
            <button
              aria-pressed={reviewFocus === option.value}
              className={[
                "h-7 min-w-28 whitespace-nowrap rounded-full border px-3 text-xs font-semibold shadow-sm transition-all duration-300 ease-out",
                reviewFocus === option.value
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--line)] bg-[var(--panel)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]",
                isOpen
                  ? "translate-x-0 opacity-100"
                  : "-translate-x-10 opacity-0",
              ].join(" ")}
              key={option.value}
              onClick={() => {
                setReviewFocus(option.value);
                setIsOpen(false);
              }}
              style={{
                marginLeft: index === 0 ? "0" : "0.375rem",
                transitionDelay: isOpen
                  ? `${index * 45}ms`
                  : `${(reviewFocusOptions.length - index) * 25}ms`,
                zIndex: reviewFocusOptions.length - index,
              }}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TodayAgendaButtonStat({
  detail,
  disabled = false,
  icon,
  isActive = false,
  label,
  onClick,
  value,
}: {
  detail?: string;
  disabled?: boolean;
  icon?: ReactNode;
  isActive?: boolean;
  label: string;
  onClick: () => void;
  value: string;
}) {
  return (
    <button
      className={getSummaryCardClassName({ isActive })}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <SummaryCardContent detail={detail} icon={icon} label={label} value={value} />
    </button>
  );
}

function TodayAgendaLinkStat({
  detail,
  href,
  label,
  value,
}: {
  detail?: string;
  href: { pathname: string; query: { date: string | undefined } };
  label: string;
  value: string;
}) {
  return (
    <Link className={getSummaryCardClassName({ isActive: false })} href={href}>
      <SummaryCardContent detail={detail} label={label} value={value} />
    </Link>
  );
}

function SummaryCardContent({
  detail,
  icon,
  label,
  value,
}: {
  detail?: string;
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="allme-kicker">{label}</p>
        {icon ? <span className="text-[var(--accent)]">{icon}</span> : null}
      </div>
      <p className="mt-1 text-xl font-semibold tracking-[-0.04em]">{value}</p>
      {detail ? (
        <p className="mt-1 truncate text-xs text-[var(--muted)]">{detail}</p>
      ) : null}
    </>
  );
}

function getSummaryCardClassName({ isActive }: { isActive: boolean }) {
  return [
    "group block w-full rounded-xl border bg-[var(--empty)] px-3 py-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:bg-[var(--panel)] hover:shadow-lg disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
    isActive
      ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-[0_0_0_3px_var(--accent-soft)]"
      : "border-[var(--line)]",
  ].join(" ");
}

function filterWeekAgenda(
  weekAgenda: CalendarPageData["weekAgenda"],
  reviewFocus: CalendarReviewFocus,
) {
  if (reviewFocus === "all") {
    return weekAgenda;
  }

  return weekAgenda.map((day) => ({
    ...day,
    items: filterEvents(day.items, reviewFocus),
  }));
}

function applyWeekAgendaReviewStatusOverrides(
  weekAgenda: CalendarPageData["weekAgenda"],
  reviewStatusOverrides: Record<string, CalendarEventReviewStatus>,
) {
  return weekAgenda.map((day) => ({
    ...day,
    items: applyEventReviewStatusOverrides(day.items, reviewStatusOverrides),
  }));
}

function applyEventReviewStatusOverrides<
  T extends { id: string; localReviewStatus: CalendarEventReviewStatus | null },
>(events: T[], reviewStatusOverrides: Record<string, CalendarEventReviewStatus>) {
  return events.map((event) => {
    const reviewStatusOverride = reviewStatusOverrides[event.id];

    if (!reviewStatusOverride) {
      return event;
    }

    return {
      ...event,
      localReviewStatus: reviewStatusOverride,
    };
  });
}

function filterEvents<T extends CalendarEventCollectionItem>(
  events: T[],
  reviewFocus: CalendarReviewFocus,
) {
  return filterCalendarEventsByReviewFocus(events, reviewFocus);
}

function getReviewStatusCount(
  events: CalendarEventCollectionItem[],
  reviewStatus: CalendarEventReviewStatus,
) {
  return events.filter(
    (event) => (event.localReviewStatus ?? "none") === reviewStatus,
  ).length;
}

function getTodayActionItems(
  events: CalendarPageData["weekAgenda"][number]["items"],
) {
  return events.filter((event) => {
    const reviewStatus = event.localReviewStatus ?? "none";

    return reviewStatus === "needs_prep" || reviewStatus === "none";
  });
}

function toEventDetail(event: CalendarDashboardEvent): CalendarEventDetail {
  return {
    calendarColor: event.calendarColor,
    calendarName: event.calendarName,
    description: event.description,
    endDate: event.endDate,
    endsAt: "endAt" in event ? event.endAt : event.endsAt,
    htmlLink: event.htmlLink,
    id: event.id,
    isAllDay: event.isAllDay,
    location: event.location,
    localReviewStatus: event.localReviewStatus ?? "none",
    startDate: event.startDate,
    startsAt: "startAt" in event ? event.startAt : event.startsAt,
    status: event.status,
    title: event.title,
  };
}

function getCompactEventTime(event: CalendarPageData["upcomingEvents"][number]) {
  if (event.isAllDay) {
    return "All day";
  }

  return event.startAt ? compactEventTimeFormatter.format(event.startAt) : "TBD";
}

function getNextEventSummaryDetail(
  event: CalendarPageData["upcomingEvents"][number] | null,
) {
  if (!event) {
    return "No selected-calendar event queued.";
  }

  const dateKey = event.startDate;
  const dateValue = event.startAt;
  const dateLabel = dateKey
    ? compactDateFormatter.format(new Date(`${dateKey}T00:00:00`))
    : dateValue
      ? compactDateFormatter.format(dateValue)
      : "Date TBD";

  return [event.title, dateLabel, event.location].filter(Boolean).join(" · ");
}

function getCompactAgendaItemTime(
  event: CalendarPageData["weekAgenda"][number]["items"][number],
) {
  if (event.isAllDay) {
    return "All day";
  }

  return event.startsAt
    ? compactEventTimeFormatter.format(event.startsAt)
    : "TBD";
}

function getReviewFocusLabel(reviewFocus: CalendarReviewFocus) {
  switch (reviewFocus) {
    case "all":
      return "All";
    case "done":
      return "Done";
    case "ignored":
      return "Ignored";
    case "needs_prep":
      return "Needs prep";
    case "none":
      return "Unreviewed";
  }
}

function formatEventCount(count: number) {
  return `${count} ${count === 1 ? "event" : "events"}`;
}

function getWeekRangeLabel(weekAgenda: CalendarPageData["weekAgenda"]) {
  const startDateKey = weekAgenda[0]?.dateKey;
  const endDateKey = weekAgenda.at(-1)?.dateKey;

  if (!startDateKey || !endDateKey) {
    return null;
  }

  const endDateExclusive = toLocalDate(endDateKey);
  endDateExclusive.setDate(endDateExclusive.getDate() + 1);

  return `${compactDateFormatter.format(
    toLocalDate(startDateKey),
  )}-${compactDateFormatter.format(endDateExclusive)}`;
}

function toLocalDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`);
}

const reviewFocusOptions: Array<{
  label: string;
  value: CalendarReviewFocus;
}> = [
  { label: "All", value: "all" },
  { label: "Needs prep", value: "needs_prep" },
  { label: "Unreviewed", value: "none" },
  { label: "Done", value: "done" },
  { label: "Ignored", value: "ignored" },
];

const compactEventTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

const compactDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
});
