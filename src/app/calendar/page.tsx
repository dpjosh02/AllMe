import {
  CalendarDays,
  Flag,
  PlugZap,
  CheckCircle2,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  AllMeCard,
  AppPageShell,
  KeyValueRow,
  MetricGrid,
  PageGrid,
  PageGridItem,
  PageHero,
  PageSection,
} from "@/components/layout/page-scaffold";
import {
  syncGoogleCalendarNow,
  updateCalendarEventReviewStatus,
  updateCalendarSelection,
} from "@/features/calendar/actions";
import { CalendarPlanningFilter } from "@/features/calendar/components/calendar-planning-filter";
import { CalendarUpcomingEvents } from "@/features/calendar/components/calendar-upcoming-events";
import { CalendarWeekPlanner } from "@/features/calendar/components/calendar-week-planner";
import { SyncGoogleCalendarButton } from "@/features/calendar/components/sync-google-calendar-button";
import {
  getCalendarPageData,
  type CalendarPageData,
} from "@/features/calendar/queries";
import { getGoogleCalendarAccessTokenReadiness } from "@/server/auth/google-calendar-token";
import { requirePageUser } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

const nextSteps = [
  "Promote weekly day review into guided planning workflow",
  "Prepare read-only event detail drawer and event-linked notes",
  "Defer editing and bidirectional writes until read-only sync is durable",
];

export default async function CalendarPage() {
  const currentUser = await requirePageUser("/calendar");
  const [data, tokenReadiness] = await Promise.all([
    getCalendarPageData(currentUser.id),
    getGoogleCalendarAccessTokenReadiness(),
  ]);
  const canSync = data.connection.isReady && tokenReadiness.ready;
  const todayAgenda = data.weekAgenda[0];
  const todayAgendaItems = todayAgenda?.items ?? [];
  const nextUpcomingEvent = data.upcomingEvents[0] ?? null;
  const todayNeedsPrepCount = todayAgendaItems.filter(
    (event) => event.localReviewStatus === "needs_prep",
  ).length;
  const todayDoneCount = todayAgendaItems.filter(
    (event) => event.localReviewStatus === "done",
  ).length;

  return (
    <AppPageShell>
      <PageHero
        eyebrow="Calendar"
        right={
          <div className="flex flex-col items-end gap-3">
            <form action={syncGoogleCalendarNow} className="flex justify-end">
              <SyncGoogleCalendarButton disabled={!canSync} />
            </form>
            <div className="grid w-full min-w-[18rem] gap-2 sm:grid-cols-3">
              <HeroContextChip
                label="Today"
                value={formatEventCount(todayAgendaItems.length)}
              />
              <HeroContextChip
                label="Next"
                value={
                  nextUpcomingEvent
                    ? getCompactEventTime(nextUpcomingEvent)
                    : "None"
                }
              />
              <HeroContextChip
                label="Sync"
                value={
                  data.latestSyncRun
                    ? shortSyncFormatter.format(data.latestSyncRun.createdAt)
                    : "Never"
                }
              />
            </div>
          </div>
        }
        subtitle="A schedule layer for daily context, weekly planning, and event-linked notes backed by local cached provider data."
        title="Schedule context"
      />

      <PageGrid>
        <PageGridItem span="full">
          <AllMeCard className="p-4" variant="metrics">
            <div className="grid gap-3 md:grid-cols-4">
              <TodayAgendaStat
                detail="Cached selected-calendar items for the current local day."
                label="Today"
                value={formatEventCount(todayAgendaItems.length)}
              />
              <TodayAgendaStat
                detail={nextUpcomingEvent?.title ?? "No selected-calendar event queued."}
                label="Next event"
                value={
                  nextUpcomingEvent
                    ? getCompactEventTime(nextUpcomingEvent)
                    : "None"
                }
              />
              <TodayAgendaStat
                detail="Events marked for preparation."
                icon={<Flag aria-hidden="true" className="h-4 w-4" />}
                label="Needs prep"
                value={String(todayNeedsPrepCount)}
              />
              <TodayAgendaStat
                detail="Events already marked complete."
                icon={<CheckCircle2 aria-hidden="true" className="h-4 w-4" />}
                label="Done"
                value={String(todayDoneCount)}
              />
            </div>
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
              </p>
              <CalendarWeekPlanner
                updateEventReviewStatus={updateCalendarEventReviewStatus}
                weekAgenda={data.weekAgenda}
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
                events={data.upcomingEvents}
                updateEventReviewStatus={updateCalendarEventReviewStatus}
              />
            </PageSection>
          </AllMeCard>
        </PageGridItem>

        <PageGridItem span="full">
          <AllMeCard variant="status">
            <PageSection
              icon={<PlugZap aria-hidden="true" className="h-6 w-6" />}
              title="Calendar system"
            >
              <MetricGrid className="lg:grid-cols-6">
                <KeyValueRow
                  label="Calendars"
                  value={`${data.selectedCalendars}/${data.calendars} shown`}
                />
                <KeyValueRow label="Events" value={String(data.events)} />
                <KeyValueRow label="Status" value={data.connection.status} />
                <KeyValueRow
                  label="Read token"
                  value={tokenReadiness.ready ? "Available" : "Reauthorize"}
                />
                <KeyValueRow
                  label="Sync run"
                  value={data.latestSyncRun?.status ?? "None"}
                />
                <KeyValueRow
                  label="Last sync"
                  value={
                    data.connection.lastSyncedAt
                      ? dateFormatter.format(data.connection.lastSyncedAt)
                      : "Never"
                  }
                />
                {data.latestSyncRun ? (
                  <>
                    <KeyValueRow
                      label="Scanned"
                      value={String(data.latestSyncRun.eventsScanned)}
                    />
                    <KeyValueRow
                      label="Inserted"
                      value={String(data.latestSyncRun.eventsInserted)}
                    />
                  </>
                ) : null}
              </MetricGrid>
              {!tokenReadiness.ready ? (
                <p className="rounded-xl border border-[var(--line)] bg-[var(--empty)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                  {tokenReadiness.reason}. Sign out and sign back in with Google
                  Calendar access before running the first sync.
                </p>
              ) : null}

              <details className="rounded-xl border border-[var(--line)] bg-[var(--empty)] px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">
                  Later slices
                </summary>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {nextSteps.map((step, index) => (
                    <div
                      className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2"
                      key={step}
                    >
                      <p className="allme-kicker text-[var(--accent)]">
                        Step {index + 1}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[var(--foreground)]">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </details>
            </PageSection>
          </AllMeCard>
        </PageGridItem>
      </PageGrid>
    </AppPageShell>
  );
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function TodayAgendaStat({
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
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--empty)] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="allme-kicker">{label}</p>
        {icon ? <span className="text-[var(--accent)]">{icon}</span> : null}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{value}</p>
      <p className="mt-1 truncate text-xs text-[var(--muted)]">{detail}</p>
    </div>
  );
}

function HeroContextChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--empty)] px-3 py-2">
      <p className="allme-kicker text-[0.58rem]">{label}</p>
      <p className="mt-1 whitespace-nowrap text-xs font-semibold">{value}</p>
    </div>
  );
}

function getCompactEventTime(
  event: CalendarPageData["upcomingEvents"][number],
) {
  if (event.isAllDay) {
    return "All day";
  }

  return event.startAt ? compactEventTimeFormatter.format(event.startAt) : "TBD";
}

function formatEventCount(count: number) {
  return `${count} ${count === 1 ? "event" : "events"}`;
}

const shortSyncFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

const compactEventTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});
