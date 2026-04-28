"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CircleDollarSign,
  Clock3,
  Database,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const reviewUncategorizedTransactionsEvent =
  "allme:review-uncategorized-transactions";

type MetricTransaction = {
  id: string;
  postedDate: string;
  amount: string;
  assignedCategoryName: string | null;
  categoryAssignmentSource:
    | "manual"
    | "rule"
    | "system"
    | "uncategorized"
    | null;
  includeInIncome: boolean | null;
  includeInSpending: boolean | null;
};

type SummaryMetricsProps = {
  accountCount: number;
  transactions: MetricTransaction[];
};

type LookbackInput = {
  days: number;
  weeks: number;
  months: number;
  years: number;
};

const emptyLookback = {
  days: 0,
  weeks: 0,
  months: 0,
  years: 0,
} satisfies LookbackInput;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function SummaryMetrics({
  accountCount,
  transactions,
}: SummaryMetricsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const lookbackRef = useRef<HTMLDivElement>(null);
  const [lookback, setLookback] = useState<LookbackInput>(emptyLookback);
  const [draftLookback, setDraftLookback] =
    useState<LookbackInput>(emptyLookback);
  const sinceDate = getSinceDate(lookback);
  const sinceDateKey = sinceDate ? toDateKey(sinceDate) : null;
  const filteredTransactions = sinceDateKey
    ? transactions.filter(
        (transaction) => transaction.postedDate >= sinceDateKey,
      )
    : transactions;
  const totalCredits = filteredTransactions.reduce(
    (sum, transaction) =>
      Number(transaction.amount) > 0 ? sum + Number(transaction.amount) : sum,
    0,
  );
  const totalDebits = filteredTransactions.reduce(
    (sum, transaction) =>
      Number(transaction.amount) < 0
        ? sum + Math.abs(Number(transaction.amount))
        : sum,
    0,
  );
  const totalIncome = filteredTransactions.reduce(
    (sum, transaction) =>
      Number(transaction.amount) > 0 && transaction.includeInIncome
        ? sum + Number(transaction.amount)
        : sum,
    0,
  );
  const totalSpending = filteredTransactions.reduce(
    (sum, transaction) =>
      Number(transaction.amount) < 0 && transaction.includeInSpending
        ? sum + Math.abs(Number(transaction.amount))
        : sum,
    0,
  );
  const categorizedCount = filteredTransactions.filter(
    (transaction) =>
      transaction.categoryAssignmentSource &&
      transaction.categoryAssignmentSource !== "uncategorized",
  ).length;
  const uncategorizedCount = filteredTransactions.length - categorizedCount;
  const lookbackLabel = formatLookbackLabel({ lookback, sinceDate });

  useEffect(() => {
    function closeLookback(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node) || lookbackRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
    }

    document.addEventListener("pointerdown", closeLookback);

    return () => {
      document.removeEventListener("pointerdown", closeLookback);
    };
  }, []);

  function updateDraftLookback(field: keyof LookbackInput, value: string) {
    const numericValue = value.replace(/\D/g, "");

    setDraftLookback((current) => ({
      ...current,
      [field]: Math.max(0, Number(numericValue) || 0),
    }));
  }

  function applyLookback() {
    setLookback(draftLookback);
    setIsOpen(false);
  }

  function clearLookback() {
    setDraftLookback(emptyLookback);
    setLookback(emptyLookback);
    setIsOpen(false);
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="allme-kicker">Dashboard Window</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Transaction metrics update from the selected lookback date through
            today.
          </p>
        </div>
        <div className="relative" ref={lookbackRef}>
          <button
            aria-expanded={isOpen}
            className="allme-control inline-flex h-10 min-w-52 items-center justify-between gap-3 px-3 text-sm font-semibold"
            onClick={() => {
              setDraftLookback(lookback);
              setIsOpen((current) => !current);
            }}
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
                  onClick={applyLookback}
                  type="button"
                >
                  Apply
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        <MetricCard
          detail="Imported active accounts"
          icon={<Banknote aria-hidden="true" className="h-5 w-5" />}
          label="Accounts"
          value={String(accountCount)}
        />
        <MetricCard
          detail={lookbackLabel}
          icon={<Database aria-hidden="true" className="h-5 w-5" />}
          label="Transactions"
          value={String(filteredTransactions.length)}
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
                onClick={() =>
                  window.dispatchEvent(
                    new Event(reviewUncategorizedTransactionsEvent),
                  )
                }
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
    </section>
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
  detail: React.ReactNode;
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <article className="allme-card p-5">
      <div className="mb-5 flex items-center justify-between text-[var(--accent)]">
        <h2 className="allme-kicker">{label}</h2>
        {icon}
      </div>
      <p
        className={`text-3xl font-semibold tracking-[-0.04em] ${valueClassName ?? ""}`}
      >
        {value}
      </p>
      <p className="mt-2 text-sm text-[var(--muted)]">{detail}</p>
    </article>
  );
}

function getSinceDate(lookback: LookbackInput) {
  const totalDays = lookback.days + lookback.weeks * 7;
  const hasLookback =
    totalDays > 0 || lookback.months > 0 || lookback.years > 0;

  if (!hasLookback) {
    return null;
  }

  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setFullYear(date.getFullYear() - lookback.years);
  date.setMonth(date.getMonth() - lookback.months);
  date.setDate(date.getDate() - totalDays);

  return date;
}

function formatLookbackLabel({
  lookback,
  sinceDate,
}: {
  lookback: LookbackInput;
  sinceDate: Date | null;
}) {
  if (!sinceDate) {
    return "All time";
  }

  const parts = [
    formatUnit(lookback.years, "yr"),
    formatUnit(lookback.months, "mo"),
    formatUnit(lookback.weeks, "wk"),
    formatUnit(lookback.days, "day"),
  ].filter(Boolean);

  return `${parts.join(" ")} ago · ${dateFormatter.format(sinceDate)}`;
}

function formatUnit(value: number, unit: string) {
  return value > 0 ? `${value} ${unit}${value === 1 ? "" : "s"}` : null;
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
