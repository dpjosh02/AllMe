import { describe, expect, it } from "vitest";

import {
  createCalendarSyncRun,
  getCalendarSyncErrorSummary,
  markCalendarSyncRunFailed,
  markCalendarSyncRunSucceeded,
  markCalendarSyncTokenWritten,
} from "@/features/calendar/sync/lifecycle";

type Write = {
  op: "insert" | "update";
  values: Record<string, unknown>;
};

describe("calendar sync lifecycle", () => {
  it("creates a running sync run with calendar window metadata", async () => {
    const writes: Write[] = [];
    const db = createLifecycleDb(writes);

    const syncRun = await createCalendarSyncRun({
      calendarId: "calendar-1",
      connectionId: "connection-1",
      db,
      startedAt: new Date("2026-05-02T12:00:00.000Z"),
      syncKind: "full",
      userId: "user-1",
      windowEnd: new Date("2027-05-02T05:00:00.000Z"),
      windowStart: new Date("2026-02-01T06:00:00.000Z"),
    });

    expect(syncRun).toEqual({ id: "sync-run-1" });
    expect(writes).toEqual([
      {
        op: "insert",
        values: {
          calendarId: "calendar-1",
          connectionId: "connection-1",
          sourceType: "google_calendar",
          startedAt: new Date("2026-05-02T12:00:00.000Z"),
          status: "running",
          syncKind: "full",
          userId: "user-1",
          windowEnd: new Date("2027-05-02T05:00:00.000Z"),
          windowStart: new Date("2026-02-01T06:00:00.000Z"),
        },
      },
    ]);
  });

  it("records token persistence before marking a run succeeded", async () => {
    const writes: Write[] = [];
    const db = createLifecycleDb(writes);

    await markCalendarSyncTokenWritten({
      db,
      syncRunId: "sync-run-1",
      userId: "user-1",
    });
    await markCalendarSyncRunSucceeded({
      counts: {
        eventsCancelled: 1,
        eventsInserted: 2,
        eventsScanned: 10,
        eventsSkipped: 3,
        eventsUpdated: 4,
      },
      db,
      finishedAt: new Date("2026-05-02T12:10:00.000Z"),
      syncRunId: "sync-run-1",
      userId: "user-1",
    });

    expect(writes).toEqual([
      {
        op: "update",
        values: { nextSyncTokenWritten: true },
      },
      {
        op: "update",
        values: {
          eventsCancelled: 1,
          eventsInserted: 2,
          eventsScanned: 10,
          eventsSkipped: 3,
          eventsUpdated: 4,
          finishedAt: new Date("2026-05-02T12:10:00.000Z"),
          status: "succeeded",
        },
      },
    ]);
  });

  it("marks failed runs without writing a sync token", async () => {
    const writes: Write[] = [];
    const db = createLifecycleDb(writes);

    await markCalendarSyncRunFailed({
      db,
      error: new Error("Google token invalid"),
      finishedAt: new Date("2026-05-02T12:15:00.000Z"),
      syncRunId: "sync-run-1",
      userId: "user-1",
    });

    expect(writes).toEqual([
      {
        op: "update",
        values: {
          errorSummary: "Google token invalid",
          finishedAt: new Date("2026-05-02T12:15:00.000Z"),
          status: "failed",
        },
      },
    ]);
  });

  it("normalizes unknown errors to a safe summary", () => {
    expect(getCalendarSyncErrorSummary("bad")).toBe(
      "Unknown calendar sync error",
    );
  });
});

function createLifecycleDb(writes: Write[]) {
  const db = {
    insert: () => ({
      values: (values: Record<string, unknown>) => {
        writes.push({ op: "insert", values });

        return {
          returning: async () => [{ id: "sync-run-1" }],
        };
      },
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => {
        writes.push({ op: "update", values });

        return {
          where: async () => undefined,
        };
      },
    }),
  };

  return db as unknown as Parameters<typeof createCalendarSyncRun>[0]["db"];
}
