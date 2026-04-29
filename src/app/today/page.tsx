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
import { DailyNoteForm } from "@/features/today/components/daily-note-form";
import { QuickCaptureForm } from "@/features/today/components/quick-capture-form";
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
              <DailyNoteForm
                body={data.dailyNote.body}
                lastSavedLabel={`Last saved ${dateTimeFormatter.format(data.dailyNote.updatedAt)}`}
                noteId={data.dailyNote.id}
              />
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
                description="Low-friction inbox for tasks, thoughts, errands, and follow-ups before they are organized."
                eyebrow="Capture"
                icon={<Inbox aria-hidden="true" className="h-6 w-6" />}
                title="Inbox layer"
              >
                <QuickCaptureForm />
                {data.quickCaptures.length > 0 ? (
                  <div className="mt-4 grid gap-2 border-t border-[var(--line)] pt-4">
                    {data.quickCaptures.map((capture) => (
                      <article
                        className="rounded-xl bg-[var(--empty)] px-3 py-2 text-sm"
                        key={capture.id}
                      >
                        <p className="font-semibold">{capture.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted)]">
                          {capture.body}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl border border-dashed border-[var(--line)] bg-[var(--empty)] px-3 py-2 text-sm text-[var(--muted)]">
                    No captures yet.
                  </p>
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
