import { readGoogleCalendarSnapshot } from "@/features/calendar/integrations/google-calendar";
import {
  upsertGoogleCalendarConnection,
  type GoogleCalendarConnectionInput,
} from "@/features/calendar/sync/connection";
import { importCalendarSnapshot } from "@/features/calendar/sync/importer";
import { createCalendarSyncRun, markCalendarSyncRunFailed } from "@/features/calendar/sync/lifecycle";
import type { CalendarSyncSnapshot } from "@/features/calendar/sync/plan";
import type { GoogleCalendarAccessToken } from "@/server/auth/google-calendar-token";
import { db as defaultDb } from "@/server/db";
import type { db as appDb } from "@/server/db";

type Database = typeof appDb;

type InitialFullSyncDependencies = {
  createSyncRun?: typeof createCalendarSyncRun;
  db?: Database;
  importSnapshot?: typeof importCalendarSnapshot;
  markSyncRunFailed?: typeof markCalendarSyncRunFailed;
  now?: Date;
  readSnapshot?: typeof readGoogleCalendarSnapshot;
  upsertConnection?: typeof upsertGoogleCalendarConnection;
};

export type ExecuteInitialGoogleCalendarFullSyncInput = {
  token: GoogleCalendarAccessToken;
  userId: string;
  windowEnd?: Date;
  windowStart?: Date;
} & InitialFullSyncDependencies;

export async function syncInitialGoogleCalendarFullSync() {
  const [{ requireOwnerUser }, { resolveGoogleCalendarAccessToken }] =
    await Promise.all([
      import("@/server/auth/guards"),
      import("@/server/auth/google-calendar-token"),
    ]);
  const [user, token] = await Promise.all([
    requireOwnerUser(),
    resolveGoogleCalendarAccessToken(),
  ]);

  return executeInitialGoogleCalendarFullSync({
    token,
    userId: user.id,
  });
}

export async function executeInitialGoogleCalendarFullSync({
  createSyncRun = createCalendarSyncRun,
  db = defaultDb,
  importSnapshot = importCalendarSnapshot,
  markSyncRunFailed = markCalendarSyncRunFailed,
  now = new Date(),
  readSnapshot = readGoogleCalendarSnapshot,
  token,
  upsertConnection = upsertGoogleCalendarConnection,
  userId,
  windowEnd,
  windowStart,
}: ExecuteInitialGoogleCalendarFullSyncInput) {
  const syncWindow = getInitialFullSyncWindow({
    now,
    windowEnd,
    windowStart,
  });
  const connection = await upsertConnection({
    db,
    input: toGoogleCalendarConnectionInput(token),
    userId,
  });
  const syncRun = await createSyncRun({
    connectionId: connection.id,
    db,
    startedAt: now,
    syncKind: "full",
    userId,
    windowEnd: syncWindow.windowEnd,
    windowStart: syncWindow.windowStart,
  });
  const snapshot = await readSnapshotOrMarkFailed({
    accessToken: token.accessToken,
    db,
    markSyncRunFailed,
    readSnapshot,
    syncRunId: syncRun.id,
    userId,
    windowEnd: syncWindow.windowEnd,
    windowStart: syncWindow.windowStart,
  });

  return importSnapshot({
    connectionId: connection.id,
    db,
    snapshot,
    startedAt: now,
    syncKind: "full",
    syncRunId: syncRun.id,
    userId,
    windowEnd: syncWindow.windowEnd,
    windowStart: syncWindow.windowStart,
  });
}

function getInitialFullSyncWindow({
  now,
  windowEnd,
  windowStart,
}: {
  now: Date;
  windowEnd?: Date;
  windowStart?: Date;
}) {
  return {
    windowEnd: windowEnd ?? addDays(now, 365),
    windowStart: windowStart ?? addDays(now, -90),
  };
}

async function readSnapshotOrMarkFailed({
  accessToken,
  db,
  markSyncRunFailed,
  readSnapshot,
  syncRunId,
  userId,
  windowEnd,
  windowStart,
}: {
  accessToken: string;
  db: Database;
  markSyncRunFailed: typeof markCalendarSyncRunFailed;
  readSnapshot: typeof readGoogleCalendarSnapshot;
  syncRunId: string;
  userId: string;
  windowEnd: Date;
  windowStart: Date;
}): Promise<CalendarSyncSnapshot> {
  try {
    return await readSnapshot({
      accessToken,
      timeMax: windowEnd,
      timeMin: windowStart,
    });
  } catch (error) {
    await markSyncRunFailed({
      db,
      error,
      syncRunId,
      userId,
    });

    throw error;
  }
}

function toGoogleCalendarConnectionInput(
  token: GoogleCalendarAccessToken,
): GoogleCalendarConnectionInput {
  return {
    accountEmail: token.accountEmail,
    displayName: "Google Calendar",
    providerAccountId: token.providerAccountId,
    scopes: token.scopes,
  };
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);

  return nextDate;
}
