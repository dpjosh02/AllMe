import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const callLog = vi.hoisted(() => [] as string[]);

vi.mock("@/features/finance/categorization/service", () => ({
  categorizeFinanceTransactions: vi.fn(async () => {
    callLog.push("categorize:start");
    await Promise.resolve();
    callLog.push("categorize:end");
    return {
      ruleAssigned: 7,
      uncategorized: 2,
    };
  }),
}));

vi.mock("@/features/finance/imports/fintable/lifecycle", () => ({
  createImportRun: vi.fn(async () => {
    callLog.push("import-run:start");
    await Promise.resolve();
    callLog.push("import-run:end");
    return { id: "import-run-1" };
  }),
  markImportRunFailed: vi.fn(async () => {
    callLog.push("failed:start");
    await Promise.resolve();
    callLog.push("failed:end");
  }),
  markImportRunSucceeded: vi.fn(async () => {
    callLog.push("success:start");
    await Promise.resolve();
    callLog.push("success:end");
  }),
  upsertFintableConnection: vi.fn(async () => {
    callLog.push("connection:start");
    await Promise.resolve();
    callLog.push("connection:end");
    return { id: "connection-1" };
  }),
}));

vi.mock("@/features/finance/imports/fintable/accounts", () => ({
  upsertAccounts: vi.fn(async () => {
    callLog.push("accounts:start");
    await Promise.resolve();
    callLog.push("accounts:end");
    return {
      byName: new Map([["Checking", "account-1"]]),
      bySourceId: new Map([["source-account-1", "account-1"]]),
    };
  }),
}));

vi.mock("@/features/finance/imports/fintable/records", () => ({
  upsertBalanceSnapshots: vi.fn(async () => {
    callLog.push("balances:start");
    await Promise.resolve();
    callLog.push("balances:end");
  }),
  upsertRawRecords: vi.fn(async () => {
    callLog.push("raw-records:start");
    await Promise.resolve();
    callLog.push("raw-records:end");
    return new Map([["account-row", "raw-record-1"]]);
  }),
  upsertTransactions: vi.fn(async () => {
    callLog.push("transactions:start");
    await Promise.resolve();
    callLog.push("transactions:end");
  }),
}));

describe("Fintable importer orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callLog.length = 0;
  });

  it("preserves sequential import flow and categorizes after success", async () => {
    const { importFintableSnapshot } =
      await import("@/features/finance/imports/fintable/importer");

    const result = await importFintableSnapshot({
      db: {} as Parameters<typeof importFintableSnapshot>[0]["db"],
      userId: "user-1",
      snapshot: {
        accounts: [
          {
            balance: "100.00",
            currency: "USD",
            institutionName: "Test Bank",
            lastUpdate: "2026-04-30T00:00:00.000Z",
            name: "Checking",
            notes: null,
            rawData: { id: "source-account-1" },
            rowHash: "account-row",
            sourceAccountId: "source-account-1",
          },
        ],
        transactions: [
          {
            accountName: "Checking",
            amount: "-12.50",
            attachment: null,
            category: "Food",
            description: "Cafe",
            postedDate: "2026-04-30",
            rawData: { description: "Cafe" },
            rowHash: "transaction-row",
            sourceFingerprint: "transaction-fingerprint",
            transactionId: "transaction-1",
          },
        ],
      },
    });

    expect(callLog).toEqual([
      "connection:start",
      "connection:end",
      "import-run:start",
      "import-run:end",
      "raw-records:start",
      "raw-records:end",
      "accounts:start",
      "accounts:end",
      "balances:start",
      "balances:end",
      "transactions:start",
      "transactions:end",
      "success:start",
      "success:end",
      "categorize:start",
      "categorize:end",
    ]);
    expect(result).toMatchObject({
      importRunId: "import-run-1",
      accounts: 1,
      balances: 1,
      transactions: 1,
      rawRecords: 2,
      unmatchedTransactions: 0,
      categorizedTransactions: 7,
      uncategorizedTransactions: 2,
    });
  });

  it("marks the import run failed and rethrows when persistence fails", async () => {
    const [
      { categorizeFinanceTransactions },
      lifecycle,
      records,
      { importFintableSnapshot },
    ] = await Promise.all([
      import("@/features/finance/categorization/service"),
      import("@/features/finance/imports/fintable/lifecycle"),
      import("@/features/finance/imports/fintable/records"),
      import("@/features/finance/imports/fintable/importer"),
    ]);
    const failure = new Error("transaction persistence failed");

    vi.mocked(records.upsertTransactions).mockImplementationOnce(async () => {
      callLog.push("transactions:start");
      await Promise.resolve();
      throw failure;
    });

    await expect(
      importFintableSnapshot({
        db: {} as Parameters<typeof importFintableSnapshot>[0]["db"],
        userId: "user-1",
        snapshot: {
          accounts: [
            {
              balance: "100.00",
              currency: "USD",
              institutionName: "Test Bank",
              lastUpdate: "2026-04-30T00:00:00.000Z",
              name: "Checking",
              notes: null,
              rawData: { id: "source-account-1" },
              rowHash: "account-row",
              sourceAccountId: "source-account-1",
            },
          ],
          transactions: [
            {
              accountName: "Checking",
              amount: "-12.50",
              attachment: null,
              category: "Food",
              description: "Cafe",
              postedDate: "2026-04-30",
              rawData: { description: "Cafe" },
              rowHash: "transaction-row",
              sourceFingerprint: "transaction-fingerprint",
              transactionId: "transaction-1",
            },
          ],
        },
      }),
    ).rejects.toThrow(failure);

    expect(lifecycle.markImportRunFailed).toHaveBeenCalledTimes(1);
    expect(lifecycle.markImportRunSucceeded).not.toHaveBeenCalled();
    expect(categorizeFinanceTransactions).not.toHaveBeenCalled();
    expect(callLog).toEqual([
      "connection:start",
      "connection:end",
      "import-run:start",
      "import-run:end",
      "raw-records:start",
      "raw-records:end",
      "accounts:start",
      "accounts:end",
      "balances:start",
      "balances:end",
      "transactions:start",
      "failed:start",
      "failed:end",
    ]);
  });
});

describe("Fintable importer persistence invariants", () => {
  const importsRoot = join(
    process.cwd(),
    "src/features/finance/imports/fintable",
  );

  function readImportFile(name: string) {
    return readFileSync(join(importsRoot, name), "utf8");
  }

  it("preserves account conflict targets", () => {
    const source = readImportFile("accounts.ts");

    expect(source).toContain(
      "target: [financeAccounts.userId, financeAccounts.sourceAccountId]",
    );
  });

  it("preserves raw record, balance, and transaction conflict targets", () => {
    const source = readImportFile("records.ts");

    expect(source).toContain("financeRawRecords.userId");
    expect(source).toContain("financeRawRecords.provider");
    expect(source).toContain("financeRawRecords.rowHash");
    expect(source).toContain("financeBalanceSnapshots.accountId");
    expect(source).toContain("financeBalanceSnapshots.snapshotDate");
    expect(source).toContain("financeTransactions.userId");
    expect(source).toContain("financeTransactions.sourceFingerprint");
  });

  it("preserves import-run lifecycle writes", () => {
    const source = readImportFile("lifecycle.ts");

    expect(source).toContain('status: "running"');
    expect(source).toContain('status: "succeeded"');
    expect(source).toContain('status: "failed"');
    expect(source).toContain("rowsInserted:");
    expect(source).toContain("rowsSkipped:");
  });
});
