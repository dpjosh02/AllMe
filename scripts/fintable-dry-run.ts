import { readFintableGoogleSheetsSnapshot } from "@/features/finance/integrations/fintable/google-sheets";

const requiredEnv = {
  GOOGLE_SHEETS_API_KEY: process.env.GOOGLE_SHEETS_API_KEY,
  FINTABLE_SPREADSHEET_ID: process.env.FINTABLE_SPREADSHEET_ID,
  FINTABLE_ACCOUNTS_RANGE: process.env.FINTABLE_ACCOUNTS_RANGE ?? "Accounts!A:H",
  FINTABLE_TRANSACTIONS_RANGE:
    process.env.FINTABLE_TRANSACTIONS_RANGE ?? "Transactions!A:H",
};

const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingEnv.length > 0) {
  console.error(`Missing required environment variables: ${missingEnv.join(", ")}`);
  process.exit(1);
}

const apiKey = requiredEnv.GOOGLE_SHEETS_API_KEY;
const spreadsheetId = requiredEnv.FINTABLE_SPREADSHEET_ID;

if (!apiKey || !spreadsheetId) {
  throw new Error("Missing Fintable dry-run configuration after validation");
}

const snapshot = await readFintableGoogleSheetsSnapshot({
  apiKey,
  spreadsheetId,
  accountsRange: requiredEnv.FINTABLE_ACCOUNTS_RANGE,
  transactionsRange: requiredEnv.FINTABLE_TRANSACTIONS_RANGE,
});

console.info("Fintable dry run succeeded.");
console.info(`Accounts parsed: ${snapshot.accounts.length}`);
console.info(`Transactions parsed: ${snapshot.transactions.length}`);
