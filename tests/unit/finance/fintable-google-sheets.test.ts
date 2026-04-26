import { describe, expect, it, vi } from "vitest";

import {
  FINTABLE_ACCOUNT_HEADERS,
  FINTABLE_TRANSACTION_HEADERS,
} from "@/features/finance/integrations/fintable/headers";
import {
  parseFintableAccountValues,
  parseFintableTransactionValues,
  readFintableGoogleSheetsSnapshot,
  sheetValuesToRows,
} from "@/features/finance/integrations/fintable/google-sheets";

describe("Fintable Google Sheets reader", () => {
  it("converts sheet values into row objects", () => {
    expect(
      sheetValuesToRows([
        ["Name", "Amount"],
        ["Example", "12.34"],
      ]),
    ).toEqual({
      headers: ["Name", "Amount"],
      rows: [{ Name: "Example", Amount: "12.34" }],
    });
  });

  it("parses account sheet values", () => {
    const accounts = parseFintableAccountValues([
      Object.values(FINTABLE_ACCOUNT_HEADERS),
      [
        "Example Brokerage",
        "2500.00",
        "USD",
        "",
        "2026-04-25T10:30:00Z",
        "Example Institution",
        "acct_fake",
        "{}",
      ],
    ]);

    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({
      sourceAccountId: "acct_fake",
      name: "Example Brokerage",
      balance: "2500.00",
      currency: "USD",
    });
  });

  it("parses transaction sheet values", () => {
    const transactions = parseFintableTransactionValues([
      Object.values(FINTABLE_TRANSACTION_HEADERS),
      [
        "2026-04-25",
        "-15.25",
        "Example Coffee",
        "Food and Drink",
        "Example Credit Card",
        "",
        "txn_fake",
        "{}",
      ],
    ]);

    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      transactionId: "txn_fake",
      postedDate: "2026-04-25",
      amount: "-15.25",
      description: "Example Coffee",
      accountName: "Example Credit Card",
    });
  });

  it("fetches accounts and transactions from configured Google Sheets ranges", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            values: [
              Object.values(FINTABLE_ACCOUNT_HEADERS),
              [
                "Example Checking",
                "100.00",
                "USD",
                "",
                "2026-04-25T10:30:00Z",
                "Example Bank",
                "acct_fake",
                "{}",
              ],
            ],
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            values: [
              Object.values(FINTABLE_TRANSACTION_HEADERS),
              [
                "2026-04-25",
                "-10.00",
                "Example Store",
                "Shopping",
                "Example Checking",
                "",
                "txn_fake",
                "{}",
              ],
            ],
          }),
        ),
      );

    const snapshot = await readFintableGoogleSheetsSnapshot({
      apiKey: "fake-api-key",
      spreadsheetId: "fake-spreadsheet-id",
      accountsRange: "Accounts!A:H",
      transactionsRange: "Transactions!A:H",
      fetcher,
    });

    expect(snapshot.accounts).toHaveLength(1);
    expect(snapshot.transactions).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(String(fetcher.mock.calls[0]?.[0])).toContain("Accounts!A%3AH");
    expect(String(fetcher.mock.calls[1]?.[0])).toContain("Transactions!A%3AH");
  });

  it("requires either an API key or service account credentials", async () => {
    await expect(
      readFintableGoogleSheetsSnapshot({
        spreadsheetId: "fake-spreadsheet-id",
        accountsRange: "Accounts!A:H",
        transactionsRange: "Transactions!A:H",
        fetcher: vi.fn<typeof fetch>(),
      }),
    ).rejects.toThrow("Missing Google Sheets credentials");
  });
});
