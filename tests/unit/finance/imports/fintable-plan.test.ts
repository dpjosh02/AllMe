import { describe, expect, it } from "vitest";

import { createFintableImportPlan } from "@/features/finance/imports/fintable/plan";
import type {
  ParsedFintableAccount,
  ParsedFintableTransaction,
} from "@/features/finance/integrations/fintable/parser";

const account = {
  sourceAccountId: "acct_checking",
  name: "Example Checking",
  institutionName: "Example Bank",
  balance: "1000.00",
  currency: "USD",
  notes: null,
  lastUpdate: "2026-04-25T10:30:00.000Z",
  rawData: { source: "account" },
  rowHash: "account-row-hash",
} satisfies ParsedFintableAccount;

const transaction = {
  transactionId: "txn_1",
  sourceFingerprint: "transaction-fingerprint",
  postedDate: "2026-04-25",
  amount: "-12.50",
  description: "Example Merchant",
  category: "Shopping",
  accountName: "Example Checking",
  attachment: null,
  rawData: { source: "transaction" },
  rowHash: "transaction-row-hash",
} satisfies ParsedFintableTransaction;

describe("createFintableImportPlan", () => {
  it("creates raw, account, balance, and transaction candidates", () => {
    const plan = createFintableImportPlan({
      accounts: [account],
      transactions: [transaction],
    });

    expect(plan.rawRecords).toEqual([
      {
        provider: "fintable",
        sourceName: "accounts",
        rowHash: "account-row-hash",
        payload: { source: "account" },
      },
      {
        provider: "fintable",
        sourceName: "transactions",
        rowHash: "transaction-row-hash",
        payload: { source: "transaction" },
      },
    ]);
    expect(plan.accounts).toEqual([
      {
        sourceAccountId: "acct_checking",
        name: "Example Checking",
        institutionName: "Example Bank",
        type: "unknown",
        currency: "USD",
      },
    ]);
    expect(plan.balances).toEqual([
      {
        sourceAccountId: "acct_checking",
        snapshotDate: "2026-04-25",
        balance: "1000.00",
        currency: "USD",
        rowHash: "account-row-hash",
      },
    ]);
    expect(plan.transactions).toEqual([
      {
        sourceFingerprint: "transaction-fingerprint",
        sourceAccountName: "Example Checking",
        postedDate: "2026-04-25",
        amount: "-12.50",
        currency: "USD",
        description: "Example Merchant",
        category: "Shopping",
        sourceType: "fintable_google_sheets",
        rowHash: "transaction-row-hash",
      },
    ]);
    expect(plan.unmatchedTransactions).toEqual([]);
  });

  it("separates transactions that do not match a parsed account name", () => {
    const plan = createFintableImportPlan({
      accounts: [account],
      transactions: [
        {
          ...transaction,
          sourceFingerprint: "unmatched-fingerprint",
          accountName: "Unknown Account",
        },
      ],
    });

    expect(plan.transactions).toEqual([]);
    expect(plan.unmatchedTransactions).toHaveLength(1);
    expect(plan.unmatchedTransactions[0]?.sourceAccountName).toBe("Unknown Account");
  });

  it("deduplicates candidates by stable source keys", () => {
    const plan = createFintableImportPlan({
      accounts: [account, account],
      transactions: [transaction, transaction],
    });

    expect(plan.accounts).toHaveLength(1);
    expect(plan.balances).toHaveLength(1);
    expect(plan.transactions).toHaveLength(1);
  });
});
