import { createHash } from "node:crypto";

import {
  FINTABLE_ACCOUNT_HEADERS,
  FINTABLE_PROVIDER,
  FINTABLE_TRANSACTION_HEADERS,
  REQUIRED_FINTABLE_ACCOUNT_HEADERS,
  REQUIRED_FINTABLE_TRANSACTION_HEADERS,
} from "@/features/finance/integrations/fintable/headers";

export type FintableSheetRow = Record<string, unknown>;

export type ParsedFintableAccount = {
  sourceAccountId: string;
  name: string;
  institutionName: string;
  balance: string;
  currency: string;
  notes: string | null;
  lastUpdate: string;
  rawData: Record<string, unknown>;
  rowHash: string;
};

export type ParsedFintableTransaction = {
  transactionId: string;
  sourceFingerprint: string;
  postedDate: string;
  amount: string;
  description: string;
  category: string | null;
  accountName: string;
  attachment: string | null;
  rawData: Record<string, unknown>;
  rowHash: string;
};

export function getMissingHeaders(
  headers: readonly string[],
  requiredHeaders: readonly string[],
) {
  const headerSet = new Set(headers);
  return requiredHeaders.filter((header) => !headerSet.has(header));
}

export function getMissingFintableAccountHeaders(headers: readonly string[]) {
  return getMissingHeaders(headers, REQUIRED_FINTABLE_ACCOUNT_HEADERS);
}

export function getMissingFintableTransactionHeaders(headers: readonly string[]) {
  return getMissingHeaders(headers, REQUIRED_FINTABLE_TRANSACTION_HEADERS);
}

export function parseFintableAccountRow(row: FintableSheetRow): ParsedFintableAccount {
  const name = requiredString(row, FINTABLE_ACCOUNT_HEADERS.accountName);
  const sourceAccountId = requiredString(row, FINTABLE_ACCOUNT_HEADERS.accountId);
  const institutionName = requiredString(row, FINTABLE_ACCOUNT_HEADERS.institution);
  const currency = requiredString(row, FINTABLE_ACCOUNT_HEADERS.currency).toUpperCase();

  return {
    sourceAccountId,
    name,
    institutionName,
    balance: parseMoney(row[FINTABLE_ACCOUNT_HEADERS.balance]),
    currency,
    notes: optionalString(row, FINTABLE_ACCOUNT_HEADERS.notes),
    lastUpdate: parseDateLike(row[FINTABLE_ACCOUNT_HEADERS.lastUpdate]),
    rawData: parseRawData(row[FINTABLE_ACCOUNT_HEADERS.rawData]),
    rowHash: hashStableValue({
      provider: FINTABLE_PROVIDER,
      sheet: "accounts",
      sourceAccountId,
      row,
    }),
  };
}

export function parseFintableTransactionRow(
  row: FintableSheetRow,
): ParsedFintableTransaction {
  const transactionId = requiredString(row, FINTABLE_TRANSACTION_HEADERS.transactionId);
  const accountName = requiredString(row, FINTABLE_TRANSACTION_HEADERS.account);
  const postedDate = parseDateOnly(row[FINTABLE_TRANSACTION_HEADERS.date]);
  const amount = parseMoney(row[FINTABLE_TRANSACTION_HEADERS.amount]);
  const description = requiredString(row, FINTABLE_TRANSACTION_HEADERS.description);

  return {
    transactionId,
    sourceFingerprint: buildTransactionFingerprint({
      transactionId,
      accountName,
      postedDate,
      amount,
    }),
    postedDate,
    amount,
    description,
    category: optionalString(row, FINTABLE_TRANSACTION_HEADERS.category),
    accountName,
    attachment: optionalString(row, FINTABLE_TRANSACTION_HEADERS.attachment),
    rawData: parseRawData(row[FINTABLE_TRANSACTION_HEADERS.rawData]),
    rowHash: hashStableValue({
      provider: FINTABLE_PROVIDER,
      sheet: "transactions",
      transactionId,
      row,
    }),
  };
}

export function buildTransactionFingerprint(input: {
  transactionId: string;
  accountName: string;
  postedDate: string;
  amount: string;
}) {
  return hashStableValue({
    provider: FINTABLE_PROVIDER,
    transactionId: input.transactionId,
    accountName: input.accountName,
    postedDate: input.postedDate,
    amount: input.amount,
  });
}

function requiredString(row: FintableSheetRow, header: string) {
  const value = row[header];
  const parsed = stringifyCell(value);

  if (!parsed) {
    throw new Error(`Missing required Fintable value: ${header}`);
  }

  return parsed;
}

function optionalString(row: FintableSheetRow, header: string) {
  const value = stringifyCell(row[header]);
  return value.length > 0 ? value : null;
}

function stringifyCell(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value).trim();
}

function parseMoney(value: unknown) {
  if (typeof value === "number") {
    return value.toFixed(2);
  }

  const raw = stringifyCell(value);
  if (!raw) {
    throw new Error("Missing money value");
  }

  const isParenthesizedNegative = raw.startsWith("(") && raw.endsWith(")");
  const normalized = raw.replace(/[$,\s()]/g, "");
  const amount = Number(normalized);

  if (!Number.isFinite(amount)) {
    throw new Error(`Invalid money value: ${raw}`);
  }

  return (isParenthesizedNegative ? -amount : amount).toFixed(2);
}

function parseDateOnly(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const raw = stringifyCell(value);
  const isoDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`;
  }

  const usDate = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usDate) {
    return `${usDate[3]}-${usDate[1].padStart(2, "0")}-${usDate[2].padStart(2, "0")}`;
  }

  const timestamp = Date.parse(raw);
  if (Number.isNaN(timestamp)) {
    throw new Error(`Invalid date value: ${raw}`);
  }

  return new Date(timestamp).toISOString().slice(0, 10);
}

function parseDateLike(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const raw = stringifyCell(value);
  const timestamp = Date.parse(raw);

  if (Number.isNaN(timestamp)) {
    throw new Error(`Invalid date/time value: ${raw}`);
  }

  return new Date(timestamp).toISOString();
}

function parseRawData(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  const raw = stringifyCell(value);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : { value: parsed };
  } catch {
    return { value: raw };
  }
}

function hashStableValue(value: unknown) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}
