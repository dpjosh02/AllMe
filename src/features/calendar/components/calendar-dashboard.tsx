"use client";

import { CalendarDays, CheckCircle2, Flag, Focus, MinusCircle } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";

import {
  AllMeCard,
  PageGridItem,
  PageSection,
} from "@/components/layout/page-scaffold";
import type { CalendarEventReviewStatus } from "@/features/calendar/components/calendar-event-detail-drawer";
import {
  CalendarEventDetailDrawer,
  type CalendarEventDetail,
} from "@/features/calendar/components/calendar-event-detail-drawer";
import { CalendarPlanningFilter } from "@/features/calendar/components/calendar-planning-filter";
import { CalendarUpcomingEvents } from "@/features/calendar/components/calendar-upcoming-events";
import { CalendarWeekPlanner } from "@/features/calendar/components/calendar-week-planner";
import type { CalendarPageData } from "@/features/calendar/queries";

type CalendarReviewFocus = CalendarEventReviewStatus | "all";
type CalendarDashboardEvent =
  | CalendarPageData["upcomingEvents"][number]
  | CalendarPageData["weekAgenda"][number]["items"][number];
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
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventDetail | null>(
    null,
  );
  const todayAgenda = data.weekAgenda[0];
  const todayAgendaItems = todayAgenda?.items ?? [];
  const nextUpcomingEvent = data.upcomingEvents[0] ?? null;
  const todayNeedsPrepCount = getReviewStatusCount(
    todayAgendaItems,
    "needs_prep",
  );
  const todayDoneCount = getReviewStatusCount(todayAgendaItems, "done");
  const filteredWeekAgenda = filterWeekAgenda(data.weekAgenda, reviewFocus);
  const filteredUpcomingEvents = filterEvents(data.upcomingEvents, reviewFocus);
  const focusedEventCount =
    reviewFocus === "all" ? 0 : getFocusedWeekEventCount(data.weekAgenda, reviewFocus);

  function openEvent(event: CalendarDashboardEvent) {
    setSelectedEvent(toEventDetail(event));
  }

  return (
    <>
      <PageGridItem span="full">
        <AllMeCard className="p-4" variant="metrics">
          <div className="grid gap-3 md:grid-cols-4">
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
              detail={
                nextUpcomingEvent?.title ?? "No selected-calendar event queued."
              }
              disabled={!nextUpcomingEvent}
              label="Next event"
              onClick={() => {
                if (nextUpcomingEvent) {
                  openEvent(nextUpcomingEvent);
                }
              }}
              value={
                nextUpcomingEvent ? getCompactEventTime(nextUpcomingEvent) : "None"
              }
            />
            <TodayAgendaButtonStat
              detail="Focus events marked for preparation."
              icon={<Flag aria-hidden="true" className="h-4 w-4" />}
              isActive={reviewFocus === "needs_prep"}
              label="Needs prep"
              onClick={() => setReviewFocus("needs_prep")}
              value={String(todayNeedsPrepCount)}
            />
            <TodayAgendaButtonStat
              detail="Focus events already marked complete."
              icon={<CheckCircle2 aria-hidden="true" className="h-4 w-4" />}
              isActive={reviewFocus === "done"}
              label="Done"
              onClick={() => setReviewFocus("done")}
              value={String(todayDoneCount)}
            />
          </div>
          <CalendarReviewFocusControls
            focusedEventCount={focusedEventCount}
            reviewFocus={reviewFocus}
            setReviewFocus={setReviewFocus}
          />
        </AllMeCard>
      </PageGridItem>

      <PageGridItem span="full">
        <AllMeCard
          className="flex max-h-[38rem] min-h-0 flex-col"
          variant="activity"
        >
          <PageSection
            className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)]"
            description={`Selected-calendar plan for the next seven local days in ${data.timezone}.`}
            eyebrow="Planning"
            icon={
              <CalendarPlanningFilter
                calendars={data.calendarSources}
                updateCalendarSelection={updateCalendarSelection}
              />
            }
            title="Next 7 days"
          >
            <p className="-mt-2 mb-3 text-xs font-semibold text-[var(--muted)]">
              {data.selectedCalendars}/{data.calendars} calendars shown
              {reviewFocus !== "all"
                ? ` · ${getReviewFocusLabel(reviewFocus)} focus`
                : ""}
            </p>
            <CalendarWeekPlanner
              openEvent={openEvent}
              reviewFocus={reviewFocus}
              weekAgenda={filteredWeekAgenda}
            />
          </PageSection>
        </AllMeCard>
      </PageGridItem>

      <PageGridItem span="full">
        <AllMeCard
          className="flex max-h-[28rem] min-h-0 flex-col overflow-hidden"
          variant="activity"
        >
          <PageSection
            className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)]"
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

      <CalendarEventDetailDrawer
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        updateEventReviewStatus={updateEventReviewStatus}
      />
    </>
  );
}

