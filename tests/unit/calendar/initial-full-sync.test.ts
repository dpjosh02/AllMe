import { describe, expect, it, vi } from "vitest";

import { executeInitialGoogleCalendarFullSync } from "@/features/calendar/sync/initial-full-sync";

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

function tokenContext() {
  return {
    accessToken: "access-token",
    accountEmail: "owner@example.com",
    expiresAt: new Date("2026-05-02T13:00:00.000Z"),
    providerAccountId: "google-account-1",
    scopes: "openid email https://www.googleapis.com/auth/calendar.readonly",
  };
}
