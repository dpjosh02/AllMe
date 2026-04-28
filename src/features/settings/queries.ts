import { desc, eq, sql } from "drizzle-orm";

import { serverEnv } from "@/lib/env";
import { resolveAuthBoundary } from "@/server/auth/access-control";
import { db } from "@/server/db";
import { financeImportRuns, userSettings, users } from "@/server/db/schema";

export const timezoneOptions = [
  "America/Chicago",
  "America/New_York",
  "America/Denver",
  "America/Los_Angeles",
  "UTC",
] as const;

export const currencyOptions = ["USD", "EUR", "GBP", "CAD"] as const;

export type SettingsPageData = Awaited<ReturnType<typeof getSettingsPageData>>;
export type SettingsStatusTone = "attention" | "neutral" | "ready";

export async function getSettingsPageData(userId: string) {
  const ownerEmail = serverEnv.ALLME_IMPORT_USER_EMAIL ?? null;
  const owner = await getUserById(userId);

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
    authBoundary: getAuthBoundaryStatus(Boolean(ownerEmail)),
    fintable: getFintableStatus(),
    importHealth: owner ? await getImportHealth(owner.id) : null,
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

export async function getUserById(userId: string) {
  const [user] = await db
    .select({
      email: users.email,
      id: users.id,
      name: users.name,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user ?? null;
}

function getAuthBoundaryStatus(ownerEmailConfigured: boolean) {
  return resolveAuthBoundary({
    authMode: serverEnv.ALLME_AUTH_MODE,
    authSecretConfigured: Boolean(serverEnv.AUTH_SECRET),
    googleProviderConfigured: Boolean(
      serverEnv.AUTH_GOOGLE_ID && serverEnv.AUTH_GOOGLE_SECRET,
    ),
    ownerEmailConfigured,
  });
}

function getAuthStatus() {
  const googleProviderConfigured = Boolean(
    serverEnv.AUTH_GOOGLE_ID && serverEnv.AUTH_GOOGLE_SECRET,
  );
  const authSecretConfigured = Boolean(serverEnv.AUTH_SECRET);
  const hostedAuthReady = googleProviderConfigured && authSecretConfigured;
  const authNeedsAttention = googleProviderConfigured && !authSecretConfigured;
  const tone: SettingsStatusTone = hostedAuthReady
    ? "ready"
    : authNeedsAttention
      ? "attention"
      : "neutral";

  return {
    authSecretConfigured,
    badgeLabel: hostedAuthReady
      ? "Ready"
      : authNeedsAttention
        ? "Needs attention"
        : "Owner mode",
    googleProviderConfigured,
    status: googleProviderConfigured ? "Google OAuth" : "Local owner mode",
    tone,
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
  const ready = hasSpreadsheet && hasGoogleAccess;
  const tone: SettingsStatusTone = ready ? "ready" : "attention";

  return {
    accessMode,
    accountsRange: serverEnv.FINTABLE_ACCOUNTS_RANGE ?? "Accounts!A:H",
    badgeLabel: ready ? "Ready" : "Needs setup",
    hasGoogleAccess,
    hasSpreadsheet,
    ready,
    tone,
    transactionsRange:
      serverEnv.FINTABLE_TRANSACTIONS_RANGE ?? "Transactions!A:H",
  };
}

async function getImportHealth(userId: string) {
  const runs = await db
    .select({
      createdAt: financeImportRuns.createdAt,
      finishedAt: financeImportRuns.finishedAt,
      hasErrorSummary: sql<boolean>`${financeImportRuns.errorSummary} is not null`,
      id: financeImportRuns.id,
      rowsInserted: financeImportRuns.rowsInserted,
      rowsScanned: financeImportRuns.rowsScanned,
      rowsSkipped: financeImportRuns.rowsSkipped,
      rowsUpdated: financeImportRuns.rowsUpdated,
      startedAt: financeImportRuns.startedAt,
      status: financeImportRuns.status,
    })
    .from(financeImportRuns)
    .where(eq(financeImportRuns.userId, userId))
    .orderBy(desc(financeImportRuns.createdAt))
    .limit(5);

  const latest = runs[0] ?? null;

  return {
    latest,
    recent: runs,
  };
}
