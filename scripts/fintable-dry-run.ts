import nextEnv from "@next/env";

import { readFintableGoogleSheetsSnapshot } from "@/features/finance/integrations/fintable/google-sheets";

nextEnv.loadEnvConfig(process.cwd());

const requiredEnv = {
  GOOGLE_SHEETS_API_KEY: process.env.GOOGLE_SHEETS_API_KEY,
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  FINTABLE_SPREADSHEET_ID: process.env.FINTABLE_SPREADSHEET_ID,
  FINTABLE_ACCOUNTS_RANGE: process.env.FINTABLE_ACCOUNTS_RANGE ?? "Accounts!A:H",
  FINTABLE_TRANSACTIONS_RANGE:
    process.env.FINTABLE_TRANSACTIONS_RANGE ?? "Transactions!A:H",
};

const missingEnv = Object.entries(requiredEnv)
  .filter(([key, value]) => {
    if (key === "GOOGLE_SHEETS_API_KEY") {
      return false;
    }

    if (key === "GOOGLE_APPLICATION_CREDENTIALS") {
      return false;
    }

    return !value;
  })
  .map(([key]) => key);

const hasGoogleCredential =
  Boolean(requiredEnv.GOOGLE_APPLICATION_CREDENTIALS) ||
  Boolean(requiredEnv.GOOGLE_SHEETS_API_KEY);

if (!hasGoogleCredential) {
  missingEnv.push("GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_SHEETS_API_KEY");
}

if (missingEnv.length > 0) {
  console.error(`Missing required environment variables: ${missingEnv.join(", ")}`);
  process.exit(1);
}

const apiKey = requiredEnv.GOOGLE_SHEETS_API_KEY;
const credentialsFile = requiredEnv.GOOGLE_APPLICATION_CREDENTIALS;
const spreadsheetId = requiredEnv.FINTABLE_SPREADSHEET_ID;

if ((!apiKey && !credentialsFile) || !spreadsheetId) {
  throw new Error("Missing Fintable dry-run configuration after validation");
}

const snapshot = await readFintableGoogleSheetsSnapshot({
  apiKey,
  credentialsFile,
  spreadsheetId,
  accountsRange: requiredEnv.FINTABLE_ACCOUNTS_RANGE,
  transactionsRange: requiredEnv.FINTABLE_TRANSACTIONS_RANGE,
});

console.info("Fintable dry run succeeded.");
console.info(`Accounts parsed: ${snapshot.accounts.length}`);
console.info(`Transactions parsed: ${snapshot.transactions.length}`);
