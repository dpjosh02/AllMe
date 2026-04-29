import {
  Activity,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  NotebookPen,
  RefreshCcw,
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
import { requirePageUser } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

const agenda = [
  { time: "8:30 AM", title: "Review today", tone: "Focus" },
  { time: "12:00 PM", title: "Finance import check", tone: "Admin" },
  { time: "5:30 PM", title: "Workout", tone: "Health" },
];

const financeMetrics = [
  { label: "Net worth", value: "$--", detail: "Waiting for first import" },
  { label: "Monthly spend", value: "$--", detail: "No transactions yet" },
  { label: "Investments", value: "$--", detail: "Holdings snapshot pending" },
];

const progressItems = [
  { label: "Daily note", done: true },
  { label: "Calendar review", done: false },
  { label: "Movement", done: false },
  { label: "Finance sync", done: false },
];

export default async function Home() {
  await requirePageUser("/");

  return (
    <AppPageShell>
      <PageHero
        eyebrow="AllMe"
        right={
          <div className="flex h-full items-start rounded-2xl border border-[var(--line)] bg-[var(--empty)] p-4">
            <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <RefreshCcw aria-hidden="true" className="h-4 w-4" />
              <span>Finance import not configured</span>
            </div>
          </div>
        }
        subtitle="A private operating surface for schedule, notes, finance, and progress as the core verticals come online."
        title="Today, money, notes, and progress in one operating view"
      />

      <PageGrid>
        <PageGridItem span="primary">
          <AllMeCard variant="form">
            <PageSection
              description="A compact command surface for daily review."
              icon={<NotebookPen aria-hidden="true" className="h-6 w-6" />}
              title="Today"
            >
              <textarea
                aria-label="Daily note"
                className="min-h-48 w-full resize-y rounded-xl border border-[var(--line)] bg-[var(--input)] p-4 text-base leading-7 outline-none transition focus:border-[var(--accent)]"
                placeholder="Start the daily note..."
              />
            </PageSection>
          </AllMeCard>
        </PageGridItem>

        <PageGridItem span="support">
          <AllMeCard variant="activity">
            <PageSection
              icon={<CalendarDays aria-hidden="true" className="h-6 w-6" />}
              title="Agenda"
            >
              <div className="space-y-3">
                {agenda.map((item) => (
                  <div
                    className="grid grid-cols-[5.5rem_1fr] gap-3 border-b border-[var(--line)] pb-3 last:border-b-0 last:pb-0"
                    key={`${item.time}-${item.title}`}
                  >
                    <span className="text-sm font-semibold text-[var(--accent-strong)]">
                      {item.time}
                    </span>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-[var(--muted)]">{item.tone}</p>
                    </div>
                  </div>
                ))}
              </div>
            </PageSection>
          </AllMeCard>
        </PageGridItem>

        <PageGridItem span="full">
          <div className="grid gap-5 lg:grid-cols-3">
            {financeMetrics.map((metric) => (
              <AllMeCard key={metric.label} variant="metrics">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                    {metric.label}
                  </h2>
                  <CircleDollarSign
                    aria-hidden="true"
                    className="h-5 w-5 text-[var(--accent)]"
                  />
                </div>
                <p className="text-3xl font-semibold">{metric.value}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {metric.detail}
                </p>
              </AllMeCard>
            ))}
          </div>
        </PageGridItem>

        <PageGridItem span="half">
          <AllMeCard variant="activity">
            <PageSection
              icon={<Activity aria-hidden="true" className="h-6 w-6" />}
              title="Progress"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {progressItems.map((item) => (
                  <div
                    className="flex min-h-14 items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--empty)] px-4"
                    key={item.label}
                  >
                    <span className="font-medium">{item.label}</span>
                    <CheckCircle2
                      aria-hidden="true"
                      className={
                        item.done
                          ? "h-5 w-5 text-[var(--success)]"
                          : "h-5 w-5 text-[var(--line)]"
                      }
                    />
                  </div>
                ))}
              </div>
            </PageSection>
          </AllMeCard>
        </PageGridItem>

        <PageGridItem span="half">
          <AllMeCard className="bg-[var(--panel-strong)]" variant="status">
            <PageSection eyebrow="Foundation" title="Milestone 0">
              <p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">
                The current build is the project foundation: app shell, quality
                tooling, database schema, and integration boundaries before
                production features.
              </p>
              <div className="mt-4">
                <StatusPill label="Foundation active" tone="neutral" />
              </div>
            </PageSection>
          </AllMeCard>
        </PageGridItem>
      </PageGrid>
    </AppPageShell>
  );
}
