import { readGoogleCalendarSnapshot } from "@/features/calendar/integrations/google-calendar";
import {
  upsertGoogleCalendarConnection,
  type GoogleCalendarConnectionInput,
} from "@/features/calendar/sync/connection";
import { importCalendarSnapshot } from "@/features/calendar/sync/importer";
import {
  createCalendarSyncRun,
  markCalendarSyncRunFailed,
} from "@/features/calendar/sync/lifecycle";
import type { CalendarSyncSnapshot } from "@/features/calendar/sync/plan";
import { getCalendarSyncTokenMap } from "@/features/calendar/sync/records";
import type { GoogleCalendarAccessToken } from "@/server/auth/google-calendar-token";
import { db as defaultDb } from "@/server/db";
import type { db as appDb } from "@/server/db";

type Database = typeof appDb;

type InitialFullSyncDependencies = {
  createSyncRun?: typeof createCalendarSyncRun;
  db?: Database;
  getSyncTokenMap?: typeof getCalendarSyncTokenMap;
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

export type ExecuteGoogleCalendarSyncInput = {
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
  const user = await requireOwnerUser();
  const token = await resolveGoogleCalendarAccessToken({ userId: user.id });

  return executeInitialGoogleCalendarFullSync({
    token,
    userId: user.id,
  });
}

export async function syncGoogleCalendarIncremental() {
  const [{ requireOwnerUser }, { resolveGoogleCalendarAccessToken }] =
    await Promise.all([
      import("@/server/auth/guards"),
      import("@/server/auth/google-calendar-token"),
    ]);
  const user = await requireOwnerUser();
  const token = await resolveGoogleCalendarAccessToken({ userId: user.id });

  return executeGoogleCalendarSync({
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
    syncMode: {
      syncKind: "full",
      syncTokenByCalendarId: new Map(),
      windowEnd: syncWindow.windowEnd,
      windowStart: syncWindow.windowStart,
    },
    syncRunId: syncRun.id,
    userId,
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

export async function executeGoogleCalendarSync({
  createSyncRun = createCalendarSyncRun,
  db = defaultDb,
  getSyncTokenMap = getCalendarSyncTokenMap,
  importSnapshot = importCalendarSnapshot,
  markSyncRunFailed = markCalendarSyncRunFailed,
  now = new Date(),
  readSnapshot = readGoogleCalendarSnapshot,
  token,
  upsertConnection = upsertGoogleCalendarConnection,
  userId,
  windowEnd,
  windowStart,
}: ExecuteGoogleCalendarSyncInput) {
  const connection = await upsertConnection({
    db,
    input: toGoogleCalendarConnectionInput(token),
    userId,
  });
  const syncTokenByCalendarId = await getSyncTokenMap({
    connectionId: connection.id,
    db,
    userId,
  });
  const syncMode = getGoogleCalendarSyncMode({
    now,
    syncTokenByCalendarId,
    windowEnd,
    windowStart,
  });
  const syncRun = await createSyncRun({
    connectionId: connection.id,
    db,
    startedAt: now,
    syncKind: syncMode.syncKind,
    userId,
    windowEnd: syncMode.windowEnd,
    windowStart: syncMode.windowStart,
  });
  const snapshot = await readSnapshotOrMarkFailed({
    accessToken: token.accessToken,
    db,
    markSyncRunFailed,
    readSnapshot,
    syncMode,
    syncRunId: syncRun.id,
    userId,
  });

  return importSnapshot({
    connectionId: connection.id,
    db,
    snapshot,
    startedAt: now,
    syncKind: syncMode.syncKind,
    syncRunId: syncRun.id,
    userId,
    windowEnd: syncMode.windowEnd,
    windowStart: syncMode.windowStart,
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

function getGoogleCalendarSyncMode({
  now,
  syncTokenByCalendarId,
  windowEnd,
  windowStart,
}: {
  now: Date;
  syncTokenByCalendarId: Map<string, string>;
  windowEnd?: Date;
  windowStart?: Date;
}) {
  if (syncTokenByCalendarId.size > 0) {
    return {
      syncKind: "incremental" as const,
      syncTokenByCalendarId,
      windowEnd: undefined,
      windowStart: undefined,
    };
  }

  return {
    syncKind: "full" as const,
    syncTokenByCalendarId,
    ...getInitialFullSyncWindow({ now, windowEnd, windowStart }),
  };
}

async function readSnapshotOrMarkFailed({
  accessToken,
  db,
  markSyncRunFailed,
  readSnapshot,
  syncMode,
  syncRunId,
  userId,
}: {
  accessToken: string;
  db: Database;
  markSyncRunFailed: typeof markCalendarSyncRunFailed;
  readSnapshot: typeof readGoogleCalendarSnapshot;
  syncMode: ReturnType<typeof getGoogleCalendarSyncMode>;
  syncRunId: string;
  userId: string;
}): Promise<CalendarSyncSnapshot> {
  try {
    return await readSnapshot(toGoogleCalendarReadConfig(accessToken, syncMode));
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

function toGoogleCalendarReadConfig(
  accessToken: string,
  syncMode: ReturnType<typeof getGoogleCalendarSyncMode>,
) {
  if (syncMode.syncKind === "incremental") {
    return {
      accessToken,
      syncTokenByCalendarId: syncMode.syncTokenByCalendarId,
    };
  }

  return {
    accessToken,
    timeMax: syncMode.windowEnd,
    timeMin: syncMode.windowStart,
  };
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
