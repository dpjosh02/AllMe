import { PlugZap } from "lucide-react";

import {
  AllMeCard,
  AppPageShell,
  KeyValueRow,
  MetricGrid,
  PageGrid,
  PageGridItem,
  PageHero,
} from "@/components/layout/page-scaffold";
import {
  syncGoogleCalendarNow,
  updateCalendarEventReviewStatus,
  updateCalendarSelection,
} from "@/features/calendar/actions";
import { CalendarDashboardInteractive } from "@/features/calendar/components/calendar-dashboard";
import { SyncGoogleCalendarButton } from "@/features/calendar/components/sync-google-calendar-button";
import { getCalendarPageData } from "@/features/calendar/queries";
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

  return (
    <AppPageShell>
      <PageHero
        eyebrow="Calendar"
        right={
          <div className="flex flex-col items-end gap-3">
            <form action={syncGoogleCalendarNow} className="flex justify-end">
              <SyncGoogleCalendarButton disabled={!canSync} />
            </form>
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
          <AllMeCard className="p-0" variant="status">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 marker:hidden sm:p-5">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="text-[var(--accent)]">
                    <PlugZap aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-lg font-semibold tracking-[-0.03em]">
                      Calendar system
                    </span>
                    <span className="block truncate text-xs font-semibold text-[var(--muted)]">
                      {data.connection.status} · {data.selectedCalendars}/
                      {data.calendars} calendars shown · last sync{" "}
                      {data.connection.lastSyncedAt
                        ? shortStatusFormatter.format(data.connection.lastSyncedAt)
                        : "never"}
                    </span>
                  </span>
                </span>
                <span className="shrink-0 rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold text-[var(--muted)] transition group-open:border-[var(--accent)] group-open:text-[var(--accent)]">
                  Details
                </span>
              </summary>

              <div className="grid gap-4 border-t border-[var(--line)] p-4 sm:p-5">
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
                    {tokenReadiness.reason}. Sign out and sign back in with
                    Google Calendar access before running the first sync.
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
              </div>
            </details>
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

const shortStatusFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});
