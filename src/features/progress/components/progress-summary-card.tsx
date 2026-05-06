import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { StatusPill } from "@/components/layout/page-scaffold";
import type { TodayProgressSummary } from "@/features/progress/queries";

type ProgressSummaryCardProps = {
  dateKey: string;
  href?: Route | string;
  summary: TodayProgressSummary;
};

export function ProgressSummaryCard({
  dateKey,
  href,
  summary,
}: ProgressSummaryCardProps) {
  const statusLabel = summary.hasItems
    ? `${summary.completedCount}/${summary.activeItemCount} complete`
    : "Not started";

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--empty)] px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusPill
          label={statusLabel}
          tone={summary.completedCount > 0 ? "ready" : "neutral"}
        />
        {href ? (
          <Link
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] transition hover:text-[var(--foreground)]"
            href={href as Route}
          >
            Open Progress
            <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
      <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
        <CheckCircle2
          aria-hidden="true"
          className={`h-5 w-5 ${
            summary.completedCount > 0
              ? "text-[var(--success)]"
              : "text-[var(--muted)]"
          }`}
        />
        <div className="min-w-0">
          <p className="text-2xl font-semibold tabular-nums">
            {summary.completedCount} of {summary.activeItemCount}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">{dateKey}</p>
        </div>
      </div>
    </div>
  );
}
