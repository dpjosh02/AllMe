"use client";

import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Search,
  Tag,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  assignFinanceTransactionCategory,
  createFinanceCategory,
  deleteFinanceTransaction,
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
  categoryAssignmentSource: "manual" | "rule" | "system" | "uncategorized" | null;
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
  const [isAccountFilterOpen, setIsAccountFilterOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const accountFilterRef = useRef<HTMLDivElement>(null);
  const calendarFilterRef = useRef<HTMLDivElement>(null);
  const [afterDate, setAfterDate] = useState<string | null>(() =>
    toDateKey(addMonths(new Date(), -1)),
  );
  const [beforeDate, setBeforeDate] = useState<string | null>(null);
  const [isReviewingUncategorized, setIsReviewingUncategorized] = useState(false);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<RecentTransaction | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [selectedAccountIds, setSelectedAccountIds] = useState(
    () => new Set(accounts.map((account) => account.id)),
  );
  const filteredTransactions = transactions.filter((transaction) => {
    const isSelectedAccount = selectedAccountIds.has(transaction.accountId);
    const isSearchMatch =
      searchQuery.trim().length === 0 ||
      transaction.description.toLowerCase().includes(searchQuery.trim().toLowerCase());
    const isReviewMatch =
      !isReviewingUncategorized ||
      transaction.categoryAssignmentSource === "uncategorized" ||
      !transaction.assignedCategoryName;
    const isInDateRange = isTransactionInDateRange({
      afterDate,
      beforeDate,
      postedDate: transaction.postedDate,
    });

    return isSelectedAccount && isSearchMatch && isReviewMatch && isInDateRange;
  });
  const selectedCount = selectedAccountIds.size;
  const filterLabel =
    selectedCount === accounts.length
      ? "All accounts"
      : selectedCount === 0
        ? "No accounts"
        : `${selectedCount} selected`;
  const dateFilterLabel = formatDateFilterLabel(afterDate, beforeDate);
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

      const isInsideAccountFilter = accountFilterRef.current?.contains(target);
      const isInsideCalendarFilter = calendarFilterRef.current?.contains(target);

      if (!isInsideAccountFilter) {
        setIsAccountFilterOpen(false);
      }

      if (!isInsideCalendarFilter) {
        setIsCalendarOpen(false);
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
      <div className="mb-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Recent Transactions</h2>
            <p className="text-sm text-[var(--muted)]">
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
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--line)] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)]"
            onClick={() => setIsTagManagerOpen(true)}
            type="button"
          >
            <MoreHorizontal aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="relative min-w-0">
            <span className="sr-only">Search transactions</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
            />
            <input
              className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--input)] pl-9 pr-3 text-sm font-semibold outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search name"
              type="search"
              value={searchQuery}
            />
          </label>
          <div className="relative min-w-0" ref={calendarFilterRef}>
            <button
              aria-expanded={isCalendarOpen}
              aria-label="Filter transactions by date range"
              className="inline-flex h-10 w-full items-center justify-between gap-3 rounded-md border border-[var(--line)] bg-[var(--input)] px-3 text-sm font-semibold transition hover:border-[var(--accent)]"
              onClick={() => {
                setIsCalendarOpen((current) => !current);
                setIsAccountFilterOpen(false);
              }}
              type="button"
            >
              <span className="min-w-0 whitespace-nowrap text-left text-[0.72rem] leading-none">
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

          {showAccountFilter ? (
            <div className="relative min-w-0" ref={accountFilterRef}>
              <button
                aria-expanded={isAccountFilterOpen}
                className="inline-flex h-10 w-full items-center justify-between gap-3 rounded-md border border-[var(--line)] bg-[var(--input)] px-3 text-sm font-semibold transition hover:border-[var(--accent)]"
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
                      onClick={() =>
                        setSelectedAccountIds(
                          new Set(accounts.map((account) => account.id)),
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
                      const accountName = account.displayName ?? account.name;

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
                          <span className="min-w-0 truncate">{accountName}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <div className="max-h-[min(34rem,calc(100vh-19rem))] overflow-y-auto pr-2">
        <div className="divide-y divide-[var(--line)]">
          {filteredTransactions.length === 0 ? (
            <EmptyState label="No transactions match the selected filters." />
          ) : (
            filteredTransactions.map((transaction) => (
              <button
                className="grid w-full gap-2 py-4 text-left transition first:pt-0 last:pb-0 hover:text-[var(--accent-strong)] sm:grid-cols-[minmax(0,1fr)_auto]"
                data-testid="transaction-row"
                key={transaction.id}
                onClick={() => setSelectedTransaction(transaction)}
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
          transaction={selectedTransaction}
        />
      ) : null}
      {isTagManagerOpen ? (
        <TagManagerModal
          accountId={showAccountFilter ? null : accounts[0]?.id ?? null}
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
  transaction,
}: {
  categories: CategoryOption[];
  onClose: () => void;
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
              <p className="font-semibold text-[var(--danger)]">Are you sure?</p>
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
  transaction,
}: {
  categories: CategoryOption[];
  isOpen: boolean;
  onToggle: () => void;
  transaction: RecentTransaction;
}) {
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
            style={{ backgroundColor: transaction.assignedCategoryColor ?? "#64748b" }}
          />
          <span className="truncate">
            {transaction.assignedCategoryName ?? "Uncategorized"}
          </span>
        </span>
        <span className="text-xs text-[var(--muted)]">Change</span>
      </button>

      {isOpen ? (
        <div className="mt-3 grid max-h-64 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {categories.map((category) => {
            const isSelected = category.id === transaction.assignedCategoryId;

            return (
              <form action={assignFinanceTransactionCategory} key={category.id}>
                <input name="transactionId" type="hidden" value={transaction.id} />
                <input name="accountId" type="hidden" value={transaction.accountId} />
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
                  {isSelected ? <Check aria-hidden="true" className="h-4 w-4" /> : null}
                </button>
              </form>
            );
          })}
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
              Create personal tags now. Rule previews for similar transactions come next.
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
          {categories.map((category) => (
            <div
              className="flex items-center justify-between gap-3 rounded-md border border-[var(--line)] bg-[var(--empty)] p-3"
              key={category.id}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{category.name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {formatCategoryBehavior(category)} · {category.transactionCount} tagged
                  </p>
                </div>
              </div>
              <Tag aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--muted)]" />
            </div>
          ))}
        </div>

        {isCreating ? (
          <form action={createFinanceCategory} className="mt-5 rounded-md border border-[var(--line)] bg-[var(--empty)] p-4">
            {accountId ? <input name="accountId" type="hidden" value={accountId} /> : null}
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
              <legend className="mb-2 text-sm font-semibold">Cash-flow behavior</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                <CashFlowRadio
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
  description,
  label,
  value,
}: {
  description: string;
  label: string;
  value: string;
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 text-sm">
      <input
        className="mt-1 h-4 w-4 accent-[var(--accent)]"
        defaultChecked={value === "spending"}
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
    return `After ${formatCompactDateLabel(afterDate)}`;
  }

  if (afterDate === beforeDate) {
    return formatCompactDateLabel(afterDate);
  }

  return `${formatCompactDateLabel(afterDate)} - ${formatCompactDateLabel(beforeDate)}`;
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
