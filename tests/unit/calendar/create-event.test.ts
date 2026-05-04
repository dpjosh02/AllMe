import { describe, expect, it, vi } from "vitest";

import {
  buildCreateEventPatch,
  createCalendarEventInGoogle,
  type CreateCalendarEventContext,
  type CreateCalendarEventDependencies,
} from "@/features/calendar/provider-write/create-event";
import { CalendarProviderWriteUserError } from "@/features/calendar/provider-write/publish-note-description";
import {
  googleCalendarEventsWriteScope,
  googleCalendarReadonlyScope,
} from "@/features/calendar/provider-write-policy";

describe("create calendar event provider-write flow", () => {
  it("creates audit before provider POST and succeeds only after local reconciliation", async () => {
    const callLog: string[] = [];
    const deps = createDeps({ callLog });

    await expect(
      createCalendarEventInGoogle({
        deps,
        input: {
          context: contextFixture(),
          form: formFixture(),
          idempotencyKey: "create-1",
        },
      }),
    ).resolves.toEqual({
      eventId: "google-event-1",
      status: "succeeded",
    });

    expect(callLog).toEqual([
      "audit:create",
      "token",
      "audit:running",
      "provider:create",
      "local:reconcile",
      "audit:succeeded",
    ]);
    expect(deps.createProviderEvent).toHaveBeenCalledWith({
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
        summary: "Planning block",
      },
      sourceCalendarId: "primary",
    });
    expect(deps.createAudit).toHaveBeenCalledWith({
      calendarId: "calendar-1",
      connectionId: "connection-1",
      entryPoint: "calendar",
      eventId: null,
      idempotencyKey: "create-1",
      operation: "create_event",
      previousEtag: null,
      requestPatch: {
        end: {
          dateTime: "2026-05-04T10:00:00",
          timeZone: "America/Chicago",
        },
        start: {
          dateTime: "2026-05-04T09:00:00",
          timeZone: "America/Chicago",
        },
        summary: "Planning block",
      },
      scopeSnapshot: [
        googleCalendarReadonlyScope,
        googleCalendarEventsWriteScope,
      ],
      sourceCalendarId: "primary",
      sourceEventId: null,
    });
    expect(deps.markAudit).toHaveBeenLastCalledWith({
      auditId: "audit-1",
      providerEtag: "etag-1",
      providerUpdatedAt: new Date("2026-05-04T16:00:00.000Z"),
      status: "succeeded",
    });
  });

  it("requires an idempotency key before creating an audit row", async () => {
    const deps = createDeps();

    await expect(
      createCalendarEventInGoogle({
        deps,
        input: {
          context: contextFixture(),
          form: formFixture(),
          idempotencyKey: "",
        },
      }),
    ).rejects.toThrow(CalendarProviderWriteUserError);

    expect(deps.createAudit).not.toHaveBeenCalled();
    expect(deps.createProviderEvent).not.toHaveBeenCalled();
  });

  it("blocks read-only token scopes before provider calls", async () => {
    const deps = createDeps();

    await expect(
      createCalendarEventInGoogle({
        deps,
        input: {
          context: contextFixture({ scopes: [googleCalendarReadonlyScope] }),
          form: formFixture(),
          idempotencyKey: "create-1",
        },
      }),
    ).rejects.toMatchObject({ code: "reauthorization_required" });

    expect(deps.markAudit).toHaveBeenCalledWith({
      auditId: "audit-1",
      errorCode: "reauthorization_required",
      errorSummary:
        "Reconnect Google Calendar with write access before creating events.",
      status: "skipped",
    });
    expect(deps.createProviderEvent).not.toHaveBeenCalled();
  });

  it("blocks when resolved token scopes are read-only", async () => {
    const deps = createDeps({
      resolveAccessToken: vi.fn(async () => ({
        accessToken: "access-token",
        scopes: [googleCalendarReadonlyScope],
      })),
    });

    await expect(
      createCalendarEventInGoogle({
        deps,
        input: {
          context: contextFixture(),
          form: formFixture(),
          idempotencyKey: "create-1",
        },
      }),
    ).rejects.toMatchObject({ code: "reauthorization_required" });

    expect(deps.createProviderEvent).not.toHaveBeenCalled();
  });

  it("blocks reader, deleted, or unselected calendars", async () => {
    for (const context of [
      contextFixture({ accessRole: "reader" }),
      contextFixture({ accessRole: "freeBusyReader" }),
      contextFixture({ isCalendarDeleted: true }),
      contextFixture({ isCalendarSelected: false }),
    ]) {
      const deps = createDeps();

      await expect(
        createCalendarEventInGoogle({
          deps,
          input: {
            context,
            form: formFixture(),
            idempotencyKey: `create-${Math.random()}`,
          },
        }),
      ).rejects.toThrow(CalendarProviderWriteUserError);

      expect(deps.createProviderEvent).not.toHaveBeenCalled();
    }
  });

  it("converts all-day inclusive end dates to Google-exclusive end dates", () => {
    expect(
      buildCreateEventPatch({
        form: formFixture({
          endDate: "2026-05-04",
          isAllDay: true,
          startDate: "2026-05-04",
          title: "All day planning",
        }),
        timezone: "America/Chicago",
      }),
    ).toEqual({
      end: { date: "2026-05-05" },
      start: { date: "2026-05-04" },
      summary: "All day planning",
    });
  });

  it("rejects invalid event timing", () => {
    expect(() =>
      buildCreateEventPatch({
        form: formFixture({ endTime: "09:00", startTime: "10:00" }),
        timezone: "America/Chicago",
      }),
    ).toThrow(CalendarProviderWriteUserError);
    expect(() =>
      buildCreateEventPatch({
        form: formFixture({
          endDate: "2026-05-03",
          isAllDay: true,
          startDate: "2026-05-04",
        }),
        timezone: "America/Chicago",
      }),
    ).toThrow(CalendarProviderWriteUserError);
  });

  it("records failed and does not reconcile local cache when provider create fails", async () => {
    const deps = createDeps({
      createProviderEvent: vi.fn(async () => {
        throw new Error("provider failed");
      }),
    });

    await expect(
      createCalendarEventInGoogle({
        deps,
        input: {
          context: contextFixture(),
          form: formFixture(),
          idempotencyKey: "create-1",
        },
      }),
    ).rejects.toMatchObject({ code: "provider_write_failed" });

    expect(deps.markAudit).toHaveBeenLastCalledWith({
      auditId: "audit-1",
      errorCode: "provider_write_failed",
      errorSummary: "Google Calendar event creation failed. Try again after syncing.",
      status: "failed",
    });
    expect(deps.reconcileLocalEvent).not.toHaveBeenCalled();
  });
});

