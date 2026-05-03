import {
  CalendarDays,
  Clock3,
  Eye,
  PlugZap,
  ShieldCheck,
  StretchHorizontal,
} from "lucide-react";
import Link from "next/link";

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
import { CalendarSelectionButton } from "@/features/calendar/components/calendar-selection-button";
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
                label="Synced"
                value={
                  data.latestSyncRun
                    ? dateFormatter.format(data.latestSyncRun.createdAt)
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
            className="flex max-h-[30rem] min-h-0 flex-col overflow-hidden"
            variant="activity"
          >
            <PageSection
              className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)]"
              description={`Selected-calendar plan for the next seven local days in ${data.timezone}.`}
              eyebrow="Planning"
              icon={<StretchHorizontal aria-hidden="true" className="h-6 w-6" />}
              title="Next 7 days"
            >
              <div className="min-h-0 overflow-y-auto pr-1">
                <div className="grid auto-rows-[minmax(13rem,13rem)] gap-3 md:grid-cols-2 xl:grid-cols-7">
                  {data.weekAgenda.map((day) => (
                    <WeekAgendaDay day={day} key={day.dateKey} />
                  ))}
                </div>
              </div>
            </PageSection>
          </AllMeCard>
        </PageGridItem>

        <PageGridItem span="primary">
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
              {data.upcomingEvents.length > 0 ? (
                <div className="min-h-0 overflow-y-auto pr-1">
                  <div className="grid gap-2">
                    {data.upcomingEvents.map((event) => (
                      <UpcomingEventRow event={event} key={event.id} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--empty)] p-5">
                  <p className="text-lg font-semibold">No upcoming events</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    Run Calendar sync to refresh the local cache.
                  </p>
                </div>
              )}
            </PageSection>
          </AllMeCard>
        </PageGridItem>

        <PageGridItem span="support">
          <AllMeCard variant="activity">
            <PageSection
              description="Current local Calendar cache feeding Today and planning."
              eyebrow="Summary"
              icon={<Clock3 aria-hidden="true" className="h-6 w-6" />}
              title="Agenda cache"
            >
              <div className="grid gap-3">
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
          <AllMeCard
            className="flex max-h-[18rem] min-h-0 flex-col overflow-hidden"
            variant="activity"
          >
            <PageSection
              className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)]"
              description="Choose which synced calendars are visible in AllMe."
              eyebrow="Sources"
              icon={<Eye aria-hidden="true" className="h-6 w-6" />}
              title="Calendars in AllMe"
            >
              {data.calendarSources.length > 0 ? (
                <div className="min-h-0 overflow-y-auto pr-1">
                  <div className="grid gap-2">
                    {data.calendarSources.map((calendar) => (
                      <CalendarSourceRow calendar={calendar} key={calendar.id} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--empty)] p-5">
                  <p className="text-lg font-semibold">No calendars synced yet</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    Run Calendar sync after connecting Google Calendar.
                  </p>
                </div>
              )}
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

const eventDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

const eventTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
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

function UpcomingEventRow({
  event,
}: {
  event: CalendarPageData["upcomingEvents"][number];
}) {
  const dateLabel = event.isAllDay
    ? event.startDate
      ? eventDateFormatter.format(toLocalDate(event.startDate))
      : "Date TBD"
    : event.startAt
      ? eventDateFormatter.format(event.startAt)
      : "Date TBD";
  const timeLabel = event.isAllDay
    ? "All day"
    : event.startAt
      ? eventTimeFormatter.format(event.startAt)
      : "Time TBD";

  return (
    <button
      className="w-full rounded-lg border border-[var(--line)] bg-[var(--empty)] px-3 py-2 text-left transition hover:border-[var(--accent)]"
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full border border-[var(--line)]"
              style={{ backgroundColor: event.calendarColor ?? "var(--accent)" }}
            />
            <p className="truncate text-sm font-semibold">{event.title}</p>
          </div>
          <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
            {dateLabel}
            {event.location ? ` · ${event.location}` : ""}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-[var(--line)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">
          {timeLabel}
        </span>
      </div>
    </button>
  );
}

function CalendarSourceRow({
  calendar,
}: {
  calendar: CalendarPageData["calendarSources"][number];
}) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--empty)] px-3 py-2">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full border border-[var(--line)]"
              style={{ backgroundColor: calendar.color ?? "var(--accent)" }}
            />
            <p className="truncate text-sm font-semibold">{calendar.name}</p>
          </div>
          <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
            {calendar.isPrimary ? "Primary calendar" : "Synced calendar"}
            {calendar.timezone ? ` · ${calendar.timezone}` : ""}
            {` · ${calendar.eventCount} cached events`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={[
              "rounded-full border px-2 py-0.5 text-xs font-semibold",
              calendar.isSelected
                ? "border-[var(--positive)] text-[var(--positive)]"
                : "border-[var(--line)] text-[var(--muted)]",
            ].join(" ")}
          >
            {calendar.isSelected ? "Selected" : "Hidden"}
          </span>
          <form action={updateCalendarSelection}>
            <input name="calendarId" type="hidden" value={calendar.id} />
            <input
              name="isSelected"
              type="hidden"
              value={calendar.isSelected ? "false" : "true"}
            />
            <CalendarSelectionButton isSelected={calendar.isSelected} />
          </form>
        </div>
      </div>
    </div>
  );
}

function WeekAgendaDay({
  day,
}: {
  day: CalendarPageData["weekAgenda"][number];
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
          No cached events
        </p>
      ) : (
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid gap-2">
            {day.items.slice(0, 8).map((item) => (
              <WeekAgendaItem item={item} key={item.id} />
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
      <Link
        className="mt-3 inline-flex text-xs font-semibold text-[var(--muted)] transition hover:text-[var(--accent)]"
        href={todayHref}
      >
        Open day
      </Link>
    </div>
  );
}

function WeekAgendaItem({
  item,
}: {
  item: CalendarPageData["weekAgenda"][number]["items"][number];
}) {
  const timeLabel = item.isAllDay
    ? "All day"
    : item.startsAt
      ? eventTimeFormatter.format(item.startsAt)
      : "Time TBD";

  return (
    <button
      className="w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-left transition hover:border-[var(--accent)]"
      type="button"
    >
      <div className="flex items-start gap-2">
        <span
          aria-hidden="true"
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full border border-[var(--line)]"
          style={{ backgroundColor: item.calendarColor ?? "var(--accent)" }}
        />
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">{item.title}</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">{timeLabel}</p>
        </div>
      </div>
    </button>
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
    ? `${eventTimeFormatter.format(event.startAt)} ${event.title}`
    : event.title;
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
