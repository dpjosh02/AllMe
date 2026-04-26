import { GoogleAuth } from "google-auth-library";

import {
  FINTABLE_ACCOUNT_HEADERS,
  FINTABLE_TRANSACTION_HEADERS,
} from "@/features/finance/integrations/fintable/headers";
import {
  getMissingFintableAccountHeaders,
  getMissingFintableTransactionHeaders,
  parseFintableAccountRow,
  parseFintableTransactionRow,
  type FintableSheetRow,
  type ParsedFintableAccount,
  type ParsedFintableTransaction,
} from "@/features/finance/integrations/fintable/parser";

type GoogleSheetsValuesResponse = {
  range?: string;
  majorDimension?: string;
  values?: unknown[][];
};

export type FintableGoogleSheetsConfig = {
  apiKey?: string;
  credentialsFile?: string;
  spreadsheetId: string;
  accountsRange: string;
  transactionsRange: string;
  fetcher?: typeof fetch;
};

export type FintableGoogleSheetsSnapshot = {
  accounts: ParsedFintableAccount[];
  transactions: ParsedFintableTransaction[];
};

export async function readFintableGoogleSheetsSnapshot(
  config: FintableGoogleSheetsConfig,
): Promise<FintableGoogleSheetsSnapshot> {
  const [accountValues, transactionValues] = await Promise.all([
    fetchGoogleSheetValues(config, config.accountsRange),
    fetchGoogleSheetValues(config, config.transactionsRange),
  ]);

  return {
    accounts: parseFintableAccountValues(accountValues),
    transactions: parseFintableTransactionValues(transactionValues),
  };
}

export function parseFintableAccountValues(values: unknown[][]) {
  const { headers, rows } = sheetValuesToRows(values);
  const missingHeaders = getMissingFintableAccountHeaders(headers);

  if (missingHeaders.length > 0) {
    throw new Error(`Missing Fintable account headers: ${missingHeaders.join(", ")}`);
  }

  return rows
    .filter((row) => hasRequiredValue(row, FINTABLE_ACCOUNT_HEADERS.accountId))
    .map((row) => parseFintableAccountRow(row));
}

export function parseFintableTransactionValues(values: unknown[][]) {
  const { headers, rows } = sheetValuesToRows(values);
  const missingHeaders = getMissingFintableTransactionHeaders(headers);

  if (missingHeaders.length > 0) {
    throw new Error(`Missing Fintable transaction headers: ${missingHeaders.join(", ")}`);
  }

  return rows
    .filter((row) => hasRequiredValue(row, FINTABLE_TRANSACTION_HEADERS.transactionId))
    .map((row) => parseFintableTransactionRow(row));
}

export function sheetValuesToRows(values: unknown[][]): {
  headers: string[];
  rows: FintableSheetRow[];
} {
  const [headerRow, ...dataRows] = values;

  if (!headerRow) {
    throw new Error("Google Sheets response did not include a header row");
  }

  const headers = headerRow.map((header) => String(header ?? "").trim());
  const rows = dataRows
    .filter((row) => row.some((cell) => String(cell ?? "").trim().length > 0))
    .map((row) => {
      return headers.reduce<FintableSheetRow>((record, header, index) => {
        if (header) {
          record[header] = row[index] ?? "";
        }

        return record;
      }, {});
    });

  return { headers, rows };
}

async function fetchGoogleSheetValues(
  config: FintableGoogleSheetsConfig,
  range: string,
) {
  const fetcher = config.fetcher ?? fetch;
  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${encodeURIComponent(range)}`,
  );
  const headers = new Headers();

  if (config.credentialsFile) {
    headers.set("Authorization", `Bearer ${await getServiceAccountAccessToken(config)}`);
  } else if (config.apiKey) {
    url.searchParams.set("key", config.apiKey);
  } else {
    throw new Error(
      "Missing Google Sheets credentials. Set GOOGLE_APPLICATION_CREDENTIALS for private sheets or GOOGLE_SHEETS_API_KEY for public/readable sheets.",
    );
  }

  const response = await fetcher(url, { headers });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Google Sheets request failed with status ${response.status}: ${errorText}`,
    );
  }

  const body = (await response.json()) as GoogleSheetsValuesResponse;
  return body.values ?? [];
}

async function getServiceAccountAccessToken(config: FintableGoogleSheetsConfig) {
  const auth = new GoogleAuth({
    keyFile: config.credentialsFile,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();

  if (!tokenResponse.token) {
    throw new Error("Google service account did not return an access token");
  }

  return tokenResponse.token;
}

function hasRequiredValue(row: FintableSheetRow, header: string) {
  return String(row[header] ?? "").trim().length > 0;
}
