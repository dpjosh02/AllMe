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
  Tag,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  assignFinanceCategoryToTransactions,
  assignFinanceTransactionCategory,
  createFinanceCategory,
  createFinanceCategoryTextRule,
  deleteFinanceCategory,
  deleteFinanceTransaction,
  updateFinanceCategory,
} from "@/features/finance/dashboard/actions";
import { reviewUncategorizedTransactionsEvent } from "@/features/finance/dashboard/components/summary-metrics";

type RecentTransaction = {
  id: string;
  accountId: string;
  postedDate: string;
  description: string;
  amount: string;
  currency: string;
  storedCategory: string | null;
  assignedCategoryId: string | null;
  assignedCategoryName: string | null;
  assignedCategoryColor: string | null;
  categoryAssignmentSource:
    | "manual"
    | "rule"
    | "system"
    | "uncategorized"
    | null;
  accountName: string;
  rawDescription: string | null;
  rawMerchantName: string | null;
  rawCategoryPath: string | null;
  rawPersonalFinancePrimary: string | null;
  rawPersonalFinanceDetailed: string | null;
  rawPersonalFinanceConfidence: string | null;
};

type AccountOption = {
  id: string;
  name: string;
  displayName: string | null;
};

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  color: string;
  includeInIncome: boolean;
  includeInSpending: boolean;
  transactionCount: number;
};

type RecentTransactionsProps = {
  accounts: AccountOption[];
  categories: CategoryOption[];
  showAccountFilter?: boolean;
  transactions: RecentTransaction[];
};

