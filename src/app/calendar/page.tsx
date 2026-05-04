import { PlugZap } from "lucide-react";
import Link from "next/link";

import {
  AllMeCard,
  AppPageShell,
  PageGrid,
  PageGridItem,
  PageHero,
} from "@/components/layout/page-scaffold";
import {
  createGoogleCalendarEventFromCalendar,
  createLinkedNoteFromCalendarEvent,
  deleteGoogleCalendarEventFromCalendar,
  deleteLinkedCalendarNote,
  publishLinkedCalendarNoteToGoogle,
  reconnectGoogleCalendarWithWriteAccess,
  syncGoogleCalendarNow,
  updateLinkedCalendarNote,
  updateCalendarEventReviewStatus,
  updateCalendarSelection,
  updateGoogleCalendarEventFromCalendar,
} from "@/features/calendar/actions";
import { CalendarDashboardInteractive } from "@/features/calendar/components/calendar-dashboard";
import { SyncGoogleCalendarButton } from "@/features/calendar/components/sync-google-calendar-button";
import { getCalendarPageData } from "@/features/calendar/queries";
import { getGoogleCalendarAccessTokenReadiness } from "@/server/auth/google-calendar-token";
import { requirePageUser } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const currentUser = await requirePageUser("/calendar");
  const [data, tokenReadiness] = await Promise.all([
    getCalendarPageData(currentUser.id),
    getGoogleCalendarAccessTokenReadiness(),
  ]);
  const canSync =
    data.connection.isReady &&
    tokenReadiness.ready &&
    data.syncStatus.status !== "running";

  return (
    <AppPageShell>
      <PageHero
        eyebrow="Calendar"
        right={
          <div className="flex flex-col items-end gap-3">
            <form action={syncGoogleCalendarNow} className="flex justify-end">
              <SyncGoogleCalendarButton disabled={!canSync} />
            </form>
            <p
              className={[
                "rounded-full border px-3 py-1 text-xs font-semibold",
                getSyncStatusClassName(data.syncStatus.tone),
              ].join(" ")}
              title={data.syncStatus.detail}
            >
              {data.syncStatus.label} ·{" "}
              {formatCalendarFreshness(data.connection.lastSyncedAt)}
            </p>
          </div>
        }
        subtitle="A schedule layer for daily context, weekly planning, and event-linked notes backed by local cached provider data."
        title="Schedule context"
      />

      <PageGrid>
        <CalendarDashboardInteractive
          createCalendarEvent={createGoogleCalendarEventFromCalendar}
          createLinkedNoteFromEvent={createLinkedNoteFromCalendarEvent}
          data={data}
          deleteGoogleCalendarEvent={deleteGoogleCalendarEventFromCalendar}
          deleteLinkedNote={deleteLinkedCalendarNote}
          reconnectGoogleCalendarWithWriteAccess={
            reconnectGoogleCalendarWithWriteAccess
          }
          publishLinkedNoteToGoogle={publishLinkedCalendarNoteToGoogle}
          updateGoogleCalendarEvent={updateGoogleCalendarEventFromCalendar}
          updateLinkedNote={updateLinkedCalendarNote}
          updateCalendarSelection={updateCalendarSelection}
          updateEventReviewStatus={updateCalendarEventReviewStatus}
        />

        <PageGridItem span="full">
          <AllMeCard className="p-4" variant="status">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="text-[var(--accent)]">
                  <PlugZap aria-hidden="true" className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    Calendar system
                  </p>
                  <p className="truncate text-xs font-semibold text-[var(--muted)]">
                    {data.connection.status} · {data.selectedCalendars}/
                    {data.calendars} calendars shown · last sync{" "}
                    {data.connection.lastSyncedAt
                      ? shortStatusFormatter.format(data.connection.lastSyncedAt)
                      : "never"}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {data.syncStatus.label}: {data.syncStatus.detail}
                  </p>
                </div>
              </div>
              <Link
                className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                href="/settings"
              >
                View diagnostics
              </Link>
            </div>
            {!tokenReadiness.ready ? (
              <p className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--empty)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                Reauthorization needed: {tokenReadiness.reason}. Sign in with
                Google Calendar access again before running sync.
              </p>
            ) : null}
          </AllMeCard>
        </PageGridItem>
      </PageGrid>
    </AppPageShell>
  );
}

const shortStatusFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

function formatCalendarFreshness(lastSyncedAt: Date | null) {
  if (!lastSyncedAt) {
    return "Never";
  }

  return syncFreshnessFormatter.format(lastSyncedAt);
}

function getSyncStatusClassName(tone: "attention" | "neutral" | "ready") {
  switch (tone) {
    case "attention":
      return "border-[var(--danger)]/35 bg-[var(--empty)] text-[var(--danger)]";
    case "ready":
      return "border-[var(--success)]/35 bg-[var(--empty)] text-[var(--success)]";
    case "neutral":
      return "border-[var(--line)] bg-[var(--empty)] text-[var(--muted)]";
  }
}

const syncFreshnessFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  hour: "numeric",
  minute: "2-digit",
  month: "2-digit",
});
