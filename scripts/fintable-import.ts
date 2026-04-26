import { eq } from "drizzle-orm";

import { importFintableSnapshot } from "@/features/finance/imports/fintable/importer";
import { readFintableGoogleSheetsSnapshot } from "@/features/finance/integrations/fintable/google-sheets";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { getFintableSheetConfig } from "@/../scripts/fintable-env";

const userEmail = process.env.ALLME_IMPORT_USER_EMAIL;

if (!userEmail) {
  console.error("Missing required environment variable: ALLME_IMPORT_USER_EMAIL");
  process.exit(1);
}

const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, userEmail));

if (!user) {
  console.error(`No AllMe user found for ALLME_IMPORT_USER_EMAIL=${userEmail}`);
  process.exit(1);
}

const config = getFintableSheetConfig();
const snapshot = await readFintableGoogleSheetsSnapshot({
  apiKey: config.apiKey,
  credentialsFile: config.credentialsFile,
  spreadsheetId: config.spreadsheetId,
  accountsRange: config.accountsRange,
  transactionsRange: config.transactionsRange,
});

const result = await importFintableSnapshot({
  db,
  userId: user.id,
  snapshot,
});

console.info("Fintable import succeeded.");
console.info(`Import run: ${result.importRunId}`);
console.info(`Accounts upserted: ${result.accounts}`);
console.info(`Balance snapshots upserted: ${result.balances}`);
console.info(`Transactions upserted: ${result.transactions}`);
console.info(`Raw records upserted: ${result.rawRecords}`);
console.info(`Unmatched transactions skipped: ${result.unmatchedTransactions}`);
