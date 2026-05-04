import { and, eq } from "drizzle-orm";

import type { db as appDb } from "@/server/db";
import { calendarConnections, users } from "@/server/db/schema";

type Database = typeof appDb;

export const googleCalendarProvider = "google_calendar";
export const googleCalendarReadonlyScope =
  "https://www.googleapis.com/auth/calendar.readonly";
export const googleCalendarEventsWriteScope =
  "https://www.googleapis.com/auth/calendar.events";

export type GoogleCalendarConnectionInput = {
  accountEmail: string;
  displayName?: string | null;
  providerAccountId?: string | null;
  scopes?: string | null;
};

export function hasGoogleCalendarReadonlyScope(scopes: string | null | undefined) {
  return parseOAuthScopes(scopes).includes(googleCalendarReadonlyScope);
}

export async function upsertGoogleCalendarConnection({
  db,
  input,
  userId,
}: {
  db: Database;
  input: GoogleCalendarConnectionInput;
  userId: string;
}) {
  const grantedScopes = parseOAuthScopes(input.scopes);

  const [connection] = await db
    .insert(calendarConnections)
    .values({
      userId,
      provider: googleCalendarProvider,
      providerAccountId: input.providerAccountId ?? null,
      accountEmail: input.accountEmail,
      displayName: input.displayName?.trim() || "Google Calendar",
      status: hasGoogleCalendarReadonlyScope(input.scopes)
        ? "active"
        : "reauthorization_required",
      scopes: grantedScopes,
      settings: {},
    })
    .onConflictDoUpdate({
      target: [calendarConnections.userId, calendarConnections.provider],
      set: {
        providerAccountId: input.providerAccountId ?? null,
        accountEmail: input.accountEmail,
        displayName: input.displayName?.trim() || "Google Calendar",
        status: hasGoogleCalendarReadonlyScope(input.scopes)
          ? "active"
          : "reauthorization_required",
        scopes: grantedScopes,
        updatedAt: new Date(),
      },
    })
    .returning({ id: calendarConnections.id });

  return requireStoredRow(connection, "Failed to create Google Calendar connection");
}

export async function upsertOwnerUserFromGoogleProfile({
  db,
  email,
  image,
  name,
}: {
  db: Database;
  email: string;
  image?: string | null;
  name?: string | null;
}) {
  const [user] = await db
    .insert(users)
    .values({
      email,
      image: image ?? null,
      name: name ?? null,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        image: image ?? null,
        name: name ?? null,
        updatedAt: new Date(),
      },
    })
    .returning({ id: users.id });

  return requireStoredRow(user, "Failed to create or load owner user");
}

export function parseOAuthScopes(scopes: string | null | undefined) {
  if (!scopes) {
    return [];
  }

  return scopes
    .split(" ")
    .map((scope) => scope.trim())
    .filter(Boolean);
}

export async function getGoogleCalendarConnectionStatus({
  db,
  userId,
}: {
  db: Database;
  userId: string;
}) {
  const [connection] = await db
    .select({
      accountEmail: calendarConnections.accountEmail,
      lastSyncedAt: calendarConnections.lastSyncedAt,
      scopes: calendarConnections.scopes,
      status: calendarConnections.status,
      updatedAt: calendarConnections.updatedAt,
    })
    .from(calendarConnections)
    .where(eq(calendarConnections.userId, userId))
    .limit(1);

  return connection ?? null;
}

export async function markGoogleCalendarConnectionSynced({
  connectionId,
  db,
  syncedAt,
  userId,
}: {
  connectionId: string;
  db: Database;
  syncedAt: Date;
  userId: string;
}) {
  await db
    .update(calendarConnections)
    .set({
      lastSyncedAt: syncedAt,
      updatedAt: syncedAt,
    })
    .where(
      and(
        eq(calendarConnections.id, connectionId),
        eq(calendarConnections.userId, userId),
      ),
    );
}

function requireStoredRow<T>(row: T | undefined, message: string) {
  if (!row) {
    throw new Error(message);
  }

  return row;
}
