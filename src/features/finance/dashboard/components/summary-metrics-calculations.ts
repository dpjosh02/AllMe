export type MetricTransaction = {
  id: string;
  postedDate: string;
  amount: string;
  assignedCategoryName: string | null;
  categoryAssignmentSource:
    | "manual"
    | "rule"
    | "system"
    | "uncategorized"
    | null;
  includeInIncome: boolean | null;
  includeInSpending: boolean | null;
};

export type LookbackInput = {
  days: number;
  weeks: number;
  months: number;
  years: number;
};

export const emptyLookback = {
  days: 0,
  weeks: 0,
  months: 0,
  years: 0,
} satisfies LookbackInput;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function getMetricSummary({
  sinceDateKey,
  transactions,
}: {
  sinceDateKey: string | null;
  transactions: MetricTransaction[];
}) {
  const filteredTransactions = sinceDateKey
    ? transactions.filter(
        (transaction) => transaction.postedDate >= sinceDateKey,
      )
    : transactions;
  const totalCredits = filteredTransactions.reduce(
    (sum, transaction) =>
      Number(transaction.amount) > 0 ? sum + Number(transaction.amount) : sum,
    0,
  );
  const totalDebits = filteredTransactions.reduce(
    (sum, transaction) =>
      Number(transaction.amount) < 0
        ? sum + Math.abs(Number(transaction.amount))
        : sum,
    0,
  );
  const totalIncome = filteredTransactions.reduce(
    (sum, transaction) =>
      Number(transaction.amount) > 0 && transaction.includeInIncome
        ? sum + Number(transaction.amount)
        : sum,
    0,
  );
  const totalSpending = filteredTransactions.reduce(
    (sum, transaction) =>
      Number(transaction.amount) < 0 && transaction.includeInSpending
        ? sum + Math.abs(Number(transaction.amount))
        : sum,
    0,
  );
  const categorizedCount = filteredTransactions.filter(
    (transaction) =>
      transaction.categoryAssignmentSource &&
      transaction.categoryAssignmentSource !== "uncategorized",
  ).length;
  const uncategorizedCount = filteredTransactions.length - categorizedCount;

  return {
    categorizedCount,
    filteredTransactionCount: filteredTransactions.length,
    totalCredits,
    totalDebits,
    totalIncome,
    totalSpending,
    uncategorizedCount,
  };
}

export function getSinceDate(lookback: LookbackInput) {
  const totalDays = lookback.days + lookback.weeks * 7;
  const hasLookback =
    totalDays > 0 || lookback.months > 0 || lookback.years > 0;

  if (!hasLookback) {
    return null;
  }

  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setFullYear(date.getFullYear() - lookback.years);
  date.setMonth(date.getMonth() - lookback.months);
  date.setDate(date.getDate() - totalDays);

  return date;
}

export function formatLookbackLabel({
  lookback,
  sinceDate,
}: {
  lookback: LookbackInput;
  sinceDate: Date | null;
}) {
  if (!sinceDate) {
    return "All time";
  }

  const parts = [
    formatUnit(lookback.years, "yr"),
    formatUnit(lookback.months, "mo"),
    formatUnit(lookback.weeks, "wk"),
    formatUnit(lookback.days, "day"),
  ].filter(Boolean);

  return `${parts.join(" ")} ago · ${dateFormatter.format(sinceDate)}`;
}

function formatUnit(value: number, unit: string) {
  return value > 0 ? `${value} ${unit}${value === 1 ? "" : "s"}` : null;
}

export function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
