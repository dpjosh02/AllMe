"use client";

import type { RefObject } from "react";

import type { RecentTransaction } from "@/features/finance/dashboard/components/recent-transactions-types";
import { CategoryBadge } from "@/features/finance/dashboard/components/transaction-detail-modal";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function ReviewUncategorizedBanner({
  onClear,
}: {
  onClear: () => void;
}) {
  return (
    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--empty)] px-3 py-1.5 text-sm text-[var(--muted)]">
      <span>Reviewing uncategorized only</span>
      <button
        className="inline-flex min-h-7 items-center rounded-full border border-[var(--accent)] px-3 text-xs font-semibold text-[var(--accent-strong)] transition hover:bg-[var(--panel-strong)]"
        onClick={onClear}
        type="button"
      >
        Clear
      </button>
    </div>
  );
}

export function RecentTransactionsLedger({
  filteredNetAmount,
  filteredNetLabel,
  onSelectTransaction,
  transactionListRef,
  transactions,
}: {
  filteredNetAmount: number;
  filteredNetLabel: string;
  onSelectTransaction: (transaction: RecentTransaction) => void;
  transactionListRef: RefObject<HTMLDivElement | null>;
  transactions: RecentTransaction[];
}) {
  return (
    <>
      <div className="relative min-h-0 flex-1">
        <div
          className="h-full min-h-0 overflow-y-auto pb-3 pr-2 [scrollbar-color:var(--line)_transparent] [scrollbar-width:thin]"
          ref={transactionListRef}
        >
          <div className="space-y-1">
            {transactions.length === 0 ? (
              <EmptyState label="No transactions match the selected filters." />
            ) : (
              transactions.map((transaction) => (
                <TransactionLedgerRow
                  key={transaction.id}
                  onSelectTransaction={onSelectTransaction}
                  transaction={transaction}
                />
              ))
            )}
          </div>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-[var(--panel)] to-transparent"
        />
      </div>
      <FilteredNetFooter
        filteredNetAmount={filteredNetAmount}
        filteredNetLabel={filteredNetLabel}
        transactionCount={transactions.length}
      />
    </>
  );
}

function TransactionLedgerRow({
  onSelectTransaction,
  transaction,
}: {
  onSelectTransaction: (transaction: RecentTransaction) => void;
  transaction: RecentTransaction;
}) {
  return (
    <button
      className="grid w-full gap-2 rounded-xl px-3 py-3 text-left transition hover:bg-[var(--empty)] hover:text-[var(--accent-strong)] sm:grid-cols-[minmax(0,1fr)_auto]"
      data-testid="transaction-row"
      onClick={() => onSelectTransaction(transaction)}
      type="button"
    >
      <div className="min-w-0">
        <p className="truncate font-semibold">{transaction.description}</p>
        <p className="truncate text-sm text-[var(--muted)]">
          {transaction.accountName}
        </p>
        <CategoryBadge
          color={transaction.assignedCategoryColor}
          name={transaction.assignedCategoryName}
        />
      </div>
      <div className="text-left sm:text-right">
        <p className={`font-semibold ${getAmountClass(transaction.amount)}`}>
          {formatCurrency(transaction.amount)}
        </p>
        <p className="text-sm text-[var(--muted)]">
          {dateFormatter.format(new Date(`${transaction.postedDate}T00:00:00`))}
        </p>
      </div>
    </button>
  );
}

function FilteredNetFooter({
  filteredNetAmount,
  filteredNetLabel,
  transactionCount,
}: {
  filteredNetAmount: number;
  filteredNetLabel: string;
  transactionCount: number;
}) {
  return (
    <div className="mt-3 flex items-center justify-between gap-4 border-t border-[var(--line)] pt-3">
      <div>
        <p className="text-sm font-semibold">{filteredNetLabel}</p>
        <p className="text-xs text-[var(--muted)]">
          Current ledger filters · {transactionCount} transactions
        </p>
      </div>
      <p
        className={`text-xl font-semibold tracking-[-0.03em] ${getAmountClass(
          String(filteredNetAmount),
        )}`}
      >
        {formatCurrency(String(filteredNetAmount))}
      </p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="allme-card-subtle border-dashed p-4 text-sm text-[var(--muted)]">
      {label}
    </div>
  );
}

function formatCurrency(value: string) {
  return currencyFormatter.format(Number(value));
}

function getAmountClass(value: string) {
  return Number(value) < 0 ? "money-negative" : "money-positive";
}
