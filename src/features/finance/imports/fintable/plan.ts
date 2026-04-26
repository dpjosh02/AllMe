import type {
  ParsedFintableAccount,
  ParsedFintableTransaction,
} from "@/features/finance/integrations/fintable/parser";

export type FintableImportSnapshot = {
  accounts: ParsedFintableAccount[];
  transactions: ParsedFintableTransaction[];
};

export type FintableRawRecordCandidate = {
  provider: "fintable";
  sourceName: "accounts" | "transactions";
  rowHash: string;
  payload: Record<string, unknown>;
};

export type FintableAccountCandidate = {
  sourceAccountId: string;
  name: string;
  institutionName: string;
  type: "unknown";
  currency: string;
};

export type FintableBalanceCandidate = {
  sourceAccountId: string;
  snapshotDate: string;
  balance: string;
  currency: string;
  rowHash: string;
};

export type FintableTransactionCandidate = {
  sourceFingerprint: string;
  sourceAccountName: string;
  postedDate: string;
  amount: string;
  currency: string;
  description: string;
  category: string | null;
  sourceType: "fintable_google_sheets";
  rowHash: string;
};

export type FintableImportPlan = {
  rawRecords: FintableRawRecordCandidate[];
  accounts: FintableAccountCandidate[];
  balances: FintableBalanceCandidate[];
  transactions: FintableTransactionCandidate[];
  unmatchedTransactions: FintableTransactionCandidate[];
};

export function createFintableImportPlan(
  snapshot: FintableImportSnapshot,
): FintableImportPlan {
  const accounts = dedupeBy(
    snapshot.accounts.map((account) => ({
      sourceAccountId: account.sourceAccountId,
      name: account.name,
      institutionName: account.institutionName,
      type: "unknown" as const,
      currency: account.currency,
    })),
    (account) => account.sourceAccountId,
  );

  const accountNames = new Set(accounts.map((account) => account.name));
  const balances = dedupeBy(
    snapshot.accounts.map((account) => ({
      sourceAccountId: account.sourceAccountId,
      snapshotDate: account.lastUpdate.slice(0, 10),
      balance: account.balance,
      currency: account.currency,
      rowHash: account.rowHash,
    })),
    (balance) => `${balance.sourceAccountId}:${balance.snapshotDate}`,
  );

  const transactions = dedupeBy(
    snapshot.transactions.map((transaction) => ({
      sourceFingerprint: transaction.sourceFingerprint,
      sourceAccountName: transaction.accountName,
      postedDate: transaction.postedDate,
      amount: transaction.amount,
      currency: "USD",
      description: transaction.description,
      category: transaction.category,
      sourceType: "fintable_google_sheets" as const,
      rowHash: transaction.rowHash,
    })),
    (transaction) => transaction.sourceFingerprint,
  );

  return {
    rawRecords: [
      ...snapshot.accounts.map((account) => ({
        provider: "fintable" as const,
        sourceName: "accounts" as const,
        rowHash: account.rowHash,
        payload: account.rawData,
      })),
      ...snapshot.transactions.map((transaction) => ({
        provider: "fintable" as const,
        sourceName: "transactions" as const,
        rowHash: transaction.rowHash,
        payload: transaction.rawData,
      })),
    ],
    accounts,
    balances,
    transactions: transactions.filter((transaction) =>
      accountNames.has(transaction.sourceAccountName),
    ),
    unmatchedTransactions: transactions.filter(
      (transaction) => !accountNames.has(transaction.sourceAccountName),
    ),
  };
}

function dedupeBy<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();
  const deduped: T[] = [];

  for (const item of items) {
    const key = getKey(item);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}
