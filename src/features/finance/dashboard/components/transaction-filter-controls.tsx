"use client";

import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { RefObject } from "react";

import {
  formatAccountFilterLabel,
  formatCategoryFilterLabel,
  formatDateFilterLabel,
  getCalendarDayClassName,
  getCalendarDays,
} from "@/features/finance/dashboard/components/recent-transactions-filtering";
import type {
  AccountOption,
  CategoryOption,
} from "@/features/finance/dashboard/components/recent-transactions-types";

export type ActiveFilterSection = "accounts" | "categories" | "date" | null;

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function TransactionFilterControls({
  accounts,
  activeFilterSection,
  afterDate,
  beforeDate,
  categories,
  clearDateFilter,
  deselectAllCategories,
  filterMenuRef,
  isFilterMenuOpen,
  isUncategorizedSelected,
  moveVisibleMonth,
  resetAllFilters,
  searchQuery,
  selectAllCategories,
  selectDate,
  selectedAccountIds,
  selectedCategoryIds,
  setActiveFilterSection,
  setIsFilterMenuOpen,
  setIsUncategorizedSelected,
  setSearchQuery,
  setSelectedAccountIds,
  showAccountFilter,
  toggleAccount,
  toggleCategory,
  visibleMonth,
}: {
  accounts: AccountOption[];
  activeFilterSection: ActiveFilterSection;
  afterDate: string | null;
  beforeDate: string | null;
  categories: CategoryOption[];
  clearDateFilter: () => void;
  deselectAllCategories: () => void;
  filterMenuRef: RefObject<HTMLDivElement | null>;
  isFilterMenuOpen: boolean;
  isUncategorizedSelected: boolean;
  moveVisibleMonth: (offset: number) => void;
  resetAllFilters: () => void;
  searchQuery: string;
  selectAllCategories: () => void;
  selectDate: (date: string) => void;
  selectedAccountIds: Set<string>;
  selectedCategoryIds: Set<string>;
  setActiveFilterSection: (section: ActiveFilterSection) => void;
  setIsFilterMenuOpen: (
    isOpen: boolean | ((current: boolean) => boolean),
  ) => void;
  setIsUncategorizedSelected: (isSelected: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSelectedAccountIds: (accountIds: Set<string>) => void;
  showAccountFilter: boolean;
  toggleAccount: (accountId: string) => void;
  toggleCategory: (categoryId: string) => void;
  visibleMonth: Date;
}) {
  const accountFilterLabel = formatAccountFilterLabel({
    accountCount: accounts.length,
    selectedAccountCount: selectedAccountIds.size,
  });
  const dateFilterLabel = formatDateFilterLabel(afterDate, beforeDate);
  const categoryFilterLabel = formatCategoryFilterLabel({
    categoryCount: categories.length,
    isUncategorizedSelected,
    selectedCategoryCount: selectedCategoryIds.size,
  });

  function toggleFilterSection(section: Exclude<ActiveFilterSection, null>) {
    setActiveFilterSection(activeFilterSection === section ? null : section);
  }

  return (
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
          <SlidersHorizontal aria-hidden="true" className="h-4 w-4 shrink-0" />
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
                  {showAccountFilter ? ` · ${accountFilterLabel}` : ""}
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
              <DateFilterSection
                activeFilterSection={activeFilterSection}
                afterDate={afterDate}
                beforeDate={beforeDate}
                clearDateFilter={clearDateFilter}
                dateFilterLabel={dateFilterLabel}
                moveVisibleMonth={moveVisibleMonth}
                selectDate={selectDate}
                toggleFilterSection={toggleFilterSection}
                visibleMonth={visibleMonth}
              />
              <CategoryFilterSection
                activeFilterSection={activeFilterSection}
                categories={categories}
                categoryFilterLabel={categoryFilterLabel}
                deselectAllCategories={deselectAllCategories}
                isUncategorizedSelected={isUncategorizedSelected}
                selectAllCategories={selectAllCategories}
                selectedCategoryIds={selectedCategoryIds}
                setIsUncategorizedSelected={setIsUncategorizedSelected}
                toggleCategory={toggleCategory}
                toggleFilterSection={toggleFilterSection}
              />
              {showAccountFilter ? (
                <AccountFilterSection
                  accounts={accounts}
                  activeFilterSection={activeFilterSection}
                  filterLabel={accountFilterLabel}
                  selectedAccountIds={selectedAccountIds}
                  setSelectedAccountIds={setSelectedAccountIds}
                  toggleAccount={toggleAccount}
                  toggleFilterSection={toggleFilterSection}
                />
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DateFilterSection({
  activeFilterSection,
  afterDate,
  beforeDate,
  clearDateFilter,
  dateFilterLabel,
  moveVisibleMonth,
  selectDate,
  toggleFilterSection,
  visibleMonth,
}: {
  activeFilterSection: ActiveFilterSection;
  afterDate: string | null;
  beforeDate: string | null;
  clearDateFilter: () => void;
  dateFilterLabel: string;
  moveVisibleMonth: (offset: number) => void;
  selectDate: (date: string) => void;
  toggleFilterSection: (section: Exclude<ActiveFilterSection, null>) => void;
  visibleMonth: Date;
}) {
  const calendarDays = getCalendarDays(visibleMonth);

  return (
    <section className="allme-card-subtle">
      <button
        aria-expanded={activeFilterSection === "date"}
        className="flex min-h-14 w-full items-center justify-between gap-3 px-3 text-left transition hover:bg-[var(--panel-strong)]"
        onClick={() => toggleFilterSection("date")}
        type="button"
      >
        <div>
          <p className="text-sm font-semibold">Date</p>
          <p className="text-xs text-[var(--muted)]">{dateFilterLabel}</p>
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
    </section>
  );
}

function CategoryFilterSection({
  activeFilterSection,
  categories,
  categoryFilterLabel,
  deselectAllCategories,
  isUncategorizedSelected,
  selectAllCategories,
  selectedCategoryIds,
  setIsUncategorizedSelected,
  toggleCategory,
  toggleFilterSection,
}: {
  activeFilterSection: ActiveFilterSection;
  categories: CategoryOption[];
  categoryFilterLabel: string;
  deselectAllCategories: () => void;
  isUncategorizedSelected: boolean;
  selectAllCategories: () => void;
  selectedCategoryIds: Set<string>;
  setIsUncategorizedSelected: (isSelected: boolean) => void;
  toggleCategory: (categoryId: string) => void;
  toggleFilterSection: (section: Exclude<ActiveFilterSection, null>) => void;
}) {
  return (
    <section className="allme-card-subtle">
      <button
        aria-expanded={activeFilterSection === "categories"}
        className="flex min-h-14 w-full items-center justify-between gap-3 px-3 text-left transition hover:bg-[var(--panel-strong)]"
        onClick={() => toggleFilterSection("categories")}
        type="button"
      >
        <div>
          <p className="text-sm font-semibold">Categories</p>
          <p className="text-xs text-[var(--muted)]">{categoryFilterLabel}</p>
        </div>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 text-[var(--muted)] transition ${
            activeFilterSection === "categories" ? "rotate-180" : ""
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
              <span className="min-w-0 truncate">Uncategorized</span>
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
                <span className="min-w-0 truncate">{category.name}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AccountFilterSection({
  accounts,
  activeFilterSection,
  filterLabel,
  selectedAccountIds,
  setSelectedAccountIds,
  toggleAccount,
  toggleFilterSection,
}: {
  accounts: AccountOption[];
  activeFilterSection: ActiveFilterSection;
  filterLabel: string;
  selectedAccountIds: Set<string>;
  setSelectedAccountIds: (accountIds: Set<string>) => void;
  toggleAccount: (accountId: string) => void;
  toggleFilterSection: (section: Exclude<ActiveFilterSection, null>) => void;
}) {
  return (
    <section className="allme-card-subtle">
      <button
        aria-expanded={activeFilterSection === "accounts"}
        className="flex min-h-14 w-full items-center justify-between gap-3 px-3 text-left transition hover:bg-[var(--panel-strong)]"
        onClick={() => toggleFilterSection("accounts")}
        type="button"
      >
        <div>
          <p className="text-sm font-semibold">Accounts</p>
          <p className="text-xs text-[var(--muted)]">{filterLabel}</p>
        </div>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 text-[var(--muted)] transition ${
            activeFilterSection === "accounts" ? "rotate-180" : ""
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
    </section>
  );
}
