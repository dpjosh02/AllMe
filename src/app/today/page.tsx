import {
  CalendarDays,
  Inbox,
  NotebookPen,
  SquareCheckBig,
} from "lucide-react";

import {
  AllMeCard,
  AppPageShell,
  PageGrid,
  PageGridItem,
  PageHero,
  PageSection,
  StatusPill,
} from "@/components/layout/page-scaffold";
import { updateDailyNote } from "@/features/today/actions";
import { getTodayPageData } from "@/features/today/queries";
import { requirePageUser } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const currentUser = await requirePageUser("/today");
  const data = await getTodayPageData(currentUser.id);

  return (
    <AppPageShell>
      <PageHero
        eyebrow="Today"
        right={
          <div className="flex h-full flex-col justify-between rounded-2xl border border-[var(--line)] bg-[var(--empty)] p-4">
            <div>
              <p className="allme-kicker">Daily note</p>
              <p className="mt-2 text-lg font-semibold">Auto-created</p>
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
        <PageGridItem span="primary">
          <AllMeCard variant="form">
            <PageSection
              description="This note is stored in Postgres and keyed to today's date in your configured timezone."
              eyebrow="Daily Note"
              icon={<NotebookPen aria-hidden="true" className="h-6 w-6" />}
              title={data.dailyNote.title}
            >
              <form action={updateDailyNote} className="grid gap-4">
                <input name="noteId" type="hidden" value={data.dailyNote.id} />
                <textarea
                  aria-label="Daily note body"
                  className="min-h-[24rem] w-full resize-y rounded-xl border border-[var(--line)] bg-[var(--input)] p-4 text-base leading-7 outline-none transition focus:border-[var(--accent)]"
                  name="body"
                  placeholder="What matters today?"
                  defaultValue={data.dailyNote.body}
                />
                <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-[var(--muted)]">
                    Last saved {dateTimeFormatter.format(data.dailyNote.updatedAt)}
                  </p>
                  <button
                    className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--background)] transition hover:bg-[var(--accent-strong)]"
                    type="submit"
                  >
                    Save daily note
                  </button>
                </div>
              </form>
            </PageSection>
          </AllMeCard>
        </PageGridItem>

        <PageGridItem span="support">
          <div className="grid h-full gap-5">
            <AllMeCard variant="status">
              <PageSection
                description="Calendar connection comes later. This card reserves the agenda surface that will feed the daily command view."
                eyebrow="Agenda"
                icon={<CalendarDays aria-hidden="true" className="h-6 w-6" />}
                title="Schedule context"
              >
                <StatusPill label="Planned" tone="neutral" />
              </PageSection>
            </AllMeCard>

            <AllMeCard variant="status">
              <PageSection
                description="Quick capture will become the low-friction inbox for tasks, thoughts, errands, and follow-ups."
                eyebrow="Capture"
                icon={<Inbox aria-hidden="true" className="h-6 w-6" />}
                title="Inbox layer"
              >
                <StatusPill label="Next slice" tone="neutral" />
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
