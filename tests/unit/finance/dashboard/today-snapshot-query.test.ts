import { describe, expect, it } from "vitest";

import {
  buildTodayFinanceSnapshot,
  unavailableTodayFinanceSnapshot,
} from "@/features/finance/dashboard/today-snapshot-query";

describe("today finance snapshot read model", () => {
  it("reports no imported Finance data without treating import attempts as data", () => {
    expect(
      buildTodayFinanceSnapshot({
        activeAccountCount: 0,
        latestBalanceSnapshotDate: null,
        latestImport: {
          finishedAt: new Date("2026-05-06T14:00:00.000Z"),
          startedAt: new Date("2026-05-06T13:59:00.000Z"),
          status: "failed",
        },
        transactionCount: 0,
        transactions: [],
        uncategorizedCount: 0,
      }),
    ).toMatchObject({
      hasFinanceData: false,
      postedCount: 0,
      status: "no_data",
    });
  });

  it("uses category-aware income and spending flags for selected-date totals", () => {
    expect(
      buildTodayFinanceSnapshot({
        activeAccountCount: 1,
        latestBalanceSnapshotDate: "2026-05-06",
        latestImport: null,
        transactionCount: 5,
        transactions: [
          {
            amount: "100.00",
            includeInIncome: true,
            includeInSpending: false,
          },
          {
            amount: "75.00",
            includeInIncome: false,
            includeInSpending: true,
          },
          {
            amount: "-24.50",
            includeInIncome: false,
            includeInSpending: true,
          },
          {
            amount: "-300.00",
            includeInIncome: false,
            includeInSpending: false,
          },
        ],
        uncategorizedCount: 0,
      }),
    ).toMatchObject({
      incomeTotal: 100,
      postedCount: 4,
      spendingTotal: 24.5,
      status: "activity",
    });
  });

  it("keeps uncategorized review count independent from selected-date activity", () => {
    expect(
      buildTodayFinanceSnapshot({
        activeAccountCount: 1,
        latestBalanceSnapshotDate: null,
        latestImport: null,
        transactionCount: 12,
        transactions: [],
        uncategorizedCount: 3,
      }),
    ).toMatchObject({
      hasFinanceData: true,
      postedCount: 0,
      status: "needs_review",
      uncategorizedCount: 3,
    });
  });

  it("uses a calm quiet state when data exists without activity or review work", () => {
    expect(
      buildTodayFinanceSnapshot({
        activeAccountCount: 1,
        latestBalanceSnapshotDate: null,
        latestImport: null,
        transactionCount: 12,
        transactions: [],
        uncategorizedCount: 0,
      }),
    ).toMatchObject({
      status: "quiet",
    });
  });

  it("provides a sanitized unavailable fallback", () => {
    expect(unavailableTodayFinanceSnapshot).toEqual({
      hasFinanceData: false,
      incomeTotal: 0,
      latestBalanceSnapshotDate: null,
      latestImport: null,
      postedCount: 0,
      spendingTotal: 0,
      status: "unavailable",
      uncategorizedCount: 0,
    });
  });
});
