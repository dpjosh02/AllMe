import type {
  CategoryOption,
  RecentTransaction,
} from "@/features/finance/dashboard/components/recent-transactions-types";

const compactDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});

export type CalendarDay = {
  date: string;
  isCurrentMonth: boolean;
};

export function filterRecentTransactions({
  afterDate,
  beforeDate,
  isReviewingUncategorized,
  isUncategorizedSelected,
  searchQuery,
  selectedAccountIds,
  selectedCategoryIds,
  transactions,
}: {
  afterDate: string | null;
  beforeDate: string | null;
  isReviewingUncategorized: boolean;
  isUncategorizedSelected: boolean;
  searchQuery: string;
  selectedAccountIds: Set<string>;
  selectedCategoryIds: Set<string>;
  transactions: RecentTransaction[];
}) {
  return transactions.filter((transaction) => {
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
}

export function getFilteredNetAmount(transactions: RecentTransaction[]) {
  return transactions.reduce(
    (sum, transaction) => sum + Number(transaction.amount),
    0,
  );
}

export function getFilteredNetLabel(filteredNetAmount: number) {
  return filteredNetAmount > 0
    ? "Net income"
    : filteredNetAmount < 0
      ? "Net spend"
      : "Net even";
}

export function formatAccountFilterLabel({
  accountCount,
  selectedAccountCount,
}: {
  accountCount: number;
  selectedAccountCount: number;
}) {
  if (selectedAccountCount === accountCount) {
    return "All accounts";
  }

  if (selectedAccountCount === 0) {
    return "No accounts";
  }

  return `${selectedAccountCount} selected`;
}

export function formatDateFilterLabel(
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

export function formatCategoryFilterLabel({
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

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, offset: number) {
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

export function getCalendarDays(month: Date): CalendarDay[] {
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

export function getCalendarDayClassName({
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

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
