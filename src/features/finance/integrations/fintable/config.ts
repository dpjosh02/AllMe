export function getFintableSheetConfig() {
  const config = {
    apiKey: process.env.GOOGLE_SHEETS_API_KEY,
    credentialsFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    spreadsheetId: process.env.FINTABLE_SPREADSHEET_ID,
    accountsRange: process.env.FINTABLE_ACCOUNTS_RANGE ?? "Accounts!A:H",
    transactionsRange: process.env.FINTABLE_TRANSACTIONS_RANGE ?? "Transactions!A:H",
  };

  const missingEnv: string[] = [];

  if (!config.spreadsheetId) {
    missingEnv.push("FINTABLE_SPREADSHEET_ID");
  }

  if (!config.credentialsFile && !config.apiKey) {
    missingEnv.push("GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_SHEETS_API_KEY");
  }

  if (missingEnv.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnv.join(", ")}`);
  }

  if (!config.spreadsheetId) {
    throw new Error("Missing Fintable spreadsheet id after validation");
  }

  return {
    apiKey: config.apiKey,
    credentialsFile: config.credentialsFile,
    spreadsheetId: config.spreadsheetId,
    accountsRange: config.accountsRange,
    transactionsRange: config.transactionsRange,
  };
}
