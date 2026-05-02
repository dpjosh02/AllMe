import {
  AllMeCard,
  AppPageShell,
  KeyValueRow,
  MetricGrid,
  PageHero,
  PageSection,
} from "@/components/layout/page-scaffold";
import { NotesDashboard } from "@/features/notes/components/notes-dashboard";
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

      <NotesDashboard data={data} />
    </AppPageShell>
  );
}
