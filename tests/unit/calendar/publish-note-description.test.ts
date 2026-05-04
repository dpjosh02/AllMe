import { describe, expect, it, vi } from "vitest";

import {
  CalendarProviderWriteUserError,
  publishNoteDescriptionToGoogle,
  type PublishNoteDescriptionDependencies,
  type PublishNoteDescriptionEventContext,
} from "@/features/calendar/provider-write/publish-note-description";
import {
  googleCalendarEventsWriteScope,
  googleCalendarReadonlyScope,
} from "@/features/calendar/provider-write-policy";

describe("publish note description provider-write flow", () => {
  it("fetches provider event before PATCH and succeeds only after reconciliation", async () => {
    const callLog: string[] = [];
    const deps = createDeps({ callLog });

    await expect(
      publishNoteDescriptionToGoogle({
        deps,
        input: {
          context: contextFixture(),
          idempotencyKey: "publish-1",
        },
      }),
    ).resolves.toEqual({
      description: "Provider description",
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
    expect(deps.patchProviderDescription).toHaveBeenCalledWith({
      accessToken: "access-token",
      description: "Local note body",
      sourceCalendarId: "primary",
      sourceEventId: "google-event-1",
    });
    expect(deps.markAudit).toHaveBeenLastCalledWith({
      auditId: "audit-1",
      providerEtag: "etag-2",
      providerUpdatedAt: new Date("2026-05-04T16:05:00.000Z"),
      status: "succeeded",
    });
  });

  it("requires an idempotency key before creating an audit row", async () => {
    const deps = createDeps();

    await expect(
      publishNoteDescriptionToGoogle({
        deps,
        input: {
          context: contextFixture(),
          idempotencyKey: "",
        },
      }),
    ).rejects.toThrow(CalendarProviderWriteUserError);

    expect(deps.createAudit).not.toHaveBeenCalled();
    expect(deps.fetchProviderEvent).not.toHaveBeenCalled();
    expect(deps.patchProviderDescription).not.toHaveBeenCalled();
  });

  it("blocks read-only or missing write scopes before provider calls", async () => {
    const deps = createDeps();

    await expect(
      publishNoteDescriptionToGoogle({
        deps,
        input: {
          context: contextFixture({ scopes: [googleCalendarReadonlyScope] }),
          idempotencyKey: "publish-1",
        },
      }),
    ).rejects.toMatchObject({ code: "reauthorization_required" });

    expect(deps.markAudit).toHaveBeenCalledWith({
      auditId: "audit-1",
      errorCode: "reauthorization_required",
      errorSummary:
        "Reconnect Google Calendar with write access before publishing changes.",
      status: "skipped",
    });
    expect(deps.fetchProviderEvent).not.toHaveBeenCalled();
    expect(deps.patchProviderDescription).not.toHaveBeenCalled();
  });

  it("blocks when the resolved token is read-only even if cached connection scopes look write-ready", async () => {
    const deps = createDeps({
      resolveAccessToken: vi.fn(async () => ({
        accessToken: "access-token",
        scopes: [googleCalendarReadonlyScope],
      })),
    });

    await expect(
      publishNoteDescriptionToGoogle({
        deps,
        input: {
          context: contextFixture(),
          idempotencyKey: "publish-1",
        },
      }),
    ).rejects.toMatchObject({ code: "reauthorization_required" });

    expect(deps.fetchProviderEvent).not.toHaveBeenCalled();
    expect(deps.patchProviderDescription).not.toHaveBeenCalled();
  });

  it("blocks reader and freeBusyReader calendars", async () => {
    for (const accessRole of ["reader", "freeBusyReader"]) {
      const deps = createDeps();

      await expect(
        publishNoteDescriptionToGoogle({
          deps,
          input: {
            context: contextFixture({ accessRole }),
            idempotencyKey: `publish-${accessRole}`,
          },
        }),
      ).rejects.toMatchObject({ code: "calendar_not_writable" });

      expect(deps.patchProviderDescription).not.toHaveBeenCalled();
    }
  });

  it("blocks unselected, deleted, recurring, or unsourced events", async () => {
    for (const context of [
      contextFixture({ isCalendarSelected: false }),
      contextFixture({ isCalendarDeleted: true }),
      contextFixture({ recurringEventId: "series-1" }),
      contextFixture({ sourceEventId: null }),
    ]) {
      const deps = createDeps();

      await expect(
        publishNoteDescriptionToGoogle({
          deps,
          input: {
            context,
            idempotencyKey: `publish-${Math.random()}`,
          },
        }),
      ).rejects.toThrow(CalendarProviderWriteUserError);

      expect(deps.fetchProviderEvent).not.toHaveBeenCalled();
      expect(deps.patchProviderDescription).not.toHaveBeenCalled();
    }
  });

  it("records conflict and does not PATCH when provider ETag changed", async () => {
    const deps = createDeps({
      providerEvent: providerEventFixture({ etag: "provider-new-etag" }),
    });

    await expect(
      publishNoteDescriptionToGoogle({
        deps,
        input: {
          context: contextFixture({ etag: "cached-etag" }),
          idempotencyKey: "publish-1",
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
    expect(deps.patchProviderDescription).not.toHaveBeenCalled();
    expect(deps.reconcileLocalEvent).not.toHaveBeenCalled();
  });

  it("records failed and does not mutate local cache when provider PATCH fails", async () => {
    const deps = createDeps({
      patchProviderDescription: vi.fn(async () => {
        throw new Error("provider failed");
      }),
    });

    await expect(
      publishNoteDescriptionToGoogle({
        deps,
        input: {
          context: contextFixture(),
          idempotencyKey: "publish-1",
        },
      }),
    ).rejects.toMatchObject({ code: "provider_write_failed" });

    expect(deps.markAudit).toHaveBeenLastCalledWith({
      auditId: "audit-1",
      errorCode: "provider_write_failed",
      errorSummary: "Google Calendar publish failed. Try again after syncing.",
      status: "failed",
    });
    expect(deps.reconcileLocalEvent).not.toHaveBeenCalled();
  });

  it("keeps the provider PATCH limited to description and excludes local note state", async () => {
    const deps = createDeps();

    await publishNoteDescriptionToGoogle({
      deps,
      input: {
        context: contextFixture(),
        idempotencyKey: "publish-1",
      },
    });

    expect(deps.createAudit).toHaveBeenCalledWith({
      calendarId: "calendar-1",
      connectionId: "connection-1",
      entryPoint: "calendar",
      eventId: "event-1",
      idempotencyKey: "publish-1",
      operation: "publish_note_description",
      previousEtag: "etag-1",
      requestPatch: { description: "Local note body" },
      scopeSnapshot: [
        googleCalendarReadonlyScope,
        googleCalendarEventsWriteScope,
      ],
      sourceCalendarId: "primary",
      sourceEventId: "google-event-1",
    });
  });
});

function createDeps({
  callLog = [],
  patchProviderDescription,
  providerEvent = providerEventFixture(),
  resolveAccessToken,
}: {
  callLog?: string[];
  patchProviderDescription?: PublishNoteDescriptionDependencies["patchProviderDescription"];
  providerEvent?: ReturnType<typeof providerEventFixture>;
  resolveAccessToken?: PublishNoteDescriptionDependencies["resolveAccessToken"];
} = {}) {
  const deps: PublishNoteDescriptionDependencies = {
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
    patchProviderDescription:
      patchProviderDescription ??
      vi.fn(async () => {
        callLog.push("provider:patch");
        return providerEventFixture({
          description: "Provider description",
          etag: "etag-2",
          providerUpdatedAt: new Date("2026-05-04T16:05:00.000Z"),
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
  overrides: Partial<PublishNoteDescriptionEventContext> = {},
): PublishNoteDescriptionEventContext {
  return {
    accessRole: "writer",
    calendarId: "calendar-1",
    connectionId: "connection-1",
    connectionStatus: "active",
    description: "Existing description",
    etag: "etag-1",
    eventId: "event-1",
    isCalendarDeleted: false,
    isCalendarSelected: true,
    linkedNoteBody: "Local note body",
    linkedNoteId: "note-1",
    recurringEventId: null,
    scopes: [googleCalendarReadonlyScope, googleCalendarEventsWriteScope],
    sourceCalendarId: "primary",
    sourceEventId: "google-event-1",
    ...overrides,
  };
}

function providerEventFixture(
  overrides: Partial<GoogleProviderEventFixture> = {},
): GoogleProviderEventFixture {
  return {
    description: "Provider description",
    endAt: null,
    endDate: null,
    etag: "etag-1",
    htmlLink: null,
    location: null,
    originalStartAt: null,
    providerUpdatedAt: new Date("2026-05-04T16:00:00.000Z"),
    rawPayload: { id: "google-event-1" },
    recurringEventId: null,
    sourceCalendarId: "primary",
    sourceEventId: "google-event-1",
    sourceIcalUid: null,
    startAt: null,
    startDate: null,
    status: "confirmed",
    timezone: null,
    title: "Provider title",
    transparency: null,
    visibility: null,
    ...overrides,
  };
}

type GoogleProviderEventFixture = {
  description: string | null;
  endAt: Date | null;
  endDate: string | null;
  etag: string | null;
  htmlLink: string | null;
  location: string | null;
  originalStartAt: Date | null;
  providerUpdatedAt: Date | null;
  rawPayload: Record<string, unknown>;
  recurringEventId: string | null;
  sourceCalendarId: string;
  sourceEventId: string;
  sourceIcalUid: string | null;
  startAt: Date | null;
  startDate: string | null;
  status: "cancelled" | "confirmed" | "tentative";
  timezone: string | null;
  title: string | null;
  transparency: string | null;
  visibility: string | null;
};
