"use client";

import { useEffect, useRef, useState } from "react";

import {
  emptyLookback,
  formatLookbackLabel,
  getMetricSummary,
  getSinceDate,
  toDateKey,
  type LookbackInput,
  type MetricTransaction,
} from "@/features/finance/dashboard/components/summary-metrics-calculations";
import {
  LookbackControl,
  SummaryMetricGrid,
} from "@/features/finance/dashboard/components/summary-metrics-view";

export const reviewUncategorizedTransactionsEvent =
  "allme:review-uncategorized-transactions";

type SummaryMetricsProps = {
  transactions: MetricTransaction[];
};

export function SummaryMetrics({ transactions }: SummaryMetricsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const lookbackRef = useRef<HTMLDivElement>(null);
  const [lookback, setLookback] = useState<LookbackInput>(emptyLookback);
  const [draftLookback, setDraftLookback] =
    useState<LookbackInput>(emptyLookback);
  const sinceDate = getSinceDate(lookback);
  const sinceDateKey = sinceDate ? toDateKey(sinceDate) : null;
  const {
    categorizedCount,
    filteredTransactionCount,
    totalCredits,
    totalDebits,
    totalIncome,
    totalSpending,
    uncategorizedCount,
  } = getMetricSummary({ sinceDateKey, transactions });
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
        <LookbackControl
          clearLookback={clearLookback}
          draftLookback={draftLookback}
          isOpen={isOpen}
          lookbackLabel={lookbackLabel}
          lookbackRef={lookbackRef}
          onApply={applyLookback}
          onToggle={() => {
            setDraftLookback(lookback);
            setIsOpen((current) => !current);
          }}
          updateDraftLookback={updateDraftLookback}
        />
      </div>

      <SummaryMetricGrid
        categorizedCount={categorizedCount}
        filteredTransactionCount={filteredTransactionCount}
        lookbackLabel={lookbackLabel}
        onReviewUncategorized={() =>
          window.dispatchEvent(new Event(reviewUncategorizedTransactionsEvent))
        }
        totalCredits={totalCredits}
        totalDebits={totalDebits}
        totalIncome={totalIncome}
        totalSpending={totalSpending}
        uncategorizedCount={uncategorizedCount}
      />
    </section>
  );
}
