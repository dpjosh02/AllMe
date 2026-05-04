import { describe, expect, it, vi } from "vitest";

import {
  updateCalendarEventInGoogle,
  type UpdateCalendarEventContext,
  type UpdateCalendarEventDependencies,
} from "@/features/calendar/provider-write/update-event";
import { CalendarProviderWriteUserError } from "@/features/calendar/provider-write/publish-note-description";
import {
  googleCalendarEventsWriteScope,
  googleCalendarReadonlyScope,
} from "@/features/calendar/provider-write-policy";

describe("update calendar event provider-write flow", () => {
  it("fetches provider event before PATCH and succeeds only after reconciliation", async () => {
    const callLog: string[] = [];
    const deps = createDeps({ callLog });

    await expect(
      updateCalendarEventInGoogle({
        deps,
        input: {
          context: contextFixture(),
          form: formFixture(),
          idempotencyKey: "update-1",
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
      "provider:patch",
      "local:reconcile",
      "audit:succeeded",
    ]);
    expect(deps.patchProviderEvent).toHaveBeenCalledWith({
      accessToken: "access-token",
      patch: {
        end: {
          dateTime: "2026-05-04T10:00:00",
          timeZone: "America/Chicago",
        },
        start: {
          dateTime: "2026-05-04T09:00:00",
          timeZone: "America/Chicago",
        },
        summary: "Updated planning block",
      },
      sourceCalendarId: "primary",
      sourceEventId: "google-event-1",
    });
    expect(deps.createAudit).toHaveBeenCalledWith({
      calendarId: "calendar-1",
      connectionId: "connection-1",
      entryPoint: "calendar",
      eventId: "event-1",
      idempotencyKey: "update-1",
      operation: "update_event",
      previousEtag: "etag-1",
      requestPatch: {
        end: {
          dateTime: "2026-05-04T10:00:00",
          timeZone: "America/Chicago",
        },
        start: {
          dateTime: "2026-05-04T09:00:00",
          timeZone: "America/Chicago",
        },
        summary: "Updated planning block",
      },
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
      updateCalendarEventInGoogle({
        deps,
        input: {
          context: contextFixture(),
          form: formFixture(),
          idempotencyKey: "",
        },
      }),
    ).rejects.toThrow(CalendarProviderWriteUserError);

    expect(deps.createAudit).not.toHaveBeenCalled();
    expect(deps.fetchProviderEvent).not.toHaveBeenCalled();
    expect(deps.patchProviderEvent).not.toHaveBeenCalled();
  });

  it("blocks read-only scopes, missing source ids, and recurring events", async () => {
    for (const context of [
      contextFixture({ scopes: [googleCalendarReadonlyScope] }),
      contextFixture({ sourceEventId: null }),
      contextFixture({ recurringEventId: "series-1" }),
    ]) {
      const deps = createDeps();

      await expect(
        updateCalendarEventInGoogle({
          deps,
          input: {
            context,
            form: formFixture(),
            idempotencyKey: `update-${Math.random()}`,
          },
        }),
      ).rejects.toThrow(CalendarProviderWriteUserError);

      expect(deps.fetchProviderEvent).not.toHaveBeenCalled();
      expect(deps.patchProviderEvent).not.toHaveBeenCalled();
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
        updateCalendarEventInGoogle({
          deps,
          input: {
            context,
            form: formFixture(),
            idempotencyKey: `update-${Math.random()}`,
          },
        }),
      ).rejects.toThrow(CalendarProviderWriteUserError);

      expect(deps.fetchProviderEvent).not.toHaveBeenCalled();
      expect(deps.patchProviderEvent).not.toHaveBeenCalled();
      expect(deps.reconcileLocalEvent).not.toHaveBeenCalled();
    }
  });

  it("blocks when resolved token scopes are read-only before fetch or PATCH", async () => {
    const deps = createDeps({
      resolveAccessToken: vi.fn(async () => ({
        accessToken: "access-token",
        scopes: [googleCalendarReadonlyScope],
      })),
    });

    await expect(
      updateCalendarEventInGoogle({
        deps,
        input: {
          context: contextFixture(),
          form: formFixture(),
          idempotencyKey: "update-1",
        },
      }),
    ).rejects.toMatchObject({ code: "reauthorization_required" });

    expect(deps.markAudit).toHaveBeenLastCalledWith({
      auditId: "audit-1",
      errorCode: "reauthorization_required",
      errorSummary:
        "Reconnect Google Calendar with write access before editing events.",
      status: "skipped",
    });
    expect(deps.fetchProviderEvent).not.toHaveBeenCalled();
    expect(deps.patchProviderEvent).not.toHaveBeenCalled();
    expect(deps.reconcileLocalEvent).not.toHaveBeenCalled();
  });

  it("records conflict and does not PATCH when provider ETag changed", async () => {
    const deps = createDeps({
      providerEvent: providerEventFixture({ etag: "provider-new-etag" }),
    });

    await expect(
      updateCalendarEventInGoogle({
        deps,
        input: {
          context: contextFixture({ etag: "cached-etag" }),
          form: formFixture(),
          idempotencyKey: "update-1",
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
    expect(deps.patchProviderEvent).not.toHaveBeenCalled();
    expect(deps.reconcileLocalEvent).not.toHaveBeenCalled();
  });

  it("records failed and does not reconcile local cache when provider PATCH fails", async () => {
    const deps = createDeps({
      patchProviderEvent: vi.fn(async () => {
        throw new Error("provider failed");
      }),
    });

    await expect(
      updateCalendarEventInGoogle({
        deps,
        input: {
          context: contextFixture(),
          form: formFixture(),
          idempotencyKey: "update-1",
        },
      }),
    ).rejects.toMatchObject({ code: "provider_write_failed" });

    expect(deps.markAudit).toHaveBeenLastCalledWith({
      auditId: "audit-1",
      errorCode: "provider_write_failed",
      errorSummary: "Google Calendar event update failed. Try again after syncing.",
      status: "failed",
    });
    expect(deps.reconcileLocalEvent).not.toHaveBeenCalled();
  });
});

function createDeps({
  callLog = [],
  patchProviderEvent,
  providerEvent = providerEventFixture(),
  resolveAccessToken,
}: {
  callLog?: string[];
  patchProviderEvent?: UpdateCalendarEventDependencies["patchProviderEvent"];
  providerEvent?: ReturnType<typeof providerEventFixture>;
  resolveAccessToken?: UpdateCalendarEventDependencies["resolveAccessToken"];
} = {}) {
  const deps: UpdateCalendarEventDependencies = {
    createAudit: vi.fn(async () => {
      callLog.push("audit:create");
      return { id: "audit-1" };
    }),
    fetchProviderEvent: vi.fn(async () => {
      callLog.push("provider:fetch");
      return providerEvent;
    }),
    markAudit: vi.fn(async ({ status }) => {
      callLog.push(`audit:${status}`);
    }),
    patchProviderEvent:
      patchProviderEvent ??
      vi.fn(async () => {
        callLog.push("provider:patch");
        return providerEventFixture({
          etag: "etag-2",
          providerUpdatedAt: new Date("2026-05-04T16:05:00.000Z"),
          title: "Updated planning block",
        });
      }),
    reconcileLocalEvent: vi.fn(async () => {
      callLog.push("local:reconcile");
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
  overrides: Partial<UpdateCalendarEventContext> = {},
): UpdateCalendarEventContext {
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
    timezone: "America/Chicago",
    ...overrides,
  };
}

function formFixture() {
  return {
    description: "",
    endDate: "2026-05-04",
    endTime: "10:00",
    isAllDay: false,
    location: "",
    startDate: "2026-05-04",
    startTime: "09:00",
    title: "Updated planning block",
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
    description: null,
    endAt: new Date("2026-05-04T15:00:00.000Z"),
    endDate: null,
    etag: "etag-1",
    htmlLink: "https://calendar.google.com/event",
    location: null,
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