function CalendarReviewFocusControls({
  focusedEventCount,
  reviewFocus,
  setReviewFocus,
}: {
  focusedEventCount: number;
  reviewFocus: CalendarReviewFocus;
  setReviewFocus: (reviewFocus: CalendarReviewFocus) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)]">
        <Focus aria-hidden="true" className="h-3.5 w-3.5" />
        Focus
      </span>
      {reviewFocusOptions.map((option) => (
        <button
          aria-pressed={reviewFocus === option.value}
          className={[
            "rounded-full border px-3 py-1 text-xs font-semibold shadow-sm transition",
            reviewFocus === option.value
              ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--panel-strong)] shadow-[0_0_0_3px_var(--accent-soft)]"
              : "border-[var(--line)] bg-[var(--empty)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]",
          ].join(" ")}
          key={option.value}
          onClick={() => setReviewFocus(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
      {reviewFocus !== "all" ? (
        <div className="basis-full pt-1 text-xs font-semibold text-[var(--muted)]">
          Showing {formatEventCount(focusedEventCount)} marked{" "}
          {getReviewFocusLabel(reviewFocus)} ·{" "}
          <button
            className="text-[var(--accent)] transition hover:text-[var(--foreground)]"
            onClick={() => setReviewFocus("all")}
            type="button"
          >
            Clear filter
          </button>
        </div>
      ) : null}
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
  detail: string;
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
  detail: string;
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
  detail: string;
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
      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{value}</p>
      <p className="mt-1 truncate text-xs text-[var(--muted)]">{detail}</p>
    </>
  );
}

function getSummaryCardClassName({ isActive }: { isActive: boolean }) {
  return [
    "group block w-full rounded-2xl border bg-[var(--empty)] px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:bg-[var(--panel)] hover:shadow-lg disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
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

function filterEvents<T extends CalendarEventCollectionItem>(
  events: T[],
  reviewFocus: CalendarReviewFocus,
) {
  if (reviewFocus === "all") {
    return events;
  }

  return events.filter(
    (event) => (event.localReviewStatus ?? "none") === reviewFocus,
  );
}

function getReviewStatusCount(
  events: CalendarEventCollectionItem[],
  reviewStatus: CalendarEventReviewStatus,
) {
  return events.filter(
    (event) => (event.localReviewStatus ?? "none") === reviewStatus,
  ).length;
}

function getFocusedWeekEventCount(
  weekAgenda: CalendarPageData["weekAgenda"],
  reviewFocus: CalendarEventReviewStatus,
) {
  return weekAgenda.reduce(
    (count, day) => count + filterEvents(day.items, reviewFocus).length,
    0,
  );
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

const reviewFocusOptions: Array<{
  label: string;
  value: CalendarReviewFocus;
}> = [
  { label: "All", value: "all" },
  { label: "Needs prep", value: "needs_prep" },
  { label: "Done", value: "done" },
  { label: "Ignored", value: "ignored" },
  { label: "Unreviewed", value: "none" },
];

const compactEventTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});
