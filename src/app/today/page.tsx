import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Inbox,
  NotebookPen,
  SquareCheckBig,
} from "lucide-react";
import Link from "next/link";

import {
  AllMeCard,
  AppPageShell,
  PageGrid,
  PageGridItem,
  PageHero,
  PageSection,
  StatusPill,
} from "@/components/layout/page-scaffold";
import { DailyNoteForm } from "@/features/today/components/daily-note-form";
import { QuickCaptureForm } from "@/features/today/components/quick-capture-form";
import { QuickCaptureList } from "@/features/today/components/quick-capture-list";
import { addDaysToDateKey } from "@/features/today/date";
import { getTodayPageData } from "@/features/today/queries";
import { requirePageUser } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export default async function TodayPage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string }>;
}) {
  const currentUser = await requirePageUser("/today");
  const resolvedSearchParams = await searchParams;
  const data = await getTodayPageData({
    requestedDateKey: resolvedSearchParams?.date,
    userId: currentUser.id,
  });
  const previousDateKey = addDaysToDateKey(data.dateKey, -1);
  const nextDateKey = addDaysToDateKey(data.dateKey, 1);

  return (
    <AppPageShell>
      <PageHero
        eyebrow="Today"
        right={
          <div className="flex h-full flex-col justify-between rounded-2xl border border-[var(--line)] bg-[var(--empty)] p-4">
            <div>
              <p className="allme-kicker">Daily note</p>
              <p className="mt-2 text-lg font-semibold">
                {data.isViewingToday ? "Today" : "Archive"}
              </p>
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              {data.displayDate} · {data.timezone}
            </p>
          </div>
        }
        subtitle="Start the day from one durable note, then layer agenda, capture, finance, and progress around it."
        title="Daily operating view"
      />

      <PageGrid>
        <PageGridItem span="primary" className="xl:h-[36rem]">
          <AllMeCard className="flex min-h-0 flex-col overflow-hidden" variant="form">
            <PageSection
              className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)]"
              description="This note is stored in Postgres and keyed to today's date in your configured timezone."
              eyebrow="Daily Note"
              icon={<NotebookPen aria-hidden="true" className="h-6 w-6" />}
              title={data.dailyNote.title}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    className="allme-control inline-flex min-h-9 items-center gap-2 px-3 text-sm font-semibold"
                    href={`/today?date=${previousDateKey}`}
                    scroll={false}
                  >
                    <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                    Previous day
                  </Link>
                  <Link
                    className="allme-control inline-flex min-h-9 items-center gap-2 px-3 text-sm font-semibold"
                    href={
                      nextDateKey === data.localTodayKey
                        ? "/today"
                        : `/today?date=${nextDateKey}`
                    }
                    scroll={false}
                  >
                    Next day
                    <ChevronRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </div>
                {data.isViewingToday ? (
                  <span
                    aria-disabled="true"
                    className="allme-control inline-flex min-h-9 cursor-not-allowed items-center px-3 text-sm font-semibold opacity-45"
                  >
                    Back to today
                  </span>
                ) : (
                  <Link
                    className="allme-control inline-flex min-h-9 items-center px-3 text-sm font-semibold"
                    href="/today"
                    scroll={false}
                  >
                    Back to today
                  </Link>
                )}
              </div>
              <DailyNoteForm
                body={data.dailyNote.body}
                lastSavedLabel={`Last saved ${dateTimeFormatter.format(data.dailyNote.updatedAt)}`}
                noteId={data.dailyNote.id}
              />
            </PageSection>
          </AllMeCard>
        </PageGridItem>

        <PageGridItem span="support" className="xl:h-[36rem]">
          <AllMeCard className="flex min-h-0 flex-col overflow-hidden" variant="status">
            <PageSection
              className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)]"
              description="Jump back into roughly one month of daily notes. Opening a missing day creates its note on demand."
              eyebrow="Archive"
              icon={<NotebookPen aria-hidden="true" className="h-6 w-6" />}
              title="Recent notes"
            >
              {data.recentDailyNotes.length > 0 ? (
                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  <div className="grid gap-2">
                    {data.recentDailyNotes.map((note) => (
                      <Link
                        className={`rounded-xl border px-3 py-2 text-sm transition hover:border-[var(--accent)] ${
                          note.noteDate === data.dateKey
                            ? "border-[var(--accent)] bg-[var(--panel-strong)]"
                            : "border-transparent bg-[var(--empty)]"
                        }`}
                        href={
                          note.noteDate === data.localTodayKey
                            ? "/today"
                            : `/today?date=${note.noteDate}`
                        }
                        key={note.id}
                        scroll={false}
                      >
                        <p className="font-semibold">
                          {note.displayDate ?? note.title}
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          Saved {dateTimeFormatter.format(note.updatedAt)}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--empty)] px-3 py-2 text-sm text-[var(--muted)]">
                  No archived daily notes yet.
                </p>
              )}
            </PageSection>
          </AllMeCard>
        </PageGridItem>

        <PageGridItem span="primary">
          <AllMeCard variant="status">
            <PageSection
              description="Low-friction inbox for tasks, thoughts, errands, and follow-ups before they are organized."
              eyebrow="Capture"
              icon={<Inbox aria-hidden="true" className="h-6 w-6" />}
              title="Inbox layer"
            >
              <QuickCaptureForm />
              <QuickCaptureList captures={data.quickCaptures} />
            </PageSection>
          </AllMeCard>
        </PageGridItem>

        <PageGridItem span="support" className="min-h-0">
          <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-5">
            <AllMeCard
              className="flex max-h-[24rem] min-h-0 flex-col overflow-hidden"
              variant="status"
            >
              <PageSection
                className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)]"
                description="Cached Calendar events for the selected day. Today never reads directly from Google."
                eyebrow="Agenda"
                icon={<CalendarDays aria-hidden="true" className="h-6 w-6" />}
                title="Schedule context"
              >
                {data.agendaItems.length > 0 ? (
                  <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill
                          label={`${data.agendaItems.length} ${
                            data.agendaItems.length === 1 ? "event" : "events"
                          }`}
                          tone="ready"
                        />
                        <span className="rounded-full border border-[var(--line)] px-2 py-1 text-xs font-semibold text-[var(--muted)]">
                          {data.agendaSource.selectedCalendars} selected calendars
                        </span>
                        {data.agendaItems.some((item) => item.isAllDay) ? (
                          <span className="text-xs font-semibold text-[var(--muted)]">
                            All-day first
                          </span>
                        ) : null}
                      </div>
                      <Link
                        className="text-xs font-semibold text-[var(--accent)] transition hover:text-[var(--foreground)]"
                        href="/calendar"
                      >
                        Manage
                      </Link>
                    </div>
                    <div className="min-h-0 overflow-y-auto pr-1">
                      <div className="grid gap-2">
                        {data.agendaItems.map((item) => (
                          <AgendaItemRow item={item} key={item.id} />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--empty)] px-3 py-3">
                    <StatusPill label="No events" tone="neutral" />
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                      Run Calendar sync or review selected calendars to populate this
                      local agenda cache.
                    </p>
                    <Link
                      className="mt-3 inline-flex text-xs font-semibold text-[var(--accent)] transition hover:text-[var(--foreground)]"
                      href="/calendar"
                    >
                      Manage calendars
                    </Link>
                  </div>
                )}
              </PageSection>
            </AllMeCard>

            <AllMeCard variant="status">
              <PageSection
                description="Progress check-ins will start lightweight before becoming a broader habits and activity system."
                eyebrow="Review"
                icon={<SquareCheckBig aria-hidden="true" className="h-6 w-6" />}
                title="Daily closeout"
              >
                <StatusPill label="Planned" tone="neutral" />
              </PageSection>
            </AllMeCard>
          </div>
        </PageGridItem>
      </PageGrid>
    </AppPageShell>
  );
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

function AgendaItemRow({
  item,
}: {
  item: Awaited<ReturnType<typeof getTodayPageData>>["agendaItems"][number];
}) {
  const timeLabel = item.isAllDay
    ? "All day"
    : item.startsAt
      ? timeFormatter.format(item.startsAt)
      : "Time TBD";

  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--empty)] px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full border border-[var(--line)]"
              style={{ backgroundColor: item.calendarColor ?? "var(--accent)" }}
            />
            <p className="truncate text-sm font-semibold">{item.title}</p>
          </div>
          {item.location ? (
            <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
              {item.location}
            </p>
          ) : null}
        </div>
        <span
          className={`shrink-0 rounded-full border border-[var(--line)] px-2 py-0.5 text-xs font-semibold ${
            item.isAllDay
              ? "bg-[var(--panel-strong)] text-[var(--foreground)]"
              : "text-[var(--accent)]"
          }`}
        >
          {timeLabel}
        </span>
      </div>
    </div>
  );
}
