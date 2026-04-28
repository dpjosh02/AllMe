import { eq } from "drizzle-orm";

import { serverEnv } from "@/lib/env";
import { db } from "@/server/db";
import { userSettings, users } from "@/server/db/schema";

export const timezoneOptions = [
  "America/Chicago",
  "America/New_York",
  "America/Denver",
  "America/Los_Angeles",
  "UTC",
] as const;

export const currencyOptions = ["USD", "EUR", "GBP", "CAD"] as const;

export type SettingsPageData = Awaited<ReturnType<typeof getSettingsPageData>>;

export async function getSettingsPageData() {
  const ownerEmail = serverEnv.ALLME_IMPORT_USER_EMAIL ?? null;
  const owner = ownerEmail ? await getOwnerByEmail(ownerEmail) : null;

  if (owner) {
    await db
      .insert(userSettings)
      .values({
        userId: owner.id,
      })
      .onConflictDoNothing();
  }

  const [settings] = owner
    ? await db
        .select({
          preferredCurrency: userSettings.preferredCurrency,
          timezone: userSettings.timezone,
          updatedAt: userSettings.updatedAt,
        })
        .from(userSettings)
        .where(eq(userSettings.userId, owner.id))
        .limit(1)
    : [];

  return {
    auth: getAuthStatus(),
    fintable: getFintableStatus(),
    owner: {
      email: owner?.email ?? ownerEmail,
      emailConfigured: Boolean(ownerEmail),
      exists: Boolean(owner),
      name: owner?.name ?? null,
    },
    settings: settings ?? null,
  };
}

export async function getOwnerByEmail(email: string) {
  const [owner] = await db
    .select({
      email: users.email,
      id: users.id,
      name: users.name,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return owner ?? null;
}

function getAuthStatus() {
  const googleProviderConfigured = Boolean(
    serverEnv.AUTH_GOOGLE_ID && serverEnv.AUTH_GOOGLE_SECRET,
  );

  return {
    authSecretConfigured: Boolean(serverEnv.AUTH_SECRET),
    googleProviderConfigured,
    status: googleProviderConfigured ? "Configured" : "Local owner mode",
  };
}

function getFintableStatus() {
  const hasSpreadsheet = Boolean(serverEnv.FINTABLE_SPREADSHEET_ID);
  const hasGoogleAccess = Boolean(
    serverEnv.GOOGLE_APPLICATION_CREDENTIALS || serverEnv.GOOGLE_SHEETS_API_KEY,
  );
  const accessMode = serverEnv.GOOGLE_APPLICATION_CREDENTIALS
    ? "Service account"
    : serverEnv.GOOGLE_SHEETS_API_KEY
      ? "API key"
      : "Missing";

  return {
    accessMode,
    accountsRange: serverEnv.FINTABLE_ACCOUNTS_RANGE ?? "Accounts!A:H",
    hasGoogleAccess,
    hasSpreadsheet,
    ready: hasSpreadsheet && hasGoogleAccess,
    transactionsRange:
      serverEnv.FINTABLE_TRANSACTIONS_RANGE ?? "Transactions!A:H",
  };
}
