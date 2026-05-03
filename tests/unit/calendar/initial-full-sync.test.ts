import { describe, expect, it, vi } from "vitest";

import {
  executeGoogleCalendarSync,
  executeInitialGoogleCalendarFullSync,
} from "@/features/calendar/sync/initial-full-sync";

describe("initial Google Calendar full sync", () => {
  it("upserts connection metadata, creates one sync run, reads Google, and imports into that run", async () => {
    const now = new Date("2026-05-02T12:00:00.000Z");
    const db = {} as Parameters<typeof executeInitialGoogleCalendarFullSync>[0]["db"];
    const callLog: string[] = [];
    const upsertConnection = vi.fn(async () => {
      callLog.push("connection");
      return { id: "connection-1" };
    });
    const createSyncRun = vi.fn(async () => {
      callLog.push("sync-run");
      return { id: "sync-run-1" };
    });
    const readSnapshot = vi.fn(async () => {
      callLog.push("read");
      return {
        calendars: [{ name: "Personal", rawPayload: {}, sourceCalendarId: "primary" }],
        events: [],
      };
    });
    const importSnapshot = vi.fn(async () => {
      callLog.push("import");
      return {
        syncRunId: "sync-run-1",
        calendars: 1,
        cancelledEvents: 0,
        events: 0,
        unmatchedEvents: 0,
      };
    });
    const markSyncRunFailed = vi.fn(async () => {
      callLog.push("failed");
    });

    const result = await executeInitialGoogleCalendarFullSync({
      createSyncRun,
      db,
      importSnapshot,
      markSyncRunFailed,
      now,
      readSnapshot,
      token: tokenContext(),
      upsertConnection,
      userId: "user-1",
    });

    expect(callLog).toEqual(["connection", "sync-run", "read", "import"]);
    expect(upsertConnection).toHaveBeenCalledWith({
      db,
      input: {
        accountEmail: "owner@example.com",
        displayName: "Google Calendar",
        providerAccountId: "google-account-1",
        scopes: "openid email https://www.googleapis.com/auth/calendar.readonly",
      },
      userId: "user-1",
    });
    expect(createSyncRun).toHaveBeenCalledWith({
      connectionId: "connection-1",
      db,
      startedAt: now,
      syncKind: "full",
      userId: "user-1",
      windowEnd: new Date("2027-05-02T12:00:00.000Z"),
      windowStart: new Date("2026-02-01T12:00:00.000Z"),
    });
    expect(readSnapshot).toHaveBeenCalledWith({
      accessToken: "access-token",
      timeMax: new Date("2027-05-02T12:00:00.000Z"),
      timeMin: new Date("2026-02-01T12:00:00.000Z"),
    });
    expect(importSnapshot).toHaveBeenCalledWith({
      connectionId: "connection-1",
      db,
      snapshot: {
        calendars: [{ name: "Personal", rawPayload: {}, sourceCalendarId: "primary" }],
        events: [],
      },
      startedAt: now,
      syncKind: "full",
      syncRunId: "sync-run-1",
      userId: "user-1",
      windowEnd: new Date("2027-05-02T12:00:00.000Z"),
      windowStart: new Date("2026-02-01T12:00:00.000Z"),
    });
    expect(markSyncRunFailed).not.toHaveBeenCalled();
    expect(result).toEqual({
      syncRunId: "sync-run-1",
      calendars: 1,
      cancelledEvents: 0,
      events: 0,
      unmatchedEvents: 0,
    });
  });

  it("marks the sync run failed and does not import when Google read fails", async () => {
    const failure = new Error("Google Calendar failed");
    const importSnapshot = vi.fn();
    const markSyncRunFailed = vi.fn(async () => undefined);

    await expect(
      executeInitialGoogleCalendarFullSync({
        createSyncRun: vi.fn(async () => ({ id: "sync-run-1" })),
        db: {} as Parameters<typeof executeInitialGoogleCalendarFullSync>[0]["db"],
        importSnapshot,
        markSyncRunFailed,
        now: new Date("2026-05-02T12:00:00.000Z"),
        readSnapshot: vi.fn(async () => {
          throw failure;
        }),
        token: tokenContext(),
        upsertConnection: vi.fn(async () => ({ id: "connection-1" })),
        userId: "user-1",
      }),
    ).rejects.toThrow(failure);

    expect(markSyncRunFailed).toHaveBeenCalledWith({
      db: expect.anything(),
      error: failure,
      syncRunId: "sync-run-1",
      userId: "user-1",
    });
    expect(importSnapshot).not.toHaveBeenCalled();
  });
});

