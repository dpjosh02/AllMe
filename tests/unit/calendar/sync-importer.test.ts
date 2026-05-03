import { beforeEach, describe, expect, it, vi } from "vitest";

const callLog = vi.hoisted(() => [] as string[]);

vi.mock("@/features/calendar/sync/connection", () => ({
  markGoogleCalendarConnectionSynced: vi.fn(async () => {
    callLog.push("connection-synced:start");
    await Promise.resolve();
    callLog.push("connection-synced:end");
  }),
}));

vi.mock("@/features/calendar/sync/lifecycle", () => ({
  createCalendarSyncRun: vi.fn(async () => {
    callLog.push("sync-run:start");
    await Promise.resolve();
    callLog.push("sync-run:end");
    return { id: "sync-run-1" };
  }),
  markCalendarSyncRunFailed: vi.fn(async () => {
    callLog.push("failed:start");
    await Promise.resolve();
    callLog.push("failed:end");
  }),
  markCalendarSyncRunSucceeded: vi.fn(async () => {
    callLog.push("success:start");
    await Promise.resolve();
    callLog.push("success:end");
  }),
  markCalendarSyncTokenWritten: vi.fn(async () => {
    callLog.push("token-written:start");
    await Promise.resolve();
    callLog.push("token-written:end");
  }),
}));

vi.mock("@/features/calendar/sync/records", () => ({
  updateCalendarSyncToken: vi.fn(async () => {
    callLog.push("token-update:start");
    await Promise.resolve();
    callLog.push("token-update:end");
  }),
  upsertCalendarEventRecords: vi.fn(async () => {
    callLog.push("events:start");
    await Promise.resolve();
    callLog.push("events:end");
  }),
  upsertCalendarRecords: vi.fn(async () => {
    callLog.push("calendars:start");
    await Promise.resolve();
    callLog.push("calendars:end");
    return new Map([["calendar-1", "stored-calendar-1"]]);
  }),
}));

describe("calendar sync importer orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callLog.length = 0;
  });

  it("persists calendars, events, tokens, and lifecycle state in order", async () => {
    const { importCalendarSnapshot } = await import(
      "@/features/calendar/sync/importer"
    );

    const result = await importCalendarSnapshot({
      connectionId: "connection-1",
      db: {} as Parameters<typeof importCalendarSnapshot>[0]["db"],
      snapshot: calendarSnapshot(),
      userId: "user-1",
      windowEnd: new Date("2027-05-02T05:00:00.000Z"),
      windowStart: new Date("2026-02-01T06:00:00.000Z"),
    });

    expect(callLog).toEqual([
      "sync-run:start",
      "sync-run:end",
      "calendars:start",
      "calendars:end",
      "events:start",
      "events:end",
      "token-update:start",
      "token-update:end",
      "token-written:start",
      "token-written:end",
      "success:start",
      "success:end",
      "connection-synced:start",
      "connection-synced:end",
    ]);
    expect(result).toEqual({
      syncRunId: "sync-run-1",
      calendars: 1,
      events: 1,
      unmatchedEvents: 0,
      cancelledEvents: 0,
    });
  });

  it("marks the sync run failed and rethrows when persistence fails", async () => {
    const [lifecycle, records, { importCalendarSnapshot }] = await Promise.all([
      import("@/features/calendar/sync/lifecycle"),
      import("@/features/calendar/sync/records"),
      import("@/features/calendar/sync/importer"),
    ]);
    const failure = new Error("calendar event persistence failed");

    vi.mocked(records.upsertCalendarEventRecords).mockImplementationOnce(
      async () => {
        callLog.push("events:start");
        await Promise.resolve();
        throw failure;
      },
    );

    await expect(
      importCalendarSnapshot({
        connectionId: "connection-1",
        db: {} as Parameters<typeof importCalendarSnapshot>[0]["db"],
        snapshot: calendarSnapshot(),
        userId: "user-1",
      }),
    ).rejects.toThrow(failure);

    expect(lifecycle.markCalendarSyncRunFailed).toHaveBeenCalledTimes(1);
    expect(lifecycle.markCalendarSyncRunSucceeded).not.toHaveBeenCalled();
    expect(lifecycle.markCalendarSyncTokenWritten).not.toHaveBeenCalled();
    expect(callLog).toEqual([
      "sync-run:start",
      "sync-run:end",
      "calendars:start",
      "calendars:end",
      "events:start",
      "failed:start",
      "failed:end",
    ]);
  });
});

function calendarSnapshot() {
  return {
    calendars: [
      {
        name: "Personal",
        rawPayload: { provider: "calendar" },
        sourceCalendarId: "calendar-1",
        syncToken: "next-token",
      },
    ],
    events: [
      {
        rawPayload: { provider: "event" },
        sourceCalendarId: "calendar-1",
        sourceEventId: "event-1",
        startAt: new Date("2026-05-02T15:00:00.000Z"),
        title: "Review today",
      },
    ],
  };
}
