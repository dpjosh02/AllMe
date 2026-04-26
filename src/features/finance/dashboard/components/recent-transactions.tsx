"use client";

import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useState } from "react";

type RecentTransaction = {
  id: string;
  postedDate: string;
  description: string;
  amount: string;
  currency: string;
  assignedCategoryName: string | null;
  assignedCategoryColor: string | null;
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

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function RecentTransactions({
  accountNames,
  transactions,
}: RecentTransactionsProps) {
  const [isAccountFilterOpen, setIsAccountFilterOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [afterDate, setAfterDate] = useState<string | null>(null);
  const [beforeDate, setBeforeDate] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [selectedAccounts, setSelectedAccounts] = useState(() => new Set(accountNames));
  const filteredTransactions = transactions.filter((transaction) => {
    const isSelectedAccount = selectedAccounts.has(transaction.accountName);
    const isInDateRange = isTransactionInDateRange({
      afterDate,
      beforeDate,
      postedDate: transaction.postedDate,
    });

    return isSelectedAccount && isInDateRange;
  });
  const selectedCount = selectedAccounts.size;
  const filterLabel =
    selectedCount === accountNames.length
      ? "All accounts"
      : selectedCount === 0
        ? "No accounts"
        : `${selectedCount} selected`;
  const dateFilterLabel = formatDateFilterLabel(afterDate, beforeDate);
  const calendarDays = getCalendarDays(visibleMonth);

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

  function selectDate(date: string) {
    if (!afterDate || beforeDate) {
      setAfterDate(date);
      setBeforeDate(null);
      return;
    }

    if (date < afterDate) {
      setBeforeDate(afterDate);
      setAfterDate(date);
      return;
    }

    setBeforeDate(date);
  }

  function moveVisibleMonth(offset: number) {
    setVisibleMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  }

  function clearDateFilter() {
    setAfterDate(null);
    setBeforeDate(null);
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="relative">
            <button
              aria-expanded={isCalendarOpen}
              aria-label="Filter transactions by date range"
              className="inline-flex h-10 w-44 items-center justify-between gap-3 rounded-md border border-[var(--line)] bg-[var(--input)] px-3 text-sm font-semibold transition hover:border-[var(--accent)]"
              onClick={() => {
                setIsCalendarOpen((current) => !current);
                setIsAccountFilterOpen(false);
              }}
              type="button"
            >
              <span className="min-w-0 truncate text-left text-[0.72rem] leading-none">
                {dateFilterLabel}
              </span>
              <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0" />
            </button>
            {isCalendarOpen ? (
              <div className="absolute right-0 z-30 mt-2 w-80 rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 shadow-lg">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <button
                    aria-label="Previous month"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--line)] transition hover:border-[var(--accent)]"
                    onClick={() => moveVisibleMonth(-1)}
                    type="button"
                  >
                    <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <p className="text-sm font-semibold">
                    {monthFormatter.format(visibleMonth)}
                  </p>
                  <button
                    aria-label="Next month"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--line)] transition hover:border-[var(--accent)]"
                    onClick={() => moveVisibleMonth(1)}
                    type="button"
                  >
                    <ChevronRight aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>

                <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  {dayLabels.map((dayLabel) => (
                    <span key={dayLabel}>{dayLabel}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day) => (
                    <button
                      className={getCalendarDayClassName({
                        date: day.date,
                        isCurrentMonth: day.isCurrentMonth,
                        afterDate,
                        beforeDate,
                      })}
                      key={day.date}
                      onClick={() => selectDate(day.date)}
                      type="button"
                    >
                      {Number(day.date.slice(-2))}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-3 text-xs text-[var(--muted)]">
                  <span>{dateFilterLabel}</span>
                  <button
                    className="font-semibold text-[var(--accent-strong)] transition hover:text-[var(--accent)]"
                    onClick={clearDateFilter}
                    type="button"
                  >
                    Clear dates
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button
              aria-expanded={isAccountFilterOpen}
              className="inline-flex h-10 min-w-44 items-center justify-between gap-3 rounded-md border border-[var(--line)] bg-[var(--input)] px-3 text-sm font-semibold transition hover:border-[var(--accent)]"
              onClick={() => {
                setIsAccountFilterOpen((current) => !current);
                setIsCalendarOpen(false);
              }}
              type="button"
            >
              <span>{filterLabel}</span>
              <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0" />
            </button>
            {isAccountFilterOpen ? (
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
                        className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                        onChange={() => toggleAccount(accountName)}
                        type="checkbox"
                      />
                      <span className="min-w-0 truncate">{accountName}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="max-h-[min(34rem,calc(100vh-19rem))] overflow-y-auto pr-2">
        <div className="divide-y divide-[var(--line)]">
          {filteredTransactions.length === 0 ? (
            <EmptyState label="No transactions match the selected filters." />
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
                    {dateFormatter.format(
                      new Date(`${transaction.postedDate}T00:00:00`),
                    )}
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

function CategoryBadge({
  color,
  name,
}: {
  color: string | null;
  name: string | null;
}) {
  const label = name ?? "Uncategorized";
  const badgeColor = color ?? "#64748b";

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
      <span
        className="inline-flex items-center rounded-full border px-2 py-1 font-semibold"
        style={{
          borderColor: badgeColor,
          color: badgeColor,
        }}
      >
        {label}
      </span>
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

function formatDateFilterLabel(afterDate: string | null, beforeDate: string | null) {
  if (!afterDate) {
    return "All dates";
  }

  if (!beforeDate) {
    return `After ${formatDateLabel(afterDate)}`;
  }

  if (afterDate === beforeDate) {
    return formatDateLabel(afterDate);
  }

  return `${formatDateLabel(afterDate)} - ${formatDateLabel(beforeDate)}`;
}

function formatDateLabel(date: string) {
  return dateFormatter.format(new Date(`${date}T00:00:00`));
}

function getAmountClass(value: string) {
  return Number(value) < 0 ? "money-negative" : "money-positive";
}

function isTransactionInDateRange({
  afterDate,
  beforeDate,
  postedDate,
}: {
  afterDate: string | null;
  beforeDate: string | null;
  postedDate: string;
}) {
  if (!afterDate) {
    return true;
  }

  if (postedDate < afterDate) {
    return false;
  }

  return beforeDate ? postedDate <= beforeDate : true;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getCalendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    return {
      date: toDateKey(date),
      isCurrentMonth: date.getMonth() === month.getMonth(),
    };
  });
}

function getCalendarDayClassName({
  afterDate,
  beforeDate,
  date,
  isCurrentMonth,
}: {
  afterDate: string | null;
  beforeDate: string | null;
  date: string;
  isCurrentMonth: boolean;
}) {
  const isStart = date === afterDate;
  const isEnd = date === beforeDate;
  const isInRange = afterDate && beforeDate && date > afterDate && date < beforeDate;

  const classes = [
    "flex h-9 items-center justify-center rounded-md text-sm font-semibold transition",
    isCurrentMonth ? "text-[var(--foreground)]" : "text-[var(--muted)] opacity-50",
    "hover:bg-[var(--panel-strong)]",
  ];

  if (isInRange) {
    classes.push("bg-[var(--panel-strong)]");
  }

  if (isStart || isEnd) {
    classes.push("bg-[var(--accent)] text-[var(--panel)] hover:bg-[var(--accent)]");
  }

  return classes.join(" ");
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