describe("Google Calendar sync", () => {
  it("uses stored calendar sync tokens for incremental syncs", async () => {
    const now = new Date("2026-05-02T12:00:00.000Z");
    const db = {} as Parameters<typeof executeGoogleCalendarSync>[0]["db"];
    const syncTokenByCalendarId = new Map([["primary", "existing-token"]]);
    const callLog: string[] = [];
    const upsertConnection = vi.fn(async () => {
      callLog.push("connection");
      return { id: "connection-1" };
    });
    const getSyncTokenMap = vi.fn(async () => {
      callLog.push("tokens");
      return syncTokenByCalendarId;
    });
    const createSyncRun = vi.fn(async () => {
      callLog.push("sync-run");
      return { id: "sync-run-1" };
    });
    const readSnapshot = vi.fn(async () => {
      callLog.push("read");
      return calendarSnapshot();
    });
    const importSnapshot = vi.fn(async () => {
      callLog.push("import");
      return {
        syncRunId: "sync-run-1",
        calendars: 1,
        cancelledEvents: 0,
        events: 0,
        unmatchedEvents: 0,
      };
    });

    await executeGoogleCalendarSync({
      createSyncRun,
      db,
      getSyncTokenMap,
      importSnapshot,
      now,
      readSnapshot,
      token: tokenContext(),
      upsertConnection,
      userId: "user-1",
    });

    expect(callLog).toEqual(["connection", "tokens", "sync-run", "read", "import"]);
    expect(getSyncTokenMap).toHaveBeenCalledWith({
      connectionId: "connection-1",
      db,
      userId: "user-1",
    });
    expect(createSyncRun).toHaveBeenCalledWith({
      connectionId: "connection-1",
      db,
      startedAt: now,
      syncKind: "incremental",
      userId: "user-1",
      windowEnd: undefined,
      windowStart: undefined,
    });
    expect(readSnapshot).toHaveBeenCalledWith({
      accessToken: "access-token",
      syncTokenByCalendarId,
    });
    expect(importSnapshot).toHaveBeenCalledWith({
      connectionId: "connection-1",
      db,
      snapshot: calendarSnapshot(),
      startedAt: now,
      syncKind: "incremental",
      syncRunId: "sync-run-1",
      userId: "user-1",
      windowEnd: undefined,
      windowStart: undefined,
    });
  });

  it("falls back to the bounded full sync window when no stored sync tokens exist", async () => {
    const now = new Date("2026-05-02T12:00:00.000Z");
    const db = {} as Parameters<typeof executeGoogleCalendarSync>[0]["db"];
    const createSyncRun = vi.fn(async () => ({ id: "sync-run-1" }));
    const readSnapshot = vi.fn(async () => calendarSnapshot());
    const importSnapshot = vi.fn(async () => ({
      syncRunId: "sync-run-1",
      calendars: 1,
      cancelledEvents: 0,
      events: 0,
      unmatchedEvents: 0,
    }));

    await executeGoogleCalendarSync({
      createSyncRun,
      db,
      getSyncTokenMap: vi.fn(async () => new Map()),
      importSnapshot,
      now,
      readSnapshot,
      token: tokenContext(),
      upsertConnection: vi.fn(async () => ({ id: "connection-1" })),
      userId: "user-1",
    });

    expect(createSyncRun).toHaveBeenCalledWith({
      connectionId: "connection-1",
      db,
      startedAt: now,
      syncKind: "full",
      userId: "user-1",
      windowEnd: new Date("2027-05-02T12:00:00.000Z"),
      windowStart: new Date("2026-02-01T12:00:00.000Z"),
    });
    expect(readSnapshot).toHaveBeenCalledWith({
      accessToken: "access-token",
      timeMax: new Date("2027-05-02T12:00:00.000Z"),
      timeMin: new Date("2026-02-01T12:00:00.000Z"),
    });
    expect(importSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        syncKind: "full",
        windowEnd: new Date("2027-05-02T12:00:00.000Z"),
        windowStart: new Date("2026-02-01T12:00:00.000Z"),
      }),
    );
  });
});

function tokenContext() {
  return {
    accessToken: "access-token",
    accountEmail: "owner@example.com",
    expiresAt: new Date("2026-05-02T13:00:00.000Z"),
    providerAccountId: "google-account-1",
    scopes: "openid email https://www.googleapis.com/auth/calendar.readonly",
  };
}

function calendarSnapshot() {
  return {
    calendars: [{ name: "Personal", rawPayload: {}, sourceCalendarId: "primary" }],
    events: [],
  };
}
