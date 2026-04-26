import { readFintableGoogleSheetsSnapshot } from "@/features/finance/integrations/fintable/google-sheets";
import { getFintableSheetConfig } from "@/../scripts/fintable-env";

const config = getFintableSheetConfig();

const snapshot = await readFintableGoogleSheetsSnapshot({
  apiKey: config.apiKey,
  credentialsFile: config.credentialsFile,
  spreadsheetId: config.spreadsheetId,
  accountsRange: config.accountsRange,
  transactionsRange: config.transactionsRange,
});

console.info("Fintable dry run succeeded.");
console.info(`Accounts parsed: ${snapshot.accounts.length}`);
console.info(`Transactions parsed: ${snapshot.transactions.length}`);
