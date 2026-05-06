import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TodayFinanceSnapshotCard } from "@/features/today/components/today-finance-snapshot-card";

describe("TodayFinanceSnapshotCard", () => {
  it("renders a calm no-data state with only the Finance navigation link", () => {
    const html = renderToStaticMarkup(
      <TodayFinanceSnapshotCard
        snapshot={{
          hasFinanceData: false,
          incomeTotal: 0,
          latestBalanceSnapshotDate: null,
          latestImport: null,
          postedCount: 0,
          spendingTotal: 0,
          status: "no_data",
          uncategorizedCount: 0,
        }}
      />,
    );

    expect(html).toContain("No data");
    expect(html).toContain("No Finance data has been imported yet.");
    expect(html).toContain('href="/finance"');
    expect(html).not.toContain("Posted");
  });

  it("renders selected-day money facts without transaction details", () => {
    const html = renderToStaticMarkup(
      <TodayFinanceSnapshotCard
        snapshot={{
          hasFinanceData: true,
          incomeTotal: 1250,
          latestBalanceSnapshotDate: "2026-05-06",
          latestImport: null,
          postedCount: 2,
          spendingTotal: 84.32,
          status: "activity",
          uncategorizedCount: 0,
        }}
      />,
    );

    expect(html).toContain("Activity");
    expect(html).toContain("Posted");
    expect(html).toContain("Cash flow");
    expect(html).toContain("Income +$1,250.00");
    expect(html).toContain("Spending -$84.32");
    expect(html).toContain("0 need review");
    expect(html).toContain("Balance snapshot May 6");
  });

  it("renders the sanitized unavailable fallback", () => {
    const html = renderToStaticMarkup(
      <TodayFinanceSnapshotCard
        snapshot={{
          hasFinanceData: false,
          incomeTotal: 0,
          latestBalanceSnapshotDate: null,
          latestImport: null,
          postedCount: 0,
          spendingTotal: 0,
          status: "unavailable",
          uncategorizedCount: 0,
        }}
      />,
    );

    expect(html).toContain("Unavailable");
    expect(html).toContain("Finance snapshot is unavailable right now.");
  });
});
