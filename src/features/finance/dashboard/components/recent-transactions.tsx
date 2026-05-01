"use client";

import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  addMonths,
  filterRecentTransactions,
  getFilteredNetAmount,
  getFilteredNetLabel,
  startOfMonth,
  toDateKey,
} from "@/features/finance/dashboard/components/recent-transactions-filtering";
import type {
  AccountOption,
  CategoryOption,
  RecentTransaction,
} from "@/features/finance/dashboard/components/recent-transactions-types";
import { reviewUncategorizedTransactionsEvent } from "@/features/finance/dashboard/components/summary-metrics";
import { TagManagerModal } from "@/features/finance/dashboard/components/tag-manager-modal";
import {
  TransactionFilterControls,
  type ActiveFilterSection,
} from "@/features/finance/dashboard/components/transaction-filter-controls";
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
  const filteredTransactions = filterRecentTransactions({
    afterDate,
    beforeDate,
    isReviewingUncategorized,
    isUncategorizedSelected,
    searchQuery,
    selectedAccountIds,
    selectedCategoryIds,
    transactions,
  });
  const filteredNetAmount = getFilteredNetAmount(filteredTransactions);
  const filteredNetLabel = getFilteredNetLabel(filteredNetAmount);

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
        <TransactionFilterControls
          accounts={accounts}
          activeFilterSection={activeFilterSection}
          afterDate={afterDate}
          beforeDate={beforeDate}
          categories={categories}
          clearDateFilter={clearDateFilter}
          deselectAllCategories={deselectAllCategories}
          filterMenuRef={filterMenuRef}
          isFilterMenuOpen={isFilterMenuOpen}
          isUncategorizedSelected={isUncategorizedSelected}
          moveVisibleMonth={moveVisibleMonth}
          resetAllFilters={resetAllFilters}
          searchQuery={searchQuery}
          selectAllCategories={selectAllCategories}
          selectDate={selectDate}
          selectedAccountIds={selectedAccountIds}
          selectedCategoryIds={selectedCategoryIds}
          setActiveFilterSection={setActiveFilterSection}
          setIsFilterMenuOpen={setIsFilterMenuOpen}
          setIsUncategorizedSelected={setIsUncategorizedSelected}
          setSearchQuery={setSearchQuery}
          setSelectedAccountIds={setSelectedAccountIds}
          showAccountFilter={showAccountFilter}
          toggleAccount={toggleAccount}
          toggleCategory={toggleCategory}
          visibleMonth={visibleMonth}
        />
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

function getAmountClass(value: string) {
  return Number(value) < 0 ? "money-negative" : "money-positive";
}
