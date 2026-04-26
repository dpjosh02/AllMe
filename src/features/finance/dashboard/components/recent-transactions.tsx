"use client";

import { Check, ChevronDown, X } from "lucide-react";
import { useState } from "react";

type RecentTransaction = {
  id: string;
  postedDate: string;
  description: string;
  amount: string;
  currency: string;
  category: string | null;
  accountName: string;
};

type RecentTransactionsProps = {
  accountNames: string[];
  transactions: RecentTransaction[];
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function RecentTransactions({
  accountNames,
  transactions,
}: RecentTransactionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState(() => new Set(accountNames));
  const filteredTransactions = transactions.filter((transaction) =>
    selectedAccounts.has(transaction.accountName),
  );
  const selectedCount = selectedAccounts.size;
  const filterLabel =
    selectedCount === accountNames.length
      ? "All accounts"
      : selectedCount === 0
        ? "No accounts"
        : `${selectedCount} selected`;

  function toggleAccount(accountName: string) {
    setSelectedAccounts((current) => {
      const next = new Set(current);
      if (next.has(accountName)) {
        next.delete(accountName);
      } else {
        next.add(accountName);
      }

      return next;
    });
  }

  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Recent Transactions</h2>
          <p className="text-sm text-[var(--muted)]">
            Most recent normalized Fintable transactions.
          </p>
        </div>
        <div className="relative">
          <button
            aria-expanded={isOpen}
            className="inline-flex min-h-10 min-w-44 items-center justify-between gap-3 rounded-md border border-[var(--line)] bg-[var(--input)] px-3 text-sm font-semibold transition hover:border-[var(--accent)]"
            onClick={() => setIsOpen((current) => !current)}
            type="button"
          >
            <span>{filterLabel}</span>
            <ChevronDown aria-hidden="true" className="h-4 w-4" />
          </button>
          {isOpen ? (
            <div className="absolute right-0 z-20 mt-2 w-72 rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 shadow-lg">
              <div className="mb-3 flex gap-2">
                <button
                  className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-md border border-[var(--line)] px-3 text-sm font-semibold transition hover:border-[var(--accent)]"
                  onClick={() => setSelectedAccounts(new Set(accountNames))}
                  type="button"
                >
                  <Check aria-hidden="true" className="h-4 w-4" />
                  Select all
                </button>
                <button
                  className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-md border border-[var(--line)] px-3 text-sm font-semibold transition hover:border-[var(--accent)]"
                  onClick={() => setSelectedAccounts(new Set())}
                  type="button"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                  Deselect all
                </button>
              </div>
              <div className="max-h-72 overflow-auto">
                {accountNames.map((accountName) => (
                  <label
                    className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 text-sm hover:bg-[var(--panel-strong)]"
                    key={accountName}
                  >
                    <input
                      checked={selectedAccounts.has(accountName)}
                      className="h-4 w-4 accent-[var(--accent)]"
                      onChange={() => toggleAccount(accountName)}
                      type="checkbox"
                    />
                    <span className="truncate">{accountName}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="max-h-[min(34rem,calc(100vh-19rem))] overflow-y-auto pr-2">
        <div className="divide-y divide-[var(--line)]">
        {filteredTransactions.length === 0 ? (
          <EmptyState label="No transactions match the selected accounts." />
        ) : (
          filteredTransactions.map((transaction) => (
            <div
              className="grid gap-2 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto]"
              key={transaction.id}
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">{transaction.description}</p>
                <p className="truncate text-sm text-[var(--muted)]">
                  {transaction.accountName}
                  {transaction.category ? ` · ${transaction.category}` : ""}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className={`font-semibold ${getAmountClass(transaction.amount)}`}>
                  {formatCurrency(transaction.amount)}
                </p>
                <p className="text-sm text-[var(--muted)]">
                  {dateFormatter.format(new Date(`${transaction.postedDate}T00:00:00`))}
                </p>
              </div>
            </div>
          ))
        )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-[var(--line)] bg-[var(--empty)] p-4 text-sm text-[var(--muted)]">
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
