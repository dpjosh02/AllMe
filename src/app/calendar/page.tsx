import { PlugZap } from "lucide-react";

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
import { CalendarDashboardInteractive } from "@/features/calendar/components/calendar-dashboard";
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
        <CalendarDashboardInteractive
          data={data}
          updateCalendarSelection={updateCalendarSelection}
          updateEventReviewStatus={updateCalendarEventReviewStatus}
        />

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
