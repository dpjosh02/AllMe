import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { StatusPill, type StatusTone } from "@/components/layout/page-scaffold";
import type {
  TodayFinanceSnapshot,
  TodayFinanceSnapshotStatus,
} from "@/features/finance/dashboard/today-snapshot-query";

type TodayFinanceSnapshotCardProps = {
  snapshot: TodayFinanceSnapshot;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  style: "currency",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
});

export function TodayFinanceSnapshotCard({
  snapshot,
}: TodayFinanceSnapshotCardProps) {
  const status = getStatusMeta(snapshot.status);
  const bodyCopy = getBodyCopy(snapshot);
  const freshnessLabel = getFreshnessLabel(snapshot);

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--empty)] px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusPill label={status.label} tone={status.tone} />
        <Link
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] transition hover:text-[var(--foreground)]"
          href="/finance"
        >
          Open Finance
          <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      </div>

      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{bodyCopy}</p>

      {snapshot.hasFinanceData ? (
        <dl className="mt-4 grid gap-2">
          <SnapshotMetric label="Posted" value={`${snapshot.postedCount}`} />
          <SnapshotMetric
            label="Cash flow"
            value={
              <span className="inline-flex flex-wrap justify-end gap-x-2 gap-y-1">
                <span className="text-[var(--success)]">
                  Income {formatSignedCurrency(snapshot.incomeTotal, "income")}
                </span>
                <span className="text-[var(--danger)]">
                  Spending{" "}
                  {formatSignedCurrency(snapshot.spendingTotal, "spending")}
                </span>
              </span>
            }
          />
          <SnapshotMetric
            label="Review"
            value={`${snapshot.uncategorizedCount} need review`}
            valueClassName={
              snapshot.uncategorizedCount > 0 ? "text-[var(--warn)]" : ""
            }
          />
        </dl>
      ) : null}

      {freshnessLabel ? (
        <p className="mt-3 text-xs font-medium text-[var(--muted)]">
          {freshnessLabel}
        </p>
      ) : null}
    </div>
  );
}

function SnapshotMetric({
  label,
  value,
  valueClassName = "",
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 rounded-lg border border-[var(--line)] px-3 py-2">
      <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
        {label}
      </dt>
      <dd
        className={`min-w-0 text-right text-sm font-semibold tabular-nums ${valueClassName}`}
      >
        {value}
      </dd>
    </div>
  );
}

function getStatusMeta(status: TodayFinanceSnapshotStatus): {
  label: string;
  tone: StatusTone;
} {
  const statusMeta: Record<
    TodayFinanceSnapshotStatus,
    { label: string; tone: StatusTone }
  > = {
    activity: { label: "Activity", tone: "ready" },
    needs_review: { label: "Needs review", tone: "attention" },
    no_data: { label: "No data", tone: "neutral" },
    quiet: { label: "Quiet", tone: "neutral" },
    unavailable: { label: "Unavailable", tone: "attention" },
  };

  return statusMeta[status];
}

function getBodyCopy(snapshot: TodayFinanceSnapshot) {
  if (snapshot.status === "unavailable") {
    return "Finance snapshot is unavailable right now.";
  }

  if (!snapshot.hasFinanceData) {
    return "No Finance data has been imported yet.";
  }

  if (snapshot.postedCount === 0) {
    return "No posted money activity for this day.";
  }

  return "Posted money activity for this day.";
}

function getFreshnessLabel(snapshot: TodayFinanceSnapshot) {
  if (snapshot.latestImport?.finishedAt) {
    const prefix =
      snapshot.latestImport.status === "failed"
        ? "Last import failed"
        : "Last import";

    return `${prefix} ${dateFormatter.format(snapshot.latestImport.finishedAt)}`;
  }

  if (snapshot.latestImport?.startedAt) {
    return `Import ${snapshot.latestImport.status} ${dateFormatter.format(
      snapshot.latestImport.startedAt,
    )}`;
  }

  if (snapshot.latestBalanceSnapshotDate) {
    return `Balance snapshot ${formatDateKey(snapshot.latestBalanceSnapshotDate)}`;
  }

  return null;
}

function formatSignedCurrency(value: number, type: "income" | "spending") {
  const sign = type === "income" ? "+" : "-";

  return `${sign}${currencyFormatter.format(Math.abs(value))}`;
}

function formatDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return dateFormatter.format(new Date(year, month - 1, day));
}
