import { desc, eq, sql } from "drizzle-orm";

import {
  getGoogleCalendarConnectionStatus,
  googleCalendarReadonlyScope,
} from "@/features/calendar/sync/connection";
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
type CalendarSettingsStatus = {
  accountEmail: string;
  badgeLabel: string;
  hasConnection: boolean;
  lastSyncedAt: Date | null;
  ready: boolean;
  scopeStatus: string;
  secretValues: string;
  status: string;
  tone: SettingsStatusTone;
  updatedAt: Date | null;
};

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

  const settingRows = owner
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
  const settings = settingRows.length > 0 ? settingRows[0] : null;

  return {
    auth: getAuthStatus(),
    authBoundary: getAuthBoundaryStatus(Boolean(ownerEmail)),
    calendar: owner ? await getCalendarStatus(owner.id) : getEmptyCalendarStatus(),
    fintable: getFintableStatus(),
    importHealth: owner ? await getImportHealth(owner.id) : null,
    owner: {
      email: owner?.email ?? ownerEmail,
      emailConfigured: Boolean(ownerEmail),
      exists: Boolean(owner),
      name: owner?.name ?? null,
    },
    settings,
  };
}

async function getCalendarStatus(userId: string): Promise<CalendarSettingsStatus> {
  const connection = await getGoogleCalendarConnectionStatus({ db, userId });

  if (!connection) {
    return getEmptyCalendarStatus();
  }

  const hasReadonlyScope = connection.scopes.includes(googleCalendarReadonlyScope);
  const ready = connection.status === "active" && hasReadonlyScope;
  const tone: SettingsStatusTone = ready ? "ready" : "attention";

  return {
    accountEmail: connection.accountEmail ?? "Hidden",
    badgeLabel: ready ? "Connected" : "Needs reauthorization",
    hasConnection: true,
    lastSyncedAt: connection.lastSyncedAt,
    ready,
    scopeStatus: hasReadonlyScope ? "Read-only granted" : "Scope missing",
    secretValues: "Hidden",
    status: connection.status,
    tone,
    updatedAt: connection.updatedAt,
  };
}

function getEmptyCalendarStatus(): CalendarSettingsStatus {
  return {
    accountEmail: "Not connected",
    badgeLabel: "Not connected",
    hasConnection: false,
    lastSyncedAt: null,
    ready: false,
    scopeStatus: "Not granted",
    secretValues: "Hidden",
    status: "not_connected",
    tone: "neutral" satisfies SettingsStatusTone,
    updatedAt: null,
  };
}

export async function getOwnerByEmail(email: string) {
  const owners = await db
    .select({
      email: users.email,
      id: users.id,
      name: users.name,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return owners.length > 0 ? owners[0] : null;
}

export async function getUserById(userId: string) {
  const userRows = await db
    .select({
      email: users.email,
      id: users.id,
      name: users.name,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return userRows.length > 0 ? userRows[0] : null;
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
