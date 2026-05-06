import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AllMeCard,
  AppPageShell,
  PageGrid,
  PageGridItem,
  PageHero,
  PageSection,
  StatusPill,
} from "@/components/layout/page-scaffold";
import { CaptureDetailForm } from "@/features/notes/components/capture-detail-form";
import { CaptureStateActionForm } from "@/features/notes/components/capture-state-action-form";
import { DeleteCaptureForm } from "@/features/notes/components/delete-capture-form";
import { getCaptureDetail } from "@/features/notes/queries";
import { requirePageUser } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export default async function CaptureDetailPage({
  params,
}: {
  params: Promise<{ captureId: string }>;
}) {
  const currentUser = await requirePageUser("/notes");
  const { captureId } = await params;
  const capture = await getCaptureDetail({
    captureId,
    userId: currentUser.id,
  });

  if (!capture) {
    notFound();
  }

  const isCompleted = Boolean(capture.completedAt);

  return (
    <AppPageShell>
      <PageHero
        eyebrow="Capture Detail"
        right={
          <AllMeCard className="p-4" variant="status">
            <PageSection eyebrow="State" title="Capture status">
              <StatusPill
                label={isCompleted ? "Completed" : "Active"}
                tone={isCompleted ? "ready" : "neutral"}
              />
              <dl className="mt-4 grid gap-3">
                <MetadataRow
                  label="Created"
                  value={dateTimeFormatter.format(capture.createdAt)}
                />
                <MetadataRow
                  label="Updated"
                  value={dateTimeFormatter.format(capture.updatedAt)}
                />
              </dl>
            </PageSection>
          </AllMeCard>
        }
        subtitle="Edit a quick capture without promoting it into a larger notes system yet."
        title={capture.title}
      />

      <PageGrid>
        <PageGridItem span="primary">
          <AllMeCard variant="form">
            <PageSection
              description="This edits the undated quick-capture row used by Today and the Notes inbox."
              eyebrow="Edit"
              title="Capture content"
            >
              <CaptureDetailForm
                body={capture.body}
                captureId={capture.id}
                lastSavedLabel={`Last saved ${dateTimeFormatter.format(capture.updatedAt)}`}
                title={capture.title}
              />
            </PageSection>
          </AllMeCard>
        </PageGridItem>

        <PageGridItem span="support">
          <div className="grid gap-5">
            <AllMeCard variant="status">
              <PageSection
                description="Return to the full capture inbox and daily-note archive."
                eyebrow="Navigation"
                title="Back to Notes"
              >
                <Link
                  className="allme-control inline-flex min-h-10 items-center gap-2 px-4 text-sm font-semibold"
                  href="/notes"
                >
                  <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                  Notes overview
                </Link>
              </PageSection>
            </AllMeCard>

            <AllMeCard variant="status">
              <PageSection
                description="Completion hides this capture from the active Today inbox without deleting it."
                eyebrow="Workflow"
                title="Inbox state"
              >
                <CaptureStateActionForm
                  captureId={capture.id}
                  mode={isCompleted ? "restore" : "complete"}
                  size="detail"
                />
              </PageSection>
            </AllMeCard>

            {capture.isLinkedToCalendarEvent ? (
              <AllMeCard variant="status">
                <PageSection
                  description="Deleting this note removes the event note relationship and the note body. Google Calendar is not changed yet."
                  eyebrow="Calendar"
                  title="Event note"
                >
                  <DeleteCaptureForm captureId={capture.id} />
                </PageSection>
              </AllMeCard>
            ) : null}
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

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--empty)] px-3 py-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-semibold leading-6">
        {value}
      </dd>
    </div>
  );
}
