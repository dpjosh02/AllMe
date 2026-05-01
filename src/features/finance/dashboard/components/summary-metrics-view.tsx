"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleDollarSign,
  Clock3,
  Database,
} from "lucide-react";
import type { ReactNode, RefObject } from "react";

import {
  formatCurrency,
  type LookbackInput,
} from "@/features/finance/dashboard/components/summary-metrics-calculations";

export function LookbackControl({
  clearLookback,
  draftLookback,
  isOpen,
  lookbackLabel,
  lookbackRef,
  onApply,
  onToggle,
  updateDraftLookback,
}: {
  clearLookback: () => void;
  draftLookback: LookbackInput;
  isOpen: boolean;
  lookbackLabel: string;
  lookbackRef: RefObject<HTMLDivElement | null>;
  onApply: () => void;
  onToggle: () => void;
  updateDraftLookback: (field: keyof LookbackInput, value: string) => void;
}) {
  return (
    <div className="relative" ref={lookbackRef}>
      <button
        aria-expanded={isOpen}
        className="allme-control inline-flex h-10 min-w-52 items-center justify-between gap-3 px-3 text-sm font-semibold"
        onClick={onToggle}
        type="button"
      >
        <span className="min-w-0 truncate text-left">{lookbackLabel}</span>
        <Clock3 aria-hidden="true" className="h-4 w-4 shrink-0" />
      </button>
      {isOpen ? (
        <div className="allme-card absolute right-0 z-30 mt-2 w-80 p-3">
          <p className="mb-3 text-sm font-semibold">Lookback</p>
          <div className="grid grid-cols-2 gap-2">
            <LookbackField
              label="Days"
              onChange={(value) => updateDraftLookback("days", value)}
              value={draftLookback.days}
            />
            <LookbackField
              label="Weeks"
              onChange={(value) => updateDraftLookback("weeks", value)}
              value={draftLookback.weeks}
            />
            <LookbackField
              label="Months"
              onChange={(value) => updateDraftLookback("months", value)}
              value={draftLookback.months}
            />
            <LookbackField
              label="Years"
              onChange={(value) => updateDraftLookback("years", value)}
              value={draftLookback.years}
            />
          </div>
          <p className="mt-3 text-xs text-[var(--muted)]">
            Example: 1 month and 2 weeks means transactions from that date
            through today.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              className="allme-control inline-flex min-h-10 flex-1 items-center justify-center px-3 text-sm font-semibold"
              onClick={clearLookback}
              type="button"
            >
              All time
            </button>
            <button
              className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-[var(--accent)] px-3 text-sm font-semibold text-[var(--background)] transition hover:bg-[var(--accent-strong)]"
              onClick={onApply}
              type="button"
            >
              Apply
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SummaryMetricGrid({
  categorizedCount,
  filteredTransactionCount,
  lookbackLabel,
  onReviewUncategorized,
  totalCredits,
  totalDebits,
  totalIncome,
  totalSpending,
  uncategorizedCount,
}: {
  categorizedCount: number;
  filteredTransactionCount: number;
  lookbackLabel: string;
  onReviewUncategorized: () => void;
  totalCredits: number;
  totalDebits: number;
  totalIncome: number;
  totalSpending: number;
  uncategorizedCount: number;
}) {
  return (
    <div className="grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-3">
      <MetricCard
        detail={lookbackLabel}
        icon={<Database aria-hidden="true" className="h-5 w-5" />}
        label="Transactions"
        value={String(filteredTransactionCount)}
      />
      <MetricCard
        detail="All positive transactions"
        icon={<ArrowDownLeft aria-hidden="true" className="h-5 w-5" />}
        label="Credits"
        value={formatCurrency(totalCredits)}
        valueClassName="money-positive"
      />
      <MetricCard
        detail="All negative transactions"
        icon={<ArrowUpRight aria-hidden="true" className="h-5 w-5" />}
        label="Debits"
        value={`-${formatCurrency(totalDebits)}`}
        valueClassName="money-negative"
      />
      <MetricCard
        detail="Tagged as income"
        icon={<ArrowDownLeft aria-hidden="true" className="h-5 w-5" />}
        label="Income"
        value={formatCurrency(totalIncome)}
        valueClassName="money-positive"
      />
      <MetricCard
        detail="Tagged as spending"
        icon={<ArrowUpRight aria-hidden="true" className="h-5 w-5" />}
        label="Spending"
        value={`-${formatCurrency(totalSpending)}`}
        valueClassName="money-negative"
      />
      <MetricCard
        detail={
          uncategorizedCount > 0 ? (
            <button
              className="inline-flex min-h-8 items-center rounded-full border border-[var(--accent)] bg-[var(--empty)] px-3 text-sm font-semibold text-[var(--accent-strong)] transition hover:bg-[var(--panel-strong)]"
              onClick={onReviewUncategorized}
              type="button"
            >
              {uncategorizedCount} need review
            </button>
          ) : (
            <span>{uncategorizedCount} need review</span>
          )
        }
        icon={<CircleDollarSign aria-hidden="true" className="h-5 w-5" />}
        label="Categorized"
        value={String(categorizedCount)}
      />
    </div>
  );
}

function LookbackField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-semibold">
      <span>{label}</span>
      <input
        className="allme-control min-h-10 px-3 outline-none"
        inputMode="numeric"
        onChange={(event) => onChange(event.target.value)}
        pattern="[0-9]*"
        type="text"
        value={value}
      />
    </label>
  );
}

function MetricCard({
  detail,
  icon,
  label,
  value,
  valueClassName,
}: {
  detail: ReactNode;
  icon: ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <article className="allme-card flex h-full min-h-40 flex-col p-5">
      <div className="mb-5 flex items-center justify-between text-[var(--accent)]">
        <h2 className="allme-kicker">{label}</h2>
        {icon}
      </div>
      <p
        className={`text-[clamp(1.75rem,2.2vw,2.25rem)] font-semibold leading-tight tracking-[-0.04em] ${valueClassName ?? ""}`}
      >
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{detail}</p>
    </article>
  );
}
