import { describe, expect, it, vi } from "vitest";

import {
  deleteCalendarEventInGoogle,
  type DeleteCalendarEventContext,
  type DeleteCalendarEventDependencies,
} from "@/features/calendar/provider-write/delete-event";
import { CalendarProviderWriteUserError } from "@/features/calendar/provider-write/publish-note-description";
import {
  googleCalendarEventsWriteScope,
  googleCalendarReadonlyScope,
} from "@/features/calendar/provider-write-policy";

describe("delete calendar event provider-write flow", () => {
  it("fetches provider event before DELETE and succeeds only after local cancellation", async () => {
    const callLog: string[] = [];
    const deps = createDeps({ callLog });

    await expect(
      deleteCalendarEventInGoogle({
        deps,
        input: {
          context: contextFixture(),
          idempotencyKey: "delete-1",
        },
      }),
    ).resolves.toEqual({
      eventId: "event-1",
      status: "succeeded",
    });

    expect(callLog).toEqual([
      "audit:create",
      "token",
      "audit:running",
      "provider:fetch",
      "provider:delete",
      "local:delete",
      "audit:succeeded",
    ]);
    expect(deps.deleteProviderEvent).toHaveBeenCalledWith({
      accessToken: "access-token",
      sourceCalendarId: "primary",
      sourceEventId: "google-event-1",
    });
    expect(deps.createAudit).toHaveBeenCalledWith({
      calendarId: "calendar-1",
      connectionId: "connection-1",
      entryPoint: "calendar",
      eventId: "event-1",
      idempotencyKey: "delete-1",
      operation: "delete_event",
      previousEtag: "etag-1",
      requestPatch: {},
      scopeSnapshot: [
        googleCalendarReadonlyScope,
        googleCalendarEventsWriteScope,
      ],
      sourceCalendarId: "primary",
      sourceEventId: "google-event-1",
    });
  });

  it("requires an idempotency key before creating an audit row", async () => {
    const deps = createDeps();

    await expect(
      deleteCalendarEventInGoogle({
        deps,
        input: {
          context: contextFixture(),
          idempotencyKey: "",
        },
      }),
    ).rejects.toThrow(CalendarProviderWriteUserError);

    expect(deps.createAudit).not.toHaveBeenCalled();
    expect(deps.fetchProviderEvent).not.toHaveBeenCalled();
    expect(deps.deleteProviderEvent).not.toHaveBeenCalled();
  });

  it("blocks read-only scopes, missing source ids, and recurring events", async () => {
    for (const context of [
      contextFixture({ scopes: [googleCalendarReadonlyScope] }),
      contextFixture({ sourceEventId: null }),
      contextFixture({ recurringEventId: "series-1" }),
    ]) {
      const deps = createDeps();

      await expect(
        deleteCalendarEventInGoogle({
          deps,
          input: {
            context,
            idempotencyKey: `delete-${Math.random()}`,
          },
        }),
      ).rejects.toThrow(CalendarProviderWriteUserError);

      expect(deps.fetchProviderEvent).not.toHaveBeenCalled();
      expect(deps.deleteProviderEvent).not.toHaveBeenCalled();
    }
  });

  it("blocks non-writable, deleted, or unselected calendars before provider calls", async () => {
    for (const context of [
      contextFixture({ accessRole: "reader" }),
      contextFixture({ accessRole: "freeBusyReader" }),
      contextFixture({ isCalendarDeleted: true }),
      contextFixture({ isCalendarSelected: false }),
    ]) {
      const deps = createDeps();

      await expect(
        deleteCalendarEventInGoogle({
          deps,
          input: {
            context,
            idempotencyKey: `delete-${Math.random()}`,
          },
        }),
      ).rejects.toThrow(CalendarProviderWriteUserError);

      expect(deps.fetchProviderEvent).not.toHaveBeenCalled();
      expect(deps.deleteProviderEvent).not.toHaveBeenCalled();
      expect(deps.reconcileLocalEventDeletion).not.toHaveBeenCalled();
    }
  });

  it("blocks when resolved token scopes are read-only before fetch or DELETE", async () => {
    const deps = createDeps({
      resolveAccessToken: vi.fn(async () => ({
        accessToken: "access-token",
        scopes: [googleCalendarReadonlyScope],
      })),
    });

    await expect(
      deleteCalendarEventInGoogle({
        deps,
        input: {
          context: contextFixture(),
          idempotencyKey: "delete-1",
        },
      }),
    ).rejects.toMatchObject({ code: "reauthorization_required" });

    expect(deps.markAudit).toHaveBeenLastCalledWith({
      auditId: "audit-1",
      errorCode: "reauthorization_required",
      errorSummary:
        "Reconnect Google Calendar with write access before deleting events.",
      status: "skipped",
    });
    expect(deps.fetchProviderEvent).not.toHaveBeenCalled();
    expect(deps.deleteProviderEvent).not.toHaveBeenCalled();
    expect(deps.reconcileLocalEventDeletion).not.toHaveBeenCalled();
  });

  it("records conflict and does not DELETE when provider ETag changed", async () => {
    const deps = createDeps({
      providerEvent: providerEventFixture({ etag: "provider-new-etag" }),
    });

    await expect(
      deleteCalendarEventInGoogle({
        deps,
        input: {
          context: contextFixture({ etag: "cached-etag" }),
          idempotencyKey: "delete-1",
        },
      }),
    ).rejects.toMatchObject({ code: "conflict" });

    expect(deps.markAudit).toHaveBeenLastCalledWith({
      auditId: "audit-1",
      errorCode: "etag_conflict",
      errorSummary:
        "Google Calendar changed since AllMe last synced. Sync Calendar and try again.",
      status: "conflict",
    });
    expect(deps.deleteProviderEvent).not.toHaveBeenCalled();
    expect(deps.reconcileLocalEventDeletion).not.toHaveBeenCalled();
  });

  it("records failed and does not reconcile local cache when provider DELETE fails", async () => {
    const deps = createDeps({
      deleteProviderEvent: vi.fn(async () => {
        throw new Error("provider failed");
      }),
    });

    await expect(
      deleteCalendarEventInGoogle({
        deps,
        input: {
          context: contextFixture(),
          idempotencyKey: "delete-1",
        },
      }),
    ).rejects.toMatchObject({ code: "provider_write_failed" });

    expect(deps.markAudit).toHaveBeenLastCalledWith({
      auditId: "audit-1",
      errorCode: "provider_write_failed",
      errorSummary:
        "Google Calendar event deletion failed. Try again after syncing.",
      status: "failed",
    });
    expect(deps.reconcileLocalEventDeletion).not.toHaveBeenCalled();
  });
});

