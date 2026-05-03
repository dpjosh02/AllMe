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
  StatusPill,
} from "@/components/layout/page-scaffold";
import { syncGoogleCalendarNow } from "@/features/calendar/actions";
import { SyncGoogleCalendarButton } from "@/features/calendar/components/sync-google-calendar-button";
import { getCalendarPageData } from "@/features/calendar/queries";
import { getGoogleCalendarAccessTokenReadiness } from "@/server/auth/google-calendar-token";
import { requirePageUser } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

const nextSteps = [
  "Run a manual full sync from Google Calendar",
  "Verify synced events in the local Postgres cache",
  "Wire the Today agenda to cached calendar events",
  "Add incremental sync once the first full sync is stable",
];

const weekPlaceholders = [
  { day: "Today", detail: "Agenda will appear after Google Calendar sync" },
  { day: "Tomorrow", detail: "Reserved for upcoming events" },
  { day: "This week", detail: "Week view will use cached event rows" },
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
          <div className="flex h-full flex-col justify-between rounded-2xl border border-[var(--line)] bg-[var(--empty)] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="allme-kicker">Integration</p>
                <p className="mt-2 text-lg font-semibold">Google Calendar</p>
              </div>
              <StatusPill
                label={data.connection.badgeLabel}
                tone={data.connection.tone}
              />
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              {data.connection.isReady
                ? "Calendar data can now sync into AllMe before it powers Today, weekly planning, and event-linked notes."
                : "Calendar data will sync into AllMe after Google read-only access is available through the auth boundary."}
            </p>
            <form action={syncGoogleCalendarNow} className="mt-4">
              <SyncGoogleCalendarButton disabled={!canSync} />
            </form>
          </div>
        }
        subtitle="A schedule layer for daily context, weekly planning, and event-linked notes backed by local cached provider data."
        title="Schedule context"
      />

      <PageGrid>
        <PageGridItem span="primary">
          <AllMeCard variant="activity">
            <PageSection
              description="This is the local agenda surface Today will consume. Provider reads stay behind the sync boundary."
              eyebrow="Agenda"
              icon={<Clock3 aria-hidden="true" className="h-6 w-6" />}
              title="Today"
            >
              <div className="grid gap-3 md:grid-cols-3">
                <MetricTile
                  detail="Cached provider calendars"
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

        <PageGridItem span="support">
          <AllMeCard variant="status">
            <PageSection
              description="Connection health is based on non-secret OAuth metadata and local sync state. Tokens stay inside the auth boundary."
              eyebrow="Connection"
              icon={<PlugZap aria-hidden="true" className="h-6 w-6" />}
              title="Google Calendar"
            >
              <MetricGrid className="md:grid-cols-1">
                <KeyValueRow label="Status" value={data.connection.status} />
                <KeyValueRow label="Account" value={data.connection.accountEmail} />
                <KeyValueRow
                  label="Read token"
                  value={tokenReadiness.ready ? "Available" : "Reauthorize"}
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

        <PageGridItem span="half">
          <AllMeCard variant="activity">
            <PageSection
              description="A lightweight preview of the weekly planning shape before event sync exists."
              eyebrow="Week"
              icon={<CalendarDays aria-hidden="true" className="h-6 w-6" />}
              title="Planning view"
            >
              <div className="grid gap-3">
                {weekPlaceholders.map((item) => (
                  <div
                    className="rounded-xl border border-[var(--line)] bg-[var(--empty)] px-4 py-3"
                    key={item.day}
                  >
                    <p className="text-sm font-semibold">{item.day}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </PageSection>
          </AllMeCard>
        </PageGridItem>

        <PageGridItem span="half">
          <AllMeCard variant="status">
            <PageSection
              description="The manual sync writes a local lifecycle row before provider reads, then imports only after Google returns data."
              eyebrow="Sync"
              icon={<ShieldCheck aria-hidden="true" className="h-6 w-6" />}
              title="Latest run"
            >
              {data.latestSyncRun ? (
                <MetricGrid>
                  <KeyValueRow label="Status" value={data.latestSyncRun.status} />
                  <KeyValueRow
                    label="Scanned"
                    value={String(data.latestSyncRun.eventsScanned)}
                  />
                  <KeyValueRow
                    label="Inserted"
                    value={String(data.latestSyncRun.eventsInserted)}
                  />
                  <KeyValueRow
                    label="Cancelled"
                    value={String(data.latestSyncRun.eventsCancelled)}
                  />
                  <KeyValueRow
                    label="Skipped"
                    value={String(data.latestSyncRun.eventsSkipped)}
                  />
                  <KeyValueRow
                    label="Failure detail"
                    value={data.latestSyncRun.hasErrorSummary ? "Hidden" : "None"}
                  />
                </MetricGrid>
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--empty)] p-5">
                  <p className="text-lg font-semibold">No sync runs yet</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    Use the manual sync control after reauthorizing Google
                    Calendar access.
                  </p>
                </div>
              )}
            </PageSection>
          </AllMeCard>
        </PageGridItem>

        <PageGridItem span="full">
          <AllMeCard variant="status">
            <PageSection
              description="Calendar remains foundation-first: local cache, visible sync health, then Today agenda consumption."
              eyebrow="Build order"
              title="Next slices"
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {nextSteps.map((step, index) => (
                  <div
                    className="rounded-xl border border-[var(--line)] bg-[var(--empty)] p-4"
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
