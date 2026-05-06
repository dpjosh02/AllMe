import { CalendarDays, ListChecks, PlusCircle } from "lucide-react";

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
import { ProgressCreateForm } from "@/features/progress/components/progress-create-form";
import { ProgressDateControls } from "@/features/progress/components/progress-date-controls";
import { ProgressItemList } from "@/features/progress/components/progress-item-list";
import { ProgressSummaryCard } from "@/features/progress/components/progress-summary-card";
import { getProgressPageData } from "@/features/progress/queries";
import { requirePageUser } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export default async function ProgressPage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string }>;
}) {
  const currentUser = await requirePageUser("/progress");
  const resolvedSearchParams = await searchParams;
  const data = await getProgressPageData({
    requestedDateKey: resolvedSearchParams?.date,
    userId: currentUser.id,
  });

  return (
    <AppPageShell>
      <PageHero
        eyebrow="Progress"
        right={
          <div className="flex h-full flex-col justify-between rounded-2xl border border-[var(--line)] bg-[var(--empty)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="allme-kicker">Daily check-in</p>
              <StatusPill
                label={
                  data.summary.hasItems
                    ? `${data.summary.completedCount}/${data.summary.activeItemCount}`
                    : "Not started"
                }
                tone={data.summary.completedCount > 0 ? "ready" : "neutral"}
              />
            </div>
            <div className="mt-5">
              <p className="text-3xl font-semibold tabular-nums">
                {data.summary.completedCount} of {data.summary.activeItemCount}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {data.displayDate} · {data.timezone}
              </p>
            </div>
          </div>
        }
        subtitle="Record one lightweight daily completion state without introducing streaks, scores, or a broader habit system."
        title="Daily check-in"
      />

      <PageGrid>
        <PageGridItem span="primary">
          <AllMeCard variant="activity">
            <PageSection
              description="Active items are checked against the selected local date."
              eyebrow="Items"
              icon={<ListChecks aria-hidden="true" className="h-6 w-6" />}
              title="Today's items"
            >
              <div className="grid gap-4">
                <ProgressDateControls
                  dateKey={data.dateKey}
                  isViewingToday={data.isViewingToday}
                  localTodayKey={data.localTodayKey}
                />
                <ProgressItemList dateKey={data.dateKey} items={data.items} />
              </div>
            </PageSection>
          </AllMeCard>
        </PageGridItem>

        <PageGridItem span="support">
          <div className="grid gap-5">
            <AllMeCard variant="form">
              <PageSection
                description="Keep the item short and reusable across days."
                eyebrow="Create"
                icon={<PlusCircle aria-hidden="true" className="h-6 w-6" />}
                title="Add check-in"
              >
                <ProgressCreateForm />
              </PageSection>
            </AllMeCard>

            <AllMeCard variant="status">
              <PageSection
                description="The selected day is resolved from your configured timezone."
                eyebrow="Date"
                icon={<CalendarDays aria-hidden="true" className="h-6 w-6" />}
                title="Selected day"
              >
                <MetricGrid className="md:grid-cols-1">
                  <KeyValueRow label="Date" value={data.dateKey} />
                  <KeyValueRow label="Timezone" value={data.timezone} />
                  <KeyValueRow
                    label="Viewing"
                    value={data.isViewingToday ? "Today" : "Archive"}
                  />
                </MetricGrid>
                <div className="mt-4">
                  <ProgressSummaryCard
                    dateKey={data.dateKey}
                    summary={data.summary}
                  />
                </div>
              </PageSection>
            </AllMeCard>
          </div>
        </PageGridItem>
      </PageGrid>
    </AppPageShell>
  );
}
