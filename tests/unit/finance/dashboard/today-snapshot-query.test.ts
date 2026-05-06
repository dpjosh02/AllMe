import { describe, expect, it } from "vitest";

import {
  buildTodayFinanceSnapshot,
  createUnavailableTodayFinanceSnapshot,
} from "@/features/finance/dashboard/today-snapshot-query";

describe("today finance snapshot read model", () => {
  it("summarizes posted activity with category-aware income and spending", () => {
    const snapshot = buildTodayFinanceSnapshot({
      dateKey: "2026-05-06",
      hasFinanceData: true,
      latestImport: {
        finishedAt: new Date("2026-05-06T15:00:00.000Z"),
        startedAt: new Date("2026-05-06T14:55:00.000Z"),
        status: "succeeded",
      },
      transactions: [
        {
          amount: "100.00",
          assignedCategoryId: "income",
          categoryAssignmentSource: "rule",
          includeInIncome: true,
          includeInSpending: false,
        },
        {
          amount: "25.00",
          assignedCategoryId: "transfer",
          categoryAssignmentSource: "manual",
          includeInIncome: false,
          includeInSpending: false,
        },
        {
          amount: "-12.34",
          assignedCategoryId: "groceries",
          categoryAssignmentSource: "manual",
          includeInIncome: false,
          includeInSpending: true,
        },
        {
          amount: "-45.67",
          assignedCategoryId: "investing",
          categoryAssignmentSource: "system",
          includeInIncome: false,
          includeInSpending: false,
        },
      ],
    });

    expect(snapshot).toMatchObject({
      dateKey: "2026-05-06",
      hasFinanceData: true,
      isUnavailable: false,
      postedCount: 4,
      totalIncome: 100,
      totalSpending: 12.34,
      uncategorizedCount: 0,
    });
  });

  it("counts missing, uncategorized, and deleted-category assignments as review work", () => {
    const snapshot = buildTodayFinanceSnapshot({
      dateKey: "2026-05-06",
      hasFinanceData: true,
      latestImport: null,
      transactions: [
        {
          amount: "-10.00",
          assignedCategoryId: null,
          categoryAssignmentSource: null,
          includeInIncome: null,
          includeInSpending: null,
        },
        {
          amount: "-20.00",
          assignedCategoryId: null,
          categoryAssignmentSource: "uncategorized",
          includeInIncome: null,
          includeInSpending: null,
        },
        {
          amount: "-30.00",
          assignedCategoryId: null,
          categoryAssignmentSource: "manual",
          includeInIncome: null,
          includeInSpending: null,
        },
      ],
    });

    expect(snapshot.uncategorizedCount).toBe(3);
    expect(snapshot.totalIncome).toBe(0);
    expect(snapshot.totalSpending).toBe(0);
  });

  it("preserves empty and unavailable states without inventing metrics", () => {
    expect(
      buildTodayFinanceSnapshot({
        dateKey: "2026-05-06",
        hasFinanceData: false,
        latestImport: null,
        transactions: [],
      }),
    ).toEqual({
      dateKey: "2026-05-06",
      hasFinanceData: false,
      isUnavailable: false,
      latestImport: null,
      postedCount: 0,
      totalIncome: 0,
      totalSpending: 0,
      uncategorizedCount: 0,
    });

    expect(createUnavailableTodayFinanceSnapshot("2026-05-06")).toEqual({
      dateKey: "2026-05-06",
      hasFinanceData: true,
      isUnavailable: true,
      latestImport: null,
      postedCount: 0,
      totalIncome: 0,
      totalSpending: 0,
      uncategorizedCount: 0,
    });
  });
});
