import {
  CalendarDays,
  Clock3,
  Link2,
  NotebookPen,
  PlugZap,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";

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
import { requirePageUser } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

const foundationSteps = [
  "Create calendar connection and event cache tables",
  "Add Google OAuth calendar scope behind the existing auth boundary",
  "Sync events idempotently into Postgres",
  "Feed Today from AllMe-owned agenda data",
];

const weekPlaceholders = [
  { day: "Today", detail: "Agenda will appear after Google Calendar sync" },
  { day: "Tomorrow", detail: "Reserved for upcoming events" },
  { day: "This week", detail: "Week view will use cached event rows" },
];

export default async function CalendarPage() {
  await requirePageUser("/calendar");

  return (
    <AppPageShell>
      <PageHero
        eyebrow="Calendar"
        right={
          <div className="flex h-full flex-col justify-between rounded-2xl border border-[var(--line)] bg-[var(--empty)] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="allme-kicker">Integration</p>
                <p className="mt-2 text-lg font-semibold">Google Calendar</p>
              </div>
              <StatusPill label="Not connected" tone="attention" />
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              Calendar data will sync into AllMe before it powers Today,
              weekly planning, and event-linked notes.
            </p>
          </div>
        }
        subtitle="A schedule layer for daily context, weekly planning, and event-linked notes once Google Calendar sync is connected."
        title="Schedule context"
      />

      <PageGrid>
        <PageGridItem span="primary">
          <AllMeCard variant="activity">
            <PageSection
              description="This is the surface Today will eventually consume. It stays empty until the calendar sync writes trusted event rows."
              eyebrow="Agenda"
              icon={<Clock3 aria-hidden="true" className="h-6 w-6" />}
              title="Today"
            >
              <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--empty)] p-5">
                <p className="text-lg font-semibold">No synced events yet</p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                  The first real calendar milestone is not a UI calendar. It is
                  a trustworthy event cache with sync history, owner scoping,
                  and predictable failure visibility.
                </p>
              </div>
            </PageSection>
          </AllMeCard>
        </PageGridItem>

        <PageGridItem span="support">
          <AllMeCard variant="status">
            <PageSection
              description="The connection is intentionally inactive until we define OAuth scopes, sync tables, and ownership rules."
              eyebrow="Connection"
              icon={<PlugZap aria-hidden="true" className="h-6 w-6" />}
              title="Google Calendar"
            >
              <MetricGrid className="md:grid-cols-1">
                <KeyValueRow label="Status" value="Not configured" />
                <KeyValueRow label="Sync source" value="Google Calendar" />
                <KeyValueRow label="Event store" value="Planned" />
                <KeyValueRow label="Secret values" value="Hidden" />
              </MetricGrid>
            </PageSection>
          </AllMeCard>
        </PageGridItem>

        <PageGridItem span="half">
          <AllMeCard variant="activity">
            <PageSection
              description="A lightweight preview of the weekly planning shape before event sync exists."
              eyebrow="Week"
              icon={<CalendarDays aria-hidden="true" className="h-6 w-6" />}
              title="Planning view"
            >
              <div className="grid gap-3">
                {weekPlaceholders.map((item) => (
                  <div
                    className="rounded-xl border border-[var(--line)] bg-[var(--empty)] px-4 py-3"
                    key={item.day}
                  >
                    <p className="text-sm font-semibold">{item.day}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </PageSection>
          </AllMeCard>
        </PageGridItem>

        <PageGridItem span="half">
          <AllMeCard variant="status">
            <PageSection
              description="Calendar should connect to notes only after event identity is stable in the database."
              eyebrow="Notes"
              icon={<NotebookPen aria-hidden="true" className="h-6 w-6" />}
              title="Event-linked notes"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <ReadinessTile
                  detail="Events need durable ids before notes can attach."
                  icon={<Link2 aria-hidden="true" className="h-5 w-5" />}
                  label="Link model"
                  status="Planned"
                />
                <ReadinessTile
                  detail="Notes remain owner-scoped through existing guards."
                  icon={<ShieldCheck aria-hidden="true" className="h-5 w-5" />}
                  label="Access model"
                  status="Ready"
                />
              </div>
            </PageSection>
          </AllMeCard>
        </PageGridItem>

        <PageGridItem span="full">
          <AllMeCard variant="status">
            <PageSection
              description="The next implementation slice should create the data model and sync contract before adding interactive calendar views."
              eyebrow="Build order"
              title="Calendar foundation"
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {foundationSteps.map((step, index) => (
                  <div
                    className="rounded-xl border border-[var(--line)] bg-[var(--empty)] p-4"
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

function ReadinessTile({
  detail,
  icon,
  label,
  status,
}: {
  detail: string;
  icon: ReactNode;
  label: string;
  status: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--empty)] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-semibold">{label}</p>
        <span className="text-[var(--accent)]">{icon}</span>
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
        {status}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{detail}</p>
    </div>
  );
}