function createDeps({
  callLog = [],
  createProviderEvent,
  resolveAccessToken,
}: {
  callLog?: string[];
  createProviderEvent?: CreateCalendarEventDependencies["createProviderEvent"];
  resolveAccessToken?: CreateCalendarEventDependencies["resolveAccessToken"];
} = {}) {
  const deps: CreateCalendarEventDependencies = {
    createAudit: vi.fn(async () => {
      callLog.push("audit:create");
      return { id: "audit-1" };
    }),
    createProviderEvent:
      createProviderEvent ??
      vi.fn(async () => {
        callLog.push("provider:create");
        return providerEventFixture();
      }),
    markAudit: vi.fn(async ({ status }) => {
      callLog.push(`audit:${status}`);
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
  overrides: Partial<CreateCalendarEventContext> = {},
): CreateCalendarEventContext {
  return {
    accessRole: "writer",
    calendarId: "calendar-1",
    connectionId: "connection-1",
    connectionStatus: "active",
    isCalendarDeleted: false,
    isCalendarSelected: true,
    scopes: [googleCalendarReadonlyScope, googleCalendarEventsWriteScope],
    sourceCalendarId: "primary",
    timezone: "America/Chicago",
    ...overrides,
  };
}

function formFixture(
  overrides: Partial<Parameters<typeof buildCreateEventPatch>[0]["form"]> = {},
) {
  return {
    description: "",
    endDate: "2026-05-04",
    endTime: "10:00",
    isAllDay: false,
    location: "",
    startDate: "2026-05-04",
    startTime: "09:00",
    title: "Planning block",
    ...overrides,
  };
}

function providerEventFixture() {
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
