"use client";

import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type {
  AccountOption,
  CategoryOption,
  RecentTransaction,
} from "@/features/finance/dashboard/components/recent-transactions-types";
import { reviewUncategorizedTransactionsEvent } from "@/features/finance/dashboard/components/summary-metrics";
import { TagManagerModal } from "@/features/finance/dashboard/components/tag-manager-modal";
import {
  CategoryBadge,
  TransactionDetailModal,
} from "@/features/finance/dashboard/components/transaction-detail-modal";

type RecentTransactionsProps = {
  accounts: AccountOption[];
  categories: CategoryOption[];
  showAccountFilter?: boolean;
  transactions: RecentTransaction[];
};

type ActiveFilterSection = "accounts" | "categories" | "date" | null;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const compactDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function RecentTransactions({
  accounts,
  categories,
  showAccountFilter = true,
  transactions,
}: RecentTransactionsProps) {
  const [activeFilterSection, setActiveFilterSection] =
    useState<ActiveFilterSection>(null);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const transactionListRef = useRef<HTMLDivElement>(null);
  const [afterDate, setAfterDate] = useState<string | null>(() =>
    toDateKey(addMonths(new Date(), -1)),
  );
  const [beforeDate, setBeforeDate] = useState<string | null>(null);
  const [isReviewingUncategorized, setIsReviewingUncategorized] =
    useState(false);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<RecentTransaction | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(new Date()),
  );
  const [selectedAccountIds, setSelectedAccountIds] = useState(
    () => new Set(accounts.map((account) => account.id)),
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(
    () => new Set(categories.map((category) => category.id)),
  );
  const [isUncategorizedSelected, setIsUncategorizedSelected] = useState(true);
  const filteredTransactions = transactions.filter((transaction) => {
    const isSelectedAccount = selectedAccountIds.has(transaction.accountId);
    const isUncategorized =
      transaction.categoryAssignmentSource === "uncategorized" ||
      !transaction.assignedCategoryId;
    const isSelectedCategory = transaction.assignedCategoryId
      ? selectedCategoryIds.has(transaction.assignedCategoryId)
      : isUncategorizedSelected;
    const isSearchMatch =
      searchQuery.trim().length === 0 ||
      transaction.description
        .toLowerCase()
        .includes(searchQuery.trim().toLowerCase());
    const isReviewMatch =
      !isReviewingUncategorized ||
      transaction.categoryAssignmentSource === "uncategorized" ||
      !transaction.assignedCategoryName;
    const isInDateRange = isTransactionInDateRange({
      afterDate,
      beforeDate,
      postedDate: transaction.postedDate,
    });

    return (
      isSelectedAccount &&
      isSelectedCategory &&
      isSearchMatch &&
      isReviewMatch &&
      isInDateRange
    );
  });
  const filteredNetAmount = filteredTransactions.reduce(
    (sum, transaction) => sum + Number(transaction.amount),
    0,
  );
  const filteredNetLabel =
    filteredNetAmount > 0
      ? "Net income"
      : filteredNetAmount < 0
        ? "Net spend"
        : "Net even";
  const selectedCount = selectedAccountIds.size;
  const filterLabel =
    selectedCount === accounts.length
      ? "All accounts"
      : selectedCount === 0
        ? "No accounts"
        : `${selectedCount} selected`;
  const dateFilterLabel = formatDateFilterLabel(afterDate, beforeDate);
  const categoryFilterLabel = formatCategoryFilterLabel({
    categoryCount: categories.length,
    isUncategorizedSelected,
    selectedCategoryCount: selectedCategoryIds.size,
  });
  const calendarDays = getCalendarDays(visibleMonth);

  useEffect(() => {
    function reviewUncategorizedTransactions() {
      setIsReviewingUncategorized(true);
      setSearchQuery("");
    }

    window.addEventListener(
      reviewUncategorizedTransactionsEvent,
      reviewUncategorizedTransactions,
    );

    return () => {
      window.removeEventListener(
        reviewUncategorizedTransactionsEvent,
        reviewUncategorizedTransactions,
      );
    };
  }, []);

  useEffect(() => {
    function closeOpenFilters(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!filterMenuRef.current?.contains(target)) {
        setIsFilterMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOpenFilters);

    return () => {
      document.removeEventListener("pointerdown", closeOpenFilters);
    };
  }, []);

  useEffect(() => {
    transactionListRef.current?.scrollTo({ top: 0 });
  }, [
    afterDate,
    beforeDate,
    isReviewingUncategorized,
    isUncategorizedSelected,
    searchQuery,
    selectedAccountIds,
    selectedCategoryIds,
  ]);

  function toggleAccount(accountId: string) {
    setSelectedAccountIds((current) => {
      const next = new Set(current);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }

      return next;
    });
  }

  function toggleCategory(categoryId: string) {
    setSelectedCategoryIds((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }

      return next;
    });
  }

  function selectAllCategories() {
    setSelectedCategoryIds(new Set(categories.map((category) => category.id)));
    setIsUncategorizedSelected(true);
  }

  function deselectAllCategories() {
    setSelectedCategoryIds(new Set());
    setIsUncategorizedSelected(false);
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
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  }

  function clearDateFilter() {
    setAfterDate(null);
    setBeforeDate(null);
  }

  function resetAllFilters() {
    const defaultDate = new Date();

    setSearchQuery("");
    setIsReviewingUncategorized(false);
    setAfterDate(toDateKey(addMonths(defaultDate, -1)));
    setBeforeDate(null);
    setVisibleMonth(startOfMonth(defaultDate));
    setSelectedCategoryIds(new Set(categories.map((category) => category.id)));
    setIsUncategorizedSelected(true);
    setSelectedAccountIds(new Set(accounts.map((account) => account.id)));
    setActiveFilterSection(null);
  }

  function toggleFilterSection(section: Exclude<ActiveFilterSection, null>) {
    setActiveFilterSection((current) => (current === section ? null : section));
  }

  return (
    <div className="allme-card flex h-[36rem] flex-col p-5 xl:h-[40rem]">
      <div className="mb-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="allme-kicker">Ledger</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">
              Recent Transactions
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Most recent normalized Fintable transactions.
            </p>
            {isReviewingUncategorized ? (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--empty)] px-3 py-1.5 text-sm text-[var(--muted)]">
                <span>Reviewing uncategorized only</span>
                <button
                  className="inline-flex min-h-7 items-center rounded-full border border-[var(--accent)] px-3 text-xs font-semibold text-[var(--accent-strong)] transition hover:bg-[var(--panel-strong)]"
                  onClick={() => setIsReviewingUncategorized(false)}
                  type="button"
                >
                  Clear
                </button>
              </div>
            ) : null}
          </div>
          <button
            aria-label="Manage transaction tags"
            className="allme-control inline-flex h-9 w-9 shrink-0 items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)]"
            onClick={() => setIsTagManagerOpen(true)}
            type="button"
          >
            <MoreHorizontal aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <label className="relative min-w-0">
            <span className="sr-only">Search transactions</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
            />
            <input
              className="allme-control h-10 w-full pl-9 pr-3 text-sm font-semibold outline-none placeholder:text-[var(--muted)]"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search name"
              type="search"
              value={searchQuery}
            />
          </label>
          <div className="relative min-w-0" ref={filterMenuRef}>
            <button
              aria-expanded={isFilterMenuOpen}
              aria-label="Open transaction filters"
              className="allme-control inline-flex h-10 w-full items-center justify-center gap-2 px-4 text-sm font-semibold md:w-auto"
              onClick={() => {
                setIsFilterMenuOpen((current) => !current);
                setActiveFilterSection(null);
              }}
              type="button"
            >
              <SlidersHorizontal
                aria-hidden="true"
                className="h-4 w-4 shrink-0"
              />
              Filters
              <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0" />
            </button>
            {isFilterMenuOpen ? (
              <div className="allme-card absolute right-0 z-30 mt-2 max-h-[min(42rem,calc(100vh-12rem))] w-[min(30rem,calc(100vw-2rem))] overflow-auto p-3">
                <div className="mb-4 flex items-start justify-between gap-4 border-b border-[var(--line)] pb-3">
                  <div>
                    <p className="text-sm font-semibold">Transaction Filters</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {dateFilterLabel} · {categoryFilterLabel}
                      {showAccountFilter ? ` · ${filterLabel}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      className="allme-control inline-flex min-h-8 items-center justify-center px-3 text-xs font-semibold"
                      onClick={resetAllFilters}
                      type="button"
                    >
                      Clear all
                    </button>
                    <button
                      aria-label="Close transaction filters"
                      className="allme-control inline-flex h-8 w-8 items-center justify-center"
                      onClick={() => {
                        setIsFilterMenuOpen(false);
                        setActiveFilterSection(null);
                      }}
                      type="button"
                    >
                      <X aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <section className="allme-card-subtle">
                    <button
                      aria-expanded={activeFilterSection === "date"}
                      className="flex min-h-14 w-full items-center justify-between gap-3 px-3 text-left transition hover:bg-[var(--panel-strong)]"
                      onClick={() => toggleFilterSection("date")}
                      type="button"
                    >
                      <div>
                        <p className="text-sm font-semibold">Date</p>
                        <p className="text-xs text-[var(--muted)]">
                          {dateFilterLabel}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-2 text-[var(--muted)]">
                        <CalendarDays aria-hidden="true" className="h-4 w-4" />
                        <ChevronDown
                          aria-hidden="true"
                          className={`h-4 w-4 transition ${
                            activeFilterSection === "date" ? "rotate-180" : ""
                          }`}
                        />
                      </span>
                    </button>
                    {activeFilterSection === "date" ? (
                      <div className="border-t border-[var(--line)] p-3">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <button
                            aria-label="Previous month"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--line)] transition hover:border-[var(--accent)]"
                            onClick={() => moveVisibleMonth(-1)}
                            type="button"
                          >
                            <ChevronLeft
                              aria-hidden="true"
                              className="h-4 w-4"
                            />
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
                            <ChevronRight
                              aria-hidden="true"
                              className="h-4 w-4"
                            />
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
                  </section>

                  <section className="allme-card-subtle">
                    <button
                      aria-expanded={activeFilterSection === "categories"}
                      className="flex min-h-14 w-full items-center justify-between gap-3 px-3 text-left transition hover:bg-[var(--panel-strong)]"
                      onClick={() => toggleFilterSection("categories")}
                      type="button"
                    >
                      <div>
                        <p className="text-sm font-semibold">Categories</p>
                        <p className="text-xs text-[var(--muted)]">
                          {categoryFilterLabel}
                        </p>
                      </div>
                      <ChevronDown
                        aria-hidden="true"
                        className={`h-4 w-4 text-[var(--muted)] transition ${
                          activeFilterSection === "categories"
                            ? "rotate-180"
                            : ""
                        }`}
                      />
                    </button>
                    {activeFilterSection === "categories" ? (
                      <div className="border-t border-[var(--line)] p-3">
                        <div className="mb-3 flex gap-2">
                          <button
                            className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-md border border-[var(--line)] px-3 text-sm font-semibold transition hover:border-[var(--accent)]"
                            onClick={selectAllCategories}
                            type="button"
                          >
                            <Check aria-hidden="true" className="h-4 w-4" />
                            Select all
                          </button>
                          <button
                            className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-md border border-[var(--line)] px-3 text-sm font-semibold transition hover:border-[var(--accent)]"
                            onClick={deselectAllCategories}
                            type="button"
                          >
                            <X aria-hidden="true" className="h-4 w-4" />
                            Deselect all
                          </button>
                        </div>
                        <div className="max-h-72 overflow-auto">
                          <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 text-sm hover:bg-[var(--panel-strong)]">
                            <input
                              checked={isUncategorizedSelected}
                              className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                              onChange={(event) =>
                                setIsUncategorizedSelected(event.target.checked)
                              }
                              type="checkbox"
                            />
                            <span className="h-3 w-3 shrink-0 rounded-full bg-slate-500" />
                            <span className="min-w-0 truncate">
                              Uncategorized
                            </span>
                          </label>
                          {categories.map((category) => (
                            <label
                              className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 text-sm hover:bg-[var(--panel-strong)]"
                              key={category.id}
                            >
                              <input
                                checked={selectedCategoryIds.has(category.id)}
                                className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                                onChange={() => toggleCategory(category.id)}
                                type="checkbox"
                              />
                              <span
                                aria-hidden="true"
                                className="h-3 w-3 shrink-0 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                              <span className="min-w-0 truncate">
                                {category.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </section>

                  {showAccountFilter ? (
                    <section className="allme-card-subtle">
                      <button
                        aria-expanded={activeFilterSection === "accounts"}
                        className="flex min-h-14 w-full items-center justify-between gap-3 px-3 text-left transition hover:bg-[var(--panel-strong)]"
                        onClick={() => toggleFilterSection("accounts")}
                        type="button"
                      >
                        <div>
                          <p className="text-sm font-semibold">Accounts</p>
                          <p className="text-xs text-[var(--muted)]">
                            {filterLabel}
                          </p>
                        </div>
                        <ChevronDown
                          aria-hidden="true"
                          className={`h-4 w-4 text-[var(--muted)] transition ${
                            activeFilterSection === "accounts"
                              ? "rotate-180"
                              : ""
                          }`}
                        />
                      </button>
                      {activeFilterSection === "accounts" ? (
                        <div className="border-t border-[var(--line)] p-3">
                          <div className="mb-3 flex gap-2">
                            <button
                              className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-md border border-[var(--line)] px-3 text-sm font-semibold transition hover:border-[var(--accent)]"
                              onClick={() =>
                                setSelectedAccountIds(
                                  new Set(
                                    accounts.map((account) => account.id),
                                  ),
                                )
                              }
                              type="button"
                            >
                              <Check aria-hidden="true" className="h-4 w-4" />
                              Select all
                            </button>
                            <button
                              className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-md border border-[var(--line)] px-3 text-sm font-semibold transition hover:border-[var(--accent)]"
                              onClick={() => setSelectedAccountIds(new Set())}
                              type="button"
                            >
                              <X aria-hidden="true" className="h-4 w-4" />
                              Deselect all
                            </button>
                          </div>
                          <div className="max-h-72 overflow-auto">
                            {accounts.map((account) => {
                              const accountName =
                                account.displayName ?? account.name;

                              return (
                                <label
                                  className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 text-sm hover:bg-[var(--panel-strong)]"
                                  key={account.id}
                                >
                                  <input
                                    checked={selectedAccountIds.has(account.id)}
                                    className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                                    onChange={() => toggleAccount(account.id)}
                                    type="checkbox"
                                  />
                                  <span className="min-w-0 truncate">
                                    {accountName}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </section>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        <div
          className="h-full min-h-0 overflow-y-auto pb-3 pr-2 [scrollbar-color:var(--line)_transparent] [scrollbar-width:thin]"
          ref={transactionListRef}
        >
          <div className="space-y-1">
            {filteredTransactions.length === 0 ? (
              <EmptyState label="No transactions match the selected filters." />
            ) : (
              filteredTransactions.map((transaction) => (
                <button
                  className="grid w-full gap-2 rounded-xl px-3 py-3 text-left transition hover:bg-[var(--empty)] hover:text-[var(--accent-strong)] sm:grid-cols-[minmax(0,1fr)_auto]"
                  data-testid="transaction-row"
                  key={transaction.id}
                  onClick={() => setSelectedTransaction(transaction)}
                  type="button"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {transaction.description}
                    </p>
                    <p className="truncate text-sm text-[var(--muted)]">
                      {transaction.accountName}
                    </p>
                    <CategoryBadge
                      color={transaction.assignedCategoryColor}
                      name={transaction.assignedCategoryName}
                    />
                  </div>
                  <div className="text-left sm:text-right">
                    <p
                      className={`font-semibold ${getAmountClass(transaction.amount)}`}
                    >
                      {formatCurrency(transaction.amount)}
                    </p>
                    <p className="text-sm text-[var(--muted)]">
                      {dateFormatter.format(
                        new Date(`${transaction.postedDate}T00:00:00`),
                      )}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-[var(--panel)] to-transparent"
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-4 border-t border-[var(--line)] pt-3">
        <div>
          <p className="text-sm font-semibold">{filteredNetLabel}</p>
          <p className="text-xs text-[var(--muted)]">
            Current ledger filters · {filteredTransactions.length} transactions
          </p>
        </div>
        <p
          className={`text-xl font-semibold tracking-[-0.03em] ${getAmountClass(String(filteredNetAmount))}`}
        >
          {formatCurrency(String(filteredNetAmount))}
        </p>
      </div>
      {selectedTransaction ? (
        <TransactionDetailModal
          categories={categories}
          onClose={() => setSelectedTransaction(null)}
          transaction={selectedTransaction}
        />
      ) : null}
      {isTagManagerOpen ? (
        <TagManagerModal
          accountId={showAccountFilter ? null : (accounts[0]?.id ?? null)}
          categories={categories}
          onClose={() => setIsTagManagerOpen(false)}
          transactions={transactions}
        />
      ) : null}
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

function formatDateFilterLabel(
  afterDate: string | null,
  beforeDate: string | null,
) {
  if (!afterDate) {
    return "All dates";
  }

  if (!beforeDate) {
    return `After ${formatCompactDateLabel(afterDate)}`;
  }

  if (afterDate === beforeDate) {
    return formatCompactDateLabel(afterDate);
  }

  return `${formatCompactDateLabel(afterDate)} - ${formatCompactDateLabel(beforeDate)}`;
}

function formatCategoryFilterLabel({
  categoryCount,
  isUncategorizedSelected,
  selectedCategoryCount,
}: {
  categoryCount: number;
  isUncategorizedSelected: boolean;
  selectedCategoryCount: number;
}) {
  const totalOptions = categoryCount + 1;
  const selectedOptions =
    selectedCategoryCount + (isUncategorizedSelected ? 1 : 0);

  if (selectedOptions === totalOptions) {
    return "All categories";
  }

  if (selectedOptions === 0) {
    return "No categories";
  }

  if (selectedOptions === 1 && isUncategorizedSelected) {
    return "Uncategorized";
  }

  return `${selectedOptions} categories`;
}

function formatCompactDateLabel(date: string) {
  return compactDateFormatter.format(new Date(`${date}T00:00:00`));
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

function addMonths(date: Date, offset: number) {
  const next = new Date(date);
  const originalDay = next.getDate();

  next.setDate(1);
  next.setMonth(next.getMonth() + offset);
  next.setDate(Math.min(originalDay, getDaysInMonth(next)));

  return next;
}

function getDaysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
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
  const isInRange =
    afterDate && beforeDate && date > afterDate && date < beforeDate;

  const classes = [
    "flex h-9 items-center justify-center rounded-md text-sm font-semibold transition",
    isCurrentMonth
      ? "text-[var(--foreground)]"
      : "text-[var(--muted)] opacity-50",
    "hover:bg-[var(--panel-strong)]",
  ];

  if (isInRange) {
    classes.push("bg-[var(--panel-strong)]");
  }

  if (isStart || isEnd) {
    classes.push(
      "bg-[var(--accent)] text-[var(--panel)] hover:bg-[var(--accent)]",
    );
  }

  return classes.join(" ");
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