type SimilarRuleCandidate = {
  description: string;
  id: string;
  label: string;
  matches: (transaction: RecentTransaction) => boolean;
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
const skipDeleteWarningStorageKey = "allme.skipTransactionDeleteWarning";

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
    <div className="allme-card p-5">
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
              <button
                className="mt-2 inline-flex text-sm font-semibold text-[var(--accent-strong)] transition hover:text-[var(--accent)]"
                onClick={() => setIsReviewingUncategorized(false)}
                type="button"
              >
                Reviewing uncategorized only · Clear
              </button>
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
      <div className="max-h-[min(34rem,calc(100vh-19rem))] overflow-y-auto pr-2">
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
      {selectedTransaction ? (
        <TransactionDetailModal
          categories={categories}
          onClose={() => setSelectedTransaction(null)}
          transactions={transactions}
          transaction={selectedTransaction}
        />
      ) : null}
      {isTagManagerOpen ? (
        <TagManagerModal
          accountId={showAccountFilter ? null : (accounts[0]?.id ?? null)}
          categories={categories}
          onClose={() => setIsTagManagerOpen(false)}
        />
      ) : null}
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

function TransactionDetailModal({
  categories,
  onClose,
  transactions,
  transaction,
}: {
  categories: CategoryOption[];
  onClose: () => void;
  transactions: RecentTransaction[];
  transaction: RecentTransaction;
}) {
  const deleteFormRef = useRef<HTMLFormElement>(null);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [dontShowDeleteWarningAgain, setDontShowDeleteWarningAgain] =
    useState(false);

  function startDeleteFlow() {
    if (localStorage.getItem(skipDeleteWarningStorageKey) === "true") {
      deleteFormRef.current?.requestSubmit();
      return;
    }

    setIsConfirmingDelete(true);
  }

  function submitDelete() {
    if (dontShowDeleteWarningAgain) {
      localStorage.setItem(skipDeleteWarningStorageKey, "true");
    }

    onClose();
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      data-testid="transaction-detail-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
    >
      <div className="max-h-[min(42rem,92vh)] w-full max-w-2xl overflow-y-auto rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              Transaction Detail
            </p>
            <h3 className="mt-1 truncate text-2xl font-semibold">
              {transaction.description}
            </h3>
          </div>
          <button
            aria-label="Close transaction detail"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--line)] transition hover:border-[var(--accent)]"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <DetailItem
            label="Amount"
            value={
              <span className={getAmountClass(transaction.amount)}>
                {formatCurrency(transaction.amount)}
              </span>
            }
          />
          <DetailItem
            label="Date"
            value={dateFormatter.format(
              new Date(`${transaction.postedDate}T00:00:00`),
            )}
          />
          <DetailItem label="Account" value={transaction.accountName} />
          <CategoryDetailItem
            categories={categories}
            isOpen={isCategoryPickerOpen}
            onToggle={() => setIsCategoryPickerOpen((current) => !current)}
            transactions={transactions}
            transaction={transaction}
          />
          <DetailItem
            label="Raw Response Description"
            value={transaction.rawDescription ?? "Not provided"}
          />
          <DetailItem
            label="Raw Merchant"
            value={transaction.rawMerchantName ?? "Not provided"}
          />
          <DetailItem
            label="Raw Category Path"
            value={transaction.rawCategoryPath ?? "Not provided"}
          />
          <DetailItem
            label="Raw Personal Finance Category"
            value={formatRawPersonalFinanceCategory(transaction)}
          />
          <DetailItem
            label="Fintable Sheet Category"
            value={transaction.storedCategory ?? "Not provided"}
          />
        </div>

        <form
          action={deleteFinanceTransaction}
          className="hidden"
          onSubmit={submitDelete}
          ref={deleteFormRef}
        >
          <input name="transactionId" type="hidden" value={transaction.id} />
          <input name="accountId" type="hidden" value={transaction.accountId} />
        </form>

        <div className="mt-5 rounded-md border border-[var(--line)] bg-[var(--empty)] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">Remove transaction</p>
              <p className="text-sm text-[var(--muted)]">
                This removes the local database row. A future Fintable sync can
                re-import it unless we add an ignore list.
              </p>
            </div>
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--danger)] px-4 text-sm font-semibold text-[var(--danger)] transition hover:bg-[var(--danger)] hover:text-[var(--panel)]"
              onClick={startDeleteFlow}
              type="button"
            >
              Delete
            </button>
          </div>

          {isConfirmingDelete ? (
            <div className="mt-4 rounded-md border border-[var(--danger)] bg-[var(--panel)] p-3">
              <p className="font-semibold text-[var(--danger)]">
                Are you sure?
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                This action deletes this transaction from the local database.
              </p>
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
                <input
                  checked={dontShowDeleteWarningAgain}
                  className="h-4 w-4 accent-[var(--accent)]"
                  onChange={(event) =>
                    setDontShowDeleteWarningAgain(event.target.checked)
                  }
                  type="checkbox"
                />
                Do not show this warning again
              </label>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  className="inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--line)] px-4 text-sm font-semibold transition hover:border-[var(--accent)]"
                  onClick={() => setIsConfirmingDelete(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--danger)] px-4 text-sm font-semibold text-[var(--panel)] transition hover:opacity-90"
                  onClick={() => deleteFormRef.current?.requestSubmit()}
                  type="button"
                >
                  Delete transaction
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CategoryDetailItem({
  categories,
  isOpen,
  onToggle,
  transactions,
  transaction,
}: {
  categories: CategoryOption[];
  isOpen: boolean;
  onToggle: () => void;
  transactions: RecentTransaction[];
  transaction: RecentTransaction;
}) {
  const [similarCategoryId, setSimilarCategoryId] = useState(
    () => transaction.assignedCategoryId ?? categories[0]?.id ?? "",
  );
  const similarRuleCandidates = getSimilarRuleCandidates(transaction);
  const [similarRuleId, setSimilarRuleId] = useState(
    () => similarRuleCandidates[0]?.id ?? "",
  );
  const [customMatchText, setCustomMatchText] = useState("");
  const selectedSimilarRule =
    similarRuleCandidates.find((candidate) => candidate.id === similarRuleId) ??
    similarRuleCandidates[0] ??
    null;
  const similarMatches = selectedSimilarRule
    ? transactions.filter((candidate) => selectedSimilarRule.matches(candidate))
    : [];
  const similarMatchIds = similarMatches.map((match) => match.id);
  const customMatchTerms = parseCustomMatchTerms(customMatchText);
  const customMatches =
    customMatchTerms.length > 0
      ? transactions.filter((candidate) =>
          doesTransactionMatchCustomTerms(candidate, customMatchTerms),
        )
      : [];
  const customMatchIds = customMatches.map((match) => match.id);

  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--empty)] p-3 sm:col-span-2">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        AllMe Category
      </p>
      <button
        className="mt-2 inline-flex min-h-10 w-full items-center justify-between gap-3 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 text-left text-sm font-semibold transition hover:border-[var(--accent)]"
        onClick={onToggle}
        type="button"
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="h-3 w-3 shrink-0 rounded-full"
            style={{
              backgroundColor: transaction.assignedCategoryColor ?? "#64748b",
            }}
          />
          <span className="truncate">
            {transaction.assignedCategoryName ?? "Uncategorized"}
          </span>
        </span>
        <span className="text-xs text-[var(--muted)]">Change</span>
      </button>

      {isOpen ? (
        <div className="mt-3 space-y-4">
          <div className="grid max-h-64 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {categories.map((category) => {
              const isSelected = category.id === transaction.assignedCategoryId;

              return (
                <form
                  action={assignFinanceTransactionCategory}
                  key={category.id}
                >
                  <input
                    name="transactionId"
                    type="hidden"
                    value={transaction.id}
                  />
                  <input
                    name="accountId"
                    type="hidden"
                    value={transaction.accountId}
                  />
                  <input name="categoryId" type="hidden" value={category.id} />
                  <button
                    className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-md border px-3 text-left text-sm font-semibold transition hover:border-[var(--accent)] ${
                      isSelected
                        ? "border-[var(--accent)] bg-[var(--panel-strong)]"
                        : "border-[var(--line)] bg-[var(--panel)]"
                    }`}
                    type="submit"
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="truncate">{category.name}</span>
                    </span>
                    {isSelected ? (
                      <Check aria-hidden="true" className="h-4 w-4" />
                    ) : null}
                  </button>
                </form>
              );
            })}
          </div>

          <form
            action={assignFinanceCategoryToTransactions}
            className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-3"
          >
            <input
              name="accountId"
              type="hidden"
              value={transaction.accountId}
            />
            {similarMatchIds.map((transactionId) => (
              <input
                key={transactionId}
                name="transactionIds"
                type="hidden"
                value={transactionId}
              />
            ))}
            <p className="text-sm font-semibold">Apply to similar</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Preview is based on the transactions currently loaded in this
              component.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-semibold">
                <span>Tag</span>
                <select
                  className="min-h-10 rounded-md border border-[var(--line)] bg-[var(--input)] px-3 outline-none transition focus:border-[var(--accent)]"
                  name="categoryId"
                  onChange={(event) => setSimilarCategoryId(event.target.value)}
                  value={similarCategoryId}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold">
                <span>Match by</span>
                <select
                  className="min-h-10 rounded-md border border-[var(--line)] bg-[var(--input)] px-3 outline-none transition focus:border-[var(--accent)]"
                  onChange={(event) => setSimilarRuleId(event.target.value)}
                  value={selectedSimilarRule?.id ?? ""}
                >
                  {similarRuleCandidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-3 rounded-md border border-dashed border-[var(--line)] bg-[var(--empty)] p-3 text-sm">
              <p className="font-semibold">
                {similarMatches.length} transaction
                {similarMatches.length === 1 ? "" : "s"} match
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {selectedSimilarRule?.description ??
                  "No matching signal available."}
              </p>
            </div>
            <button
              className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--panel)] transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!similarCategoryId || similarMatches.length === 0}
              type="submit"
            >
              Apply to previewed matches
            </button>
          </form>

          <form
            action={createFinanceCategoryTextRule}
            className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-3"
          >
            <input
              name="accountId"
              type="hidden"
              value={transaction.accountId}
            />
            <input name="categoryId" type="hidden" value={similarCategoryId} />
            <input name="matchText" type="hidden" value={customMatchText} />
            {customMatchIds.map((transactionId) => (
              <input
                key={transactionId}
                name="transactionIds"
                type="hidden"
                value={transactionId}
              />
            ))}
            <p className="text-sm font-semibold">Custom text rule</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Enter words from raw descriptions, merchants, provider categories,
              or raw category paths. The saved rule will help classify future
              imports.
            </p>
            <label className="mt-3 flex flex-col gap-1 text-sm font-semibold">
              <span>Match words/categories</span>
              <textarea
                className="min-h-20 rounded-md border border-[var(--line)] bg-[var(--input)] px-3 py-2 outline-none transition focus:border-[var(--accent)]"
                onChange={(event) => setCustomMatchText(event.target.value)}
                placeholder="food, restaurant, beverage, cafe"
                value={customMatchText}
              />
            </label>
            <div className="mt-3 rounded-md border border-dashed border-[var(--line)] bg-[var(--empty)] p-3 text-sm">
              <p className="font-semibold">
                {customMatches.length} transaction
                {customMatches.length === 1 ? "" : "s"} match
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {customMatchTerms.length > 0
                  ? `Using ${customMatchTerms.length} term${
                      customMatchTerms.length === 1 ? "" : "s"
                    }: ${customMatchTerms.join(", ")}`
                  : "Separate multiple terms with commas or new lines."}
              </p>
            </div>
            <button
              className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--panel)] transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!similarCategoryId || customMatchTerms.length === 0}
              type="submit"
            >
              Save rule and apply preview
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function TagManagerModal({
  accountId,
  categories,
  onClose,
}: {
  accountId: string | null;
  categories: CategoryOption[];
  onClose: () => void;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(
    null,
  );

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
    >
      <div className="max-h-[min(42rem,92vh)] w-full max-w-2xl overflow-y-auto rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              Tags
            </p>
            <h3 className="mt-1 text-2xl font-semibold">Manage Categories</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Create personal tags now. Rule previews for similar transactions
              come next.
            </p>
          </div>
          <button
            aria-label="Close tag manager"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--line)] transition hover:border-[var(--accent)]"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-2">
          {categories.map((category) => {
            const isEditing = editingCategoryId === category.id;
            const isDeleting = deletingCategoryId === category.id;

            if (isEditing) {
              return (
                <form
                  action={updateFinanceCategory}
                  className="rounded-md border border-[var(--line)] bg-[var(--empty)] p-3"
                  key={category.id}
                >
                  <input name="categoryId" type="hidden" value={category.id} />
                  {accountId ? (
                    <input name="accountId" type="hidden" value={accountId} />
                  ) : null}
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <label className="flex flex-col gap-1 text-sm font-semibold">
                      <span>Tag name</span>
                      <input
                        className="min-h-10 rounded-md border border-[var(--line)] bg-[var(--input)] px-3 outline-none transition focus:border-[var(--accent)]"
                        defaultValue={category.name}
                        name="name"
                        required
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-semibold">
                      <span>Color</span>
                      <input
                        className="h-10 w-20 rounded-md border border-[var(--line)] bg-[var(--input)] p-1"
                        defaultValue={category.color}
                        name="color"
                        type="color"
                      />
                    </label>
                  </div>
                  <fieldset className="mt-3">
                    <legend className="mb-2 text-sm font-semibold">
                      Cash-flow behavior
                    </legend>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <CashFlowRadio
                        defaultChecked={category.includeInSpending}
                        description="Counts as spending."
                        label="Spending"
                        value="spending"
                      />
                      <CashFlowRadio
                        defaultChecked={category.includeInIncome}
                        description="Counts as income."
                        label="Income"
                        value="income"
                      />
                      <CashFlowRadio
                        defaultChecked={
                          !category.includeInSpending &&
                          !category.includeInIncome
                        }
                        description="Excluded from cash flow."
                        label="Neutral"
                        value="neutral"
                      />
                    </div>
                  </fieldset>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <button
                      className="inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--line)] px-4 text-sm font-semibold transition hover:border-[var(--accent)]"
                      onClick={() => setEditingCategoryId(null)}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      className="inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--panel)] transition hover:bg-[var(--accent-strong)]"
                      type="submit"
                    >
                      Save tag
                    </button>
                  </div>
                </form>
              );
            }

            return (
              <div
                className="rounded-md border border-[var(--line)] bg-[var(--empty)] p-3"
                key={category.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {category.name}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {formatCategoryBehavior(category)} ·{" "}
                        {category.transactionCount} tagged
                      </p>
                    </div>
                  </div>
                  <Tag
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-[var(--muted)]"
                  />
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button
                    className="inline-flex min-h-9 flex-1 items-center justify-center rounded-md border border-[var(--line)] px-3 text-sm font-semibold transition hover:border-[var(--accent)]"
                    onClick={() => {
                      setDeletingCategoryId(null);
                      setEditingCategoryId(category.id);
                    }}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="inline-flex min-h-9 flex-1 items-center justify-center rounded-md border border-[var(--danger)] px-3 text-sm font-semibold text-[var(--danger)] transition hover:bg-[var(--danger)] hover:text-[var(--panel)]"
                    onClick={() =>
                      setDeletingCategoryId(isDeleting ? null : category.id)
                    }
                    type="button"
                  >
                    Delete
                  </button>
                </div>
                {isDeleting ? (
                  <form
                    action={deleteFinanceCategory}
                    className="mt-3 rounded-md border border-[var(--danger)] bg-[var(--panel)] p-3"
                  >
                    <input
                      name="categoryId"
                      type="hidden"
                      value={category.id}
                    />
                    {accountId ? (
                      <input name="accountId" type="hidden" value={accountId} />
                    ) : null}
                    <p className="text-sm font-semibold text-[var(--danger)]">
                      Delete this tag?
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Existing transactions using this tag will become
                      uncategorized.
                    </p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <button
                        className="inline-flex min-h-9 items-center justify-center rounded-md border border-[var(--line)] px-3 text-sm font-semibold transition hover:border-[var(--accent)]"
                        onClick={() => setDeletingCategoryId(null)}
                        type="button"
                      >
                        Cancel
                      </button>
                      <button
                        className="inline-flex min-h-9 items-center justify-center rounded-md bg-[var(--danger)] px-3 text-sm font-semibold text-[var(--panel)] transition hover:opacity-90"
                        type="submit"
                      >
                        Delete tag
                      </button>
                    </div>
                  </form>
                ) : null}
              </div>
            );
          })}
        </div>

        {isCreating ? (
          <form
            action={createFinanceCategory}
            className="mt-5 rounded-md border border-[var(--line)] bg-[var(--empty)] p-4"
          >
            {accountId ? (
              <input name="accountId" type="hidden" value={accountId} />
            ) : null}
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="flex flex-col gap-1 text-sm font-semibold">
                <span>Tag name</span>
                <input
                  autoFocus
                  className="min-h-10 rounded-md border border-[var(--line)] bg-[var(--input)] px-3 outline-none transition focus:border-[var(--accent)]"
                  name="name"
                  placeholder="Ordering Out, Rent, Subscriptions"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold">
                <span>Color</span>
                <input
                  className="h-10 w-20 rounded-md border border-[var(--line)] bg-[var(--input)] p-1"
                  defaultValue="#0f766e"
                  name="color"
                  type="color"
                />
              </label>
            </div>

            <fieldset className="mt-3">
              <legend className="mb-2 text-sm font-semibold">
                Cash-flow behavior
              </legend>
              <div className="grid gap-2 sm:grid-cols-3">
                <CashFlowRadio
                  defaultChecked
                  description="Counts as spending."
                  label="Spending"
                  value="spending"
                />
                <CashFlowRadio
                  description="Counts as income."
                  label="Income"
                  value="income"
                />
                <CashFlowRadio
                  description="Excluded from cash flow."
                  label="Neutral"
                  value="neutral"
                />
              </div>
            </fieldset>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--line)] px-4 text-sm font-semibold transition hover:border-[var(--accent)]"
                onClick={() => setIsCreating(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--panel)] transition hover:bg-[var(--accent-strong)]"
                type="submit"
              >
                Create tag
              </button>
            </div>
          </form>
        ) : (
          <button
            className="mt-5 inline-flex min-h-10 w-full items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--panel)] transition hover:bg-[var(--accent-strong)]"
            onClick={() => setIsCreating(true)}
            type="button"
          >
            Create new tag
          </button>
        )}
      </div>
    </div>
  );
}

function CashFlowRadio({
  defaultChecked = false,
  description,
  label,
  value,
}: {
  defaultChecked?: boolean;
  description: string;
  label: string;
  value: string;
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 text-sm">
      <input
        className="mt-1 h-4 w-4 accent-[var(--accent)]"
        defaultChecked={defaultChecked}
        name="cashFlowType"
        type="radio"
        value={value}
      />
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-xs text-[var(--muted)]">{description}</span>
      </span>
    </label>
  );
}

function formatCategoryBehavior(category: CategoryOption) {
  if (category.includeInIncome) {
    return "Income";
  }

  if (category.includeInSpending) {
    return "Spending";
  }

  return "Neutral";
}

function getSimilarRuleCandidates(
  transaction: RecentTransaction,
): SimilarRuleCandidate[] {
  const candidates: SimilarRuleCandidate[] = [];

  if (transaction.rawPersonalFinanceDetailed) {
    const value = transaction.rawPersonalFinanceDetailed;
    candidates.push({
      id: `pfc-detailed:${value}`,
      label: "Provider detailed category",
      description: `Matches transactions whose detailed provider category is ${value}.`,
      matches: (candidate) => candidate.rawPersonalFinanceDetailed === value,
    });
  }

  if (transaction.rawPersonalFinancePrimary) {
    const value = transaction.rawPersonalFinancePrimary;
    candidates.push({
      id: `pfc-primary:${value}`,
      label: "Provider primary category",
      description: `Matches transactions whose primary provider category is ${value}.`,
      matches: (candidate) => candidate.rawPersonalFinancePrimary === value,
    });
  }

  const categoryLeaf = transaction.rawCategoryPath?.split(">").pop()?.trim();
  if (categoryLeaf) {
    candidates.push({
      id: `raw-category:${categoryLeaf}`,
      label: "Raw category path",
      description: `Matches transactions whose raw category path contains ${categoryLeaf}.`,
      matches: (candidate) =>
        normalizeText(candidate.rawCategoryPath).includes(
          normalizeText(categoryLeaf),
        ),
    });
  }

  if (transaction.rawMerchantName) {
    const value = transaction.rawMerchantName;
    candidates.push({
      id: `merchant:${value}`,
      label: "Merchant",
      description: `Matches transactions from merchant ${value}.`,
      matches: (candidate) =>
        normalizeText(candidate.rawMerchantName) === normalizeText(value),
    });
  }

  const rawDescription = transaction.rawDescription ?? transaction.description;
  if (rawDescription) {
    const value = normalizeText(rawDescription);
    candidates.push({
      id: `description:${value}`,
      label: "Description",
      description: `Matches transactions with the same normalized description.`,
      matches: (candidate) =>
        normalizeText(candidate.rawDescription ?? candidate.description) ===
        value,
    });
  }

  return dedupeSimilarRuleCandidates(candidates);
}

function dedupeSimilarRuleCandidates(candidates: SimilarRuleCandidate[]) {
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    if (seen.has(candidate.id)) {
      return false;
    }

    seen.add(candidate.id);
    return true;
  });
}

function normalizeText(value: string | null) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseCustomMatchTerms(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,\n]/)
        .map((term) => normalizeText(term))
        .filter((term) => term.length >= 2),
    ),
  );
}

function doesTransactionMatchCustomTerms(
  transaction: RecentTransaction,
  terms: string[],
) {
  const searchableText = normalizeText(
    [
      transaction.description,
      transaction.storedCategory,
      transaction.rawDescription,
      transaction.rawMerchantName,
      transaction.rawCategoryPath,
      transaction.rawPersonalFinancePrimary,
      transaction.rawPersonalFinanceDetailed,
    ]
      .filter(Boolean)
      .join(" "),
  );

  return terms.some((term) => searchableText.includes(term));
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--empty)] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </p>
      <div className="mt-1 break-words text-sm font-semibold">{value}</div>
    </div>
  );
}

function formatRawPersonalFinanceCategory(transaction: RecentTransaction) {
  const categoryParts = [
    transaction.rawPersonalFinancePrimary,
    transaction.rawPersonalFinanceDetailed,
  ].filter(Boolean);

  if (categoryParts.length === 0) {
    return "Not provided";
  }

  const confidence = transaction.rawPersonalFinanceConfidence
    ? ` (${transaction.rawPersonalFinanceConfidence})`
    : "";

  return `${categoryParts.join(" / ")}${confidence}`;
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
