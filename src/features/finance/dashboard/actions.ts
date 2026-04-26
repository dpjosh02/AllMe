"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { importFintableSnapshot } from "@/features/finance/imports/fintable/importer";
import { getFintableSheetConfig } from "@/features/finance/integrations/fintable/config";
import { readFintableGoogleSheetsSnapshot } from "@/features/finance/integrations/fintable/google-sheets";
import { db } from "@/server/db";
import { financeAccounts, financeTransactions, users } from "@/server/db/schema";

export async function renameFinanceAccount(formData: FormData) {
  const accountId = String(formData.get("accountId") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();

  if (!accountId) {
    throw new Error("Missing account id");
  }

  await db
    .update(financeAccounts)
    .set({
      displayName: displayName.length > 0 ? displayName : null,
      updatedAt: new Date(),
    })
    .where(eq(financeAccounts.id, accountId));

  revalidatePath("/finance");
  revalidatePath(`/finance/accounts/${accountId}`);
}

export async function deleteFinanceTransaction(formData: FormData) {
  const transactionId = String(formData.get("transactionId") ?? "");
  const accountId = String(formData.get("accountId") ?? "");

  if (!transactionId) {
    throw new Error("Missing transaction id");
  }

  await db
    .delete(financeTransactions)
    .where(eq(financeTransactions.id, transactionId));

  revalidatePath("/finance");

  if (accountId) {
    revalidatePath(`/finance/accounts/${accountId}`);
  }
}

export async function syncFintableNow() {
  const userEmail = process.env.ALLME_IMPORT_USER_EMAIL;

  if (!userEmail) {
    throw new Error("Missing required environment variable: ALLME_IMPORT_USER_EMAIL");
  }

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, userEmail));

  if (!user) {
    throw new Error(`No AllMe user found for ALLME_IMPORT_USER_EMAIL=${userEmail}`);
  }

  const config = getFintableSheetConfig();
  const snapshot = await readFintableGoogleSheetsSnapshot({
    apiKey: config.apiKey,
    credentialsFile: config.credentialsFile,
    spreadsheetId: config.spreadsheetId,
    accountsRange: config.accountsRange,
    transactionsRange: config.transactionsRange,
  });

  await importFintableSnapshot({
    db,
    userId: user.id,
    snapshot,
  });

  revalidatePath("/finance");
}
