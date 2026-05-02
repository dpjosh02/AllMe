import { Archive, Inbox, NotebookPen } from "lucide-react";
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
import { CaptureCreateForm } from "@/features/notes/components/capture-create-form";
import { CaptureList } from "@/features/notes/components/capture-list";
import { getNotesPageData } from "@/features/notes/queries";
import { requirePageUser } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const currentUser = await requirePageUser("/notes");
  const data = await getNotesPageData(currentUser.id);

  return (
    <AppPageShell>
      <PageHero
        eyebrow="Notes"
        right={
          <AllMeCard className="p-4" variant="status">
            <PageSection eyebrow="Library" title="Current scope">
              <MetricGrid>
                <KeyValueRow
                  label="Active captures"
                  value={String(data.stats.activeCaptureCount)}
                />
                <KeyValueRow
                  label="Completed"
                  value={String(data.stats.completedCaptureCount)}
                />
                <KeyValueRow
                  label="Daily notes"
                  value={String(data.stats.dailyNoteCount)}
                />
              </MetricGrid>
            </PageSection>
          </AllMeCard>
        }
        subtitle="Manage the capture inbox and revisit daily notes without making Today carry every review workflow."
        title="Capture and review"
      />

      <PageGrid>
        <PageGridItem className="xl:h-[34rem]" span="primary">
          <AllMeCard
            className="flex min-h-0 flex-col overflow-hidden"
            variant="activity"
          >
            <PageSection
              className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)]"
              description="Inbox items are quick captures that have not been completed yet."
              eyebrow="Inbox"
              icon={<Inbox aria-hidden="true" className="h-6 w-6" />}
              title="Active captures"
            >
              <div className="min-h-0 overflow-y-auto pr-1">
                <div className="mb-4">
                  <CaptureCreateForm />
                </div>
                <CaptureList
                  action="complete"
                  captures={data.activeCaptures}
                  emptyLabel="No active captures."
                />
              </div>
            </PageSection>
          </AllMeCard>
        </PageGridItem>

        <PageGridItem className="xl:h-[34rem]" span="support">
          <AllMeCard
            className="flex min-h-0 flex-col overflow-hidden"
            variant="activity"
          >
            <PageSection
              className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)]"
              description="Daily notes still open on Today so date navigation remains centralized."
              eyebrow="Archive"
              icon={<NotebookPen aria-hidden="true" className="h-6 w-6" />}
              title="Daily notes"
            >
              {data.dailyNotes.length > 0 ? (
                <div className="min-h-0 overflow-y-auto pr-1">
                  <div className="grid gap-3">
                    {data.dailyNotes.map((note) => (
                      <Link
                        className="rounded-xl border border-[var(--line)] bg-[var(--empty)] p-4 transition hover:border-[var(--accent)]"
                        href={
                          note.noteDate ? `/today?date=${note.noteDate}` : "/today"
                        }
                        key={note.id}
                      >
                        <p className="font-semibold">{note.displayDate}</p>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted)]">
                          {note.body || "No note body yet."}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--empty)] px-4 py-3 text-sm text-[var(--muted)]">
                  No daily notes yet.
                </p>
              )}
            </PageSection>
          </AllMeCard>
        </PageGridItem>

        <PageGridItem span="full">
          <AllMeCard variant="activity">
            <PageSection
              description="Completed captures are retained so they can become review material for future Notes and Progress flows."
              eyebrow="Completed"
              icon={<Archive aria-hidden="true" className="h-6 w-6" />}
              title="Recent completed captures"
            >
              <CaptureList
                action="restore"
                captures={data.completedCaptures}
                emptyLabel="No completed captures yet."
              />
            </PageSection>
          </AllMeCard>
        </PageGridItem>
      </PageGrid>
    </AppPageShell>
  );
}
