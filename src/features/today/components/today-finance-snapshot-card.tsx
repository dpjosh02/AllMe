import { ArrowUpRight, CircleDollarSign } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { StatusPill } from "@/components/layout/page-scaffold";
import type { TodayFinanceSnapshot } from "@/features/finance/dashboard/today-snapshot-query";

type TodayFinanceSnapshotCardProps = {
  href?: Route | string;
  snapshot: TodayFinanceSnapshot;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  style: "currency",
});

const importDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
});

export function TodayFinanceSnapshotCard({
  href = "/finance",
  snapshot,
}: TodayFinanceSnapshotCardProps) {
  const status = getSnapshotStatus(snapshot);

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--empty)] px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusPill label={status.label} tone={status.tone} />
        <Link
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] transition hover:text-[var(--foreground)]"
          href={href as Route}
        >
          Open Finance
          <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      </div>

      {snapshot.isUnavailable ? (
        <SnapshotEmptyMessage>
          Finance snapshot is unavailable right now.
        </SnapshotEmptyMessage>
      ) : snapshot.hasFinanceData ? (
        <div className="mt-4 grid gap-3">
          <dl className="grid grid-cols-3 gap-2">
            <SnapshotMetric
              label="Posted"
              value={String(snapshot.postedCount)}
            />
            <SnapshotMetric
              label="Income"
              value={currencyFormatter.format(snapshot.totalIncome)}
            />
            <SnapshotMetric
              label="Spending"
              value={currencyFormatter.format(snapshot.totalSpending)}
            />
          </dl>
          <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
            <CircleDollarSign
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-[var(--accent)]"
            />
            <p className="min-w-0">
              {snapshot.uncategorizedCount > 0
                ? `${snapshot.uncategorizedCount} need review`
                : getFreshnessLabel(snapshot)}
            </p>
          </div>
        </div>
      ) : (
        <SnapshotEmptyMessage>
          No Finance data has been imported yet.
        </SnapshotEmptyMessage>
      )}
    </div>
  );
}

function SnapshotMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm font-semibold tabular-nums">
        {value}
      </dd>
    </div>
  );
}

function SnapshotEmptyMessage({ children }: { children: string }) {
  return (
    <p className="mt-4 rounded-xl border border-dashed border-[var(--line)] bg-[var(--panel)] px-3 py-3 text-sm leading-6 text-[var(--muted)]">
      {children}
    </p>
  );
}

function getSnapshotStatus(snapshot: TodayFinanceSnapshot) {
  if (snapshot.isUnavailable) {
    return { label: "Unavailable", tone: "attention" as const };
  }

  if (!snapshot.hasFinanceData) {
    return { label: "No data", tone: "neutral" as const };
  }

  if (snapshot.uncategorizedCount > 0) {
    return { label: "Needs review", tone: "attention" as const };
  }

  if (snapshot.postedCount > 0) {
    return { label: "Activity", tone: "ready" as const };
  }

  return { label: "Quiet", tone: "neutral" as const };
}

function getFreshnessLabel(snapshot: TodayFinanceSnapshot) {
  if (snapshot.postedCount === 0) {
    return getLastImportLabel(snapshot) ?? "No posted money activity for this day.";
  }

  return "0 need review";
}

function getLastImportLabel(snapshot: TodayFinanceSnapshot) {
  const importDate =
    snapshot.latestImport?.finishedAt ?? snapshot.latestImport?.startedAt;

  return importDate
    ? `Last import ${importDateFormatter.format(importDate)}`
    : null;
}
