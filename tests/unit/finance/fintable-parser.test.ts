import { describe, expect, it } from "vitest";

import {
  FINTABLE_ACCOUNT_HEADERS,
  FINTABLE_TRANSACTION_HEADERS,
} from "@/features/finance/integrations/fintable/headers";
import {
  getMissingFintableAccountHeaders,
  getMissingFintableTransactionHeaders,
  parseFintableAccountRow,
  parseFintableTransactionRow,
} from "@/features/finance/integrations/fintable/parser";

describe("Fintable parser", () => {
  it("validates the accounts sheet headers", () => {
    expect(
      getMissingFintableAccountHeaders(Object.values(FINTABLE_ACCOUNT_HEADERS)),
    ).toEqual([]);
  });

  it("validates the transactions sheet headers", () => {
    expect(
      getMissingFintableTransactionHeaders(Object.values(FINTABLE_TRANSACTION_HEADERS)),
    ).toEqual([]);
  });

  it("parses an account row without personal data", () => {
    const account = parseFintableAccountRow({
      [FINTABLE_ACCOUNT_HEADERS.accountName]: "Example Checking",
      [FINTABLE_ACCOUNT_HEADERS.balance]: "$1,234.56",
      [FINTABLE_ACCOUNT_HEADERS.currency]: "usd",
      [FINTABLE_ACCOUNT_HEADERS.notes]: "Primary cash account",
      [FINTABLE_ACCOUNT_HEADERS.lastUpdate]: "2026-04-25T10:30:00Z",
      [FINTABLE_ACCOUNT_HEADERS.institution]: "Example Bank",
      [FINTABLE_ACCOUNT_HEADERS.accountId]: "acct_example_123",
      [FINTABLE_ACCOUNT_HEADERS.rawData]: '{"mask":"0000"}',
    });

    expect(account).toMatchObject({
      sourceAccountId: "acct_example_123",
      name: "Example Checking",
      institutionName: "Example Bank",
      balance: "1234.56",
      currency: "USD",
      notes: "Primary cash account",
      lastUpdate: "2026-04-25T10:30:00.000Z",
      rawData: { mask: "0000" },
    });
    expect(account.rowHash).toHaveLength(64);
  });

  it("parses a transaction row without personal data", () => {
    const transaction = parseFintableTransactionRow({
      [FINTABLE_TRANSACTION_HEADERS.date]: "4/25/2026",
      [FINTABLE_TRANSACTION_HEADERS.amount]: "($42.10)",
      [FINTABLE_TRANSACTION_HEADERS.description]: "Example Merchant",
      [FINTABLE_TRANSACTION_HEADERS.category]: "Shopping",
      [FINTABLE_TRANSACTION_HEADERS.account]: "Example Credit Card",
      [FINTABLE_TRANSACTION_HEADERS.attachment]: "",
      [FINTABLE_TRANSACTION_HEADERS.transactionId]: "txn_example_456",
      [FINTABLE_TRANSACTION_HEADERS.rawData]: '{"pending":false}',
    });

    expect(transaction).toMatchObject({
      transactionId: "txn_example_456",
      postedDate: "2026-04-25",
      amount: "-42.10",
      description: "Example Merchant",
      category: "Shopping",
      accountName: "Example Credit Card",
      attachment: null,
      rawData: { pending: false },
    });
    expect(transaction.sourceFingerprint).toHaveLength(64);
    expect(transaction.rowHash).toHaveLength(64);
  });
});