function createDeps({
  callLog = [],
  deleteProviderEvent,
  providerEvent = providerEventFixture(),
  resolveAccessToken,
}: {
  callLog?: string[];
  deleteProviderEvent?: DeleteCalendarEventDependencies["deleteProviderEvent"];
  providerEvent?: ReturnType<typeof providerEventFixture>;
  resolveAccessToken?: DeleteCalendarEventDependencies["resolveAccessToken"];
} = {}) {
  const deps: DeleteCalendarEventDependencies = {
    createAudit: vi.fn(async () => {
      callLog.push("audit:create");
      return { id: "audit-1" };
    }),
    deleteProviderEvent:
      deleteProviderEvent ??
      vi.fn(async () => {
        callLog.push("provider:delete");
      }),
    fetchProviderEvent: vi.fn(async () => {
      callLog.push("provider:fetch");
      return providerEvent;
    }),
    markAudit: vi.fn(async ({ status }) => {
      callLog.push(`audit:${status}`);
    }),
    reconcileLocalEventDeletion: vi.fn(async () => {
      callLog.push("local:delete");
    }),
    resolveAccessToken:
      resolveAccessToken ??
      vi.fn(async () => {
        callLog.push("token");
        return {
          accessToken: "access-token",
          scopes: [googleCalendarReadonlyScope, googleCalendarEventsWriteScope],
        };
      }),
  };

  return deps;
}

function contextFixture(
  overrides: Partial<DeleteCalendarEventContext> = {},
): DeleteCalendarEventContext {
  return {
    accessRole: "writer",
    calendarId: "calendar-1",
    connectionId: "connection-1",
    connectionStatus: "active",
    etag: "etag-1",
    eventId: "event-1",
    isCalendarDeleted: false,
    isCalendarSelected: true,
    recurringEventId: null,
    scopes: [googleCalendarReadonlyScope, googleCalendarEventsWriteScope],
    sourceCalendarId: "primary",
    sourceEventId: "google-event-1",
    ...overrides,
  };
}

function providerEventFixture(
  overrides: Partial<ReturnType<typeof baseProviderEventFixture>> = {},
) {
  return {
    ...baseProviderEventFixture(),
    ...overrides,
  };
}

function baseProviderEventFixture() {
  return {
    description: "Existing",
    endAt: new Date("2026-05-04T15:00:00.000Z"),
    endDate: null,
    etag: "etag-1",
    htmlLink: "https://calendar.google.com/event",
    location: "Office",
    originalStartAt: null,
    providerUpdatedAt: new Date("2026-05-04T16:00:00.000Z"),
    rawPayload: { id: "google-event-1" },
    recurringEventId: null,
    sourceCalendarId: "primary",
    sourceEventId: "google-event-1",
    sourceIcalUid: "ical-1",
    startAt: new Date("2026-05-04T14:00:00.000Z"),
    startDate: null,
    status: "confirmed" as const,
    timezone: "America/Chicago",
    title: "Planning block",
    transparency: null,
    visibility: null,
  };
}
