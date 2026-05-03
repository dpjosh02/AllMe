import {
  CalendarDays,
  Clock3,
  PlugZap,
  ShieldCheck,
} from "lucide-react";

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
  const nextUpcomingEvent = data.upcomingEvents[0] ?? null;

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
                value={`${todayAgenda?.items.length ?? 0} ${
                  todayAgenda?.items.length === 1 ? "event" : "events"
                }`}
              />
              <HeroContextChip
                label="Next"
                value={
                  nextUpcomingEvent
                    ? getCompactEventLabel(nextUpcomingEvent)
                    : "No upcoming"
                }
              />
              <HeroContextChip
                label="Last sync"
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
          <AllMeCard
            className="flex max-h-[34rem] min-h-0 flex-col"
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
              <CalendarWeekPlanner weekAgenda={data.weekAgenda} />
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
              <CalendarUpcomingEvents events={data.upcomingEvents} />
            </PageSection>
          </AllMeCard>
        </PageGridItem>

        <PageGridItem span="full">
          <AllMeCard variant="activity">
            <PageSection
              description="Current local Calendar cache feeding Today and planning."
              eyebrow="Summary"
              icon={<Clock3 aria-hidden="true" className="h-6 w-6" />}
              title="Agenda cache"
            >
              <div className="grid gap-3 md:grid-cols-3">
                <MetricTile
                  detail={`${data.selectedCalendars} shown in Today`}
                  label="Calendars"
                  value={String(data.calendars)}
                />
                <MetricTile
                  detail="Cached event rows"
                  label="Events"
                  value={String(data.events)}
                />
                <MetricTile
                  detail={
                    data.latestSyncRun
                      ? dateFormatter.format(data.latestSyncRun.createdAt)
                      : "No sync runs yet"
                  }
                  label="Latest sync"
                  value={data.latestSyncRun?.status ?? "None"}
                />
              </div>
            </PageSection>
          </AllMeCard>
        </PageGridItem>

        <PageGridItem span="full">
          <AllMeCard variant="status">
            <PageSection
              description="Compact health details for Google Calendar access and the latest local import run."
              eyebrow="System status"
              icon={<PlugZap aria-hidden="true" className="h-6 w-6" />}
              title="Sync and connection"
            >
              <MetricGrid className="lg:grid-cols-4">
                <KeyValueRow label="Status" value={data.connection.status} />
                <KeyValueRow label="Account" value={data.connection.accountEmail} />
                <KeyValueRow
                  label="Read token"
                  value={tokenReadiness.ready ? "Available" : "Reauthorize"}
                />
                <KeyValueRow
                  label="Latest run"
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
                <KeyValueRow label="Secret values" value="Hidden" />
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
            </PageSection>
          </AllMeCard>
        </PageGridItem>

        <PageGridItem span="full">
          <AllMeCard variant="status">
            <PageSection
              description="Deferred roadmap items remain intentionally separate from the main planning surface."
              eyebrow="Roadmap"
              title="Later slices"
            >
              <div className="grid gap-3 md:grid-cols-3">
                {nextSteps.map((step, index) => (
                  <div
                    className="rounded-xl border border-[var(--line)] bg-[var(--empty)] px-4 py-3"
                    key={step}
                  >
                    <p className="allme-kicker text-[var(--accent)]">
                      Step {index + 1}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
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

function MetricTile({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--empty)] p-4">
      <p className="allme-kicker">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{detail}</p>
    </div>
  );
}

function HeroContextChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--empty)] px-3 py-2">
      <p className="allme-kicker text-[0.58rem]">{label}</p>
      <p className="mt-1 truncate text-xs font-semibold">{value}</p>
    </div>
  );
}

function getCompactEventLabel(
  event: CalendarPageData["upcomingEvents"][number],
) {
  if (event.isAllDay) {
    return event.title;
  }

  return event.startAt
    ? `${compactEventTimeFormatter.format(event.startAt)} ${event.title}`
    : event.title;
}

const shortSyncFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

const compactEventTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});
