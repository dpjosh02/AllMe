import { describe, expect, it } from "vitest";

import {
  calendarProviderWriteOperations,
  calendarProviderWritePolicyOwner,
  calendarProviderWriteStatuses,
  classifyFetchedRecurringOccurrence,
  evaluateCalendarProviderWritePolicy,
  evaluateProviderWriteFreshnessPolicy,
  evaluateThisEventOnlyRecurrenceEditPolicy,
  getCalendarProviderWriteActionOwner,
  getDuplicateIdempotencyPolicy,
  getGoogleCalendarWriteReadiness,
  googleCalendarBroadWriteScope,
  googleCalendarEventsWriteScope,
  googleCalendarReadonlyScope,
  hasGoogleCalendarWriteScope,
  validateCalendarProviderPatch,
  validateIdempotencyKey,
} from "@/features/calendar/provider-write-policy";

describe("Calendar provider-write policy", () => {
  it("requires a write-capable Google Calendar OAuth scope", () => {
    expect(hasGoogleCalendarWriteScope([googleCalendarEventsWriteScope])).toBe(
      true,
    );
    expect(
      hasGoogleCalendarWriteScope(`openid ${googleCalendarBroadWriteScope}`),
    ).toBe(true);
    expect(hasGoogleCalendarWriteScope([googleCalendarReadonlyScope])).toBe(
      false,
    );
  });

  it("marks read-only Calendar scope as reauthorization required", () => {
    expect(
      getGoogleCalendarWriteReadiness([googleCalendarReadonlyScope]),
    ).toEqual({
      hasReadonlyScope: true,
      hasWriteScope: false,
      isWriteReady: false,
      message: "Reconnect Google Calendar with write access before publishing changes.",
      reason: "reauthorization_required",
      status: "reauthorization_required",
    });
    expect(
      getGoogleCalendarWriteReadiness([googleCalendarEventsWriteScope]),
    ).toEqual({
      hasReadonlyScope: false,
      hasWriteScope: true,
      isWriteReady: true,
      message: null,
      status: "write_ready",
    });
  });

  it("detects mixed read and write Calendar scopes as write-ready", () => {
    expect(
      getGoogleCalendarWriteReadiness([
        googleCalendarReadonlyScope,
        googleCalendarEventsWriteScope,
      ]),
    ).toEqual({
      hasReadonlyScope: true,
      hasWriteScope: true,
      isWriteReady: true,
      message: null,
      status: "write_ready",
    });
  });

  it("allows writer and owner calendars", () => {
    expect(evaluatePolicy({ accessRole: "writer" })).toEqual({ allowed: true });
    expect(evaluatePolicy({ accessRole: "owner" })).toEqual({ allowed: true });
  });

  it("blocks reader and freeBusyReader calendars", () => {
    expect(evaluatePolicy({ accessRole: "reader" })).toEqual({
      allowed: false,
      reason: "calendar_not_writable",
    });
    expect(evaluatePolicy({ accessRole: "freeBusyReader" })).toEqual({
      allowed: false,
      reason: "calendar_not_writable",
    });
  });

  it("blocks deleted and unselected calendars", () => {
    expect(evaluatePolicy({ isDeleted: true })).toEqual({
      allowed: false,
      reason: "calendar_deleted",
    });
    expect(evaluatePolicy({ isSelected: false })).toEqual({
      allowed: false,
      reason: "calendar_not_selected",
    });
  });

  it("blocks inactive connections and read-only tokens", () => {
    expect(evaluatePolicy({ connectionStatus: "disabled" })).toEqual({
      allowed: false,
      reason: "connection_not_active",
    });
    expect(evaluatePolicy({ scopes: [googleCalendarReadonlyScope] })).toEqual({
      allowed: false,
      reason: "reauthorization_required",
    });
  });

  it("blocks update/delete/publish operations without a source event id", () => {
    expect(
      evaluatePolicy({ operation: "update_event", sourceEventId: null }),
    ).toEqual({
      allowed: false,
      reason: "missing_source_event_id",
    });
    expect(
      evaluatePolicy({ operation: "delete_event", sourceEventId: null }),
    ).toEqual({
      allowed: false,
      reason: "missing_source_event_id",
    });
    expect(
      evaluatePolicy({
        operation: "publish_note_description",
        sourceEventId: null,
      }),
    ).toEqual({
      allowed: false,
      reason: "missing_source_event_id",
    });
  });

  it("rejects recurring events for non-recurring write policy", () => {
    expect(evaluatePolicy({ recurringEventId: "series-1" })).toEqual({
      allowed: false,
      reason: "recurring_event_not_supported",
    });
  });

  it("allows this-event-only recurrence edits with explicit occurrence context", () => {
    expect(
      evaluateThisEventOnlyRecurrenceEditPolicy({
        context: recurrenceContextFixture(),
        scope: "this_event_only",
      }),
    ).toEqual({ allowed: true });
  });

  it("blocks unsupported recurrence edit scopes", () => {
    for (const scope of ["this_and_following", "entire_series"] as const) {
      expect(
        evaluateThisEventOnlyRecurrenceEditPolicy({
          context: recurrenceContextFixture(),
          scope,
        }),
      ).toEqual({
        allowed: false,
        reason: "unsupported_recurrence_scope",
      });
    }
  });

  it("requires occurrence identity for this-event-only recurrence edits", () => {
    expect(
      evaluateThisEventOnlyRecurrenceEditPolicy({
        context: recurrenceContextFixture({ recurringEventId: null }),
        scope: "this_event_only",
      }),
    ).toEqual({ allowed: false, reason: "missing_recurring_event_id" });
    expect(
      evaluateThisEventOnlyRecurrenceEditPolicy({
        context: recurrenceContextFixture({ sourceEventId: null }),
        scope: "this_event_only",
      }),
    ).toEqual({ allowed: false, reason: "missing_source_event_id" });
    expect(
      evaluateThisEventOnlyRecurrenceEditPolicy({
        context: recurrenceContextFixture({ originalStartAt: null }),
        scope: "this_event_only",
      }),
    ).toEqual({ allowed: false, reason: "missing_original_start" });
    expect(
      evaluateThisEventOnlyRecurrenceEditPolicy({
        context: recurrenceContextFixture({ etag: null }),
        scope: "this_event_only",
      }),
    ).toEqual({ allowed: false, reason: "missing_cached_etag" });
  });

  it("classifies fetched provider occurrences before recurring writes", () => {
    expect(
      classifyFetchedRecurringOccurrence({
        providerEvent: providerOccurrenceFixture(),
        requestedEvent: {
          recurringEventId: "series-1",
          sourceEventId: "occurrence-1",
        },
      }),
    ).toEqual({ ok: true });
  });

  it("rejects provider master or mismatched recurrence responses", () => {
    expect(
      classifyFetchedRecurringOccurrence({
        providerEvent: providerOccurrenceFixture({
          originalStartAt: null,
          recurringEventId: null,
        }),
        requestedEvent: {
          recurringEventId: "series-1",
          sourceEventId: "occurrence-1",
        },
      }),
    ).toEqual({ ok: false, reason: "provider_master_response" });
    expect(
      classifyFetchedRecurringOccurrence({
        providerEvent: providerOccurrenceFixture({
          sourceEventId: "occurrence-2",
        }),
        requestedEvent: {
          recurringEventId: "series-1",
          sourceEventId: "occurrence-1",
        },
      }),
    ).toEqual({ ok: false, reason: "provider_source_event_mismatch" });
    expect(
      classifyFetchedRecurringOccurrence({
        providerEvent: providerOccurrenceFixture({
          recurringEventId: "series-2",
        }),
        requestedEvent: {
          recurringEventId: "series-1",
          sourceEventId: "occurrence-1",
        },
      }),
    ).toEqual({
      ok: false,
      reason: "provider_recurring_identity_mismatch",
    });
  });

  it("keeps publish_note_description and update_event as distinct operations", () => {
    expect(calendarProviderWriteOperations).toContain(
      "publish_note_description",
    );
    expect(calendarProviderWriteOperations).toContain("update_event");
    expect("publish_note_description").not.toBe("update_event");
  });

  it("centralizes audit status values", () => {
    expect(calendarProviderWriteStatuses).toEqual([
      "pending",
      "running",
      "succeeded",
      "failed",
      "conflict",
      "skipped",
    ]);
  });

  it("allows only approved provider PATCH fields", () => {
    expect(
      validateCalendarProviderPatch({
        description: "Prep notes",
        end: { dateTime: "2026-05-04T16:30:00-05:00" },
        location: "Chicago",
        start: { dateTime: "2026-05-04T16:00:00-05:00" },
        summary: "Planning",
      }),
    ).toEqual({
      ok: true,
      patch: {
        description: "Prep notes",
        end: { dateTime: "2026-05-04T16:30:00-05:00" },
        location: "Chicago",
        start: { dateTime: "2026-05-04T16:00:00-05:00" },
        summary: "Planning",
      },
    });
  });

  it("rejects local-only review state and note identifiers in provider patches", () => {
    expect(validateCalendarProviderPatch({ reviewStatus: "done" })).toEqual({
      field: "reviewStatus",
      ok: false,
      reason: "blocked_field",
    });
    expect(validateCalendarProviderPatch({ linkedNoteId: "note-1" })).toEqual({
      field: "linkedNoteId",
      ok: false,
      reason: "blocked_field",
    });
  });

  it("rejects blocked provider fields in provider patches", () => {
    for (const field of [
      "attendees",
      "recurrence",
      "reminders",
      "notifications",
      "attachments",
      "conferenceData",
      "visibility",
      "transparency",
      "rawPayload",
      "calendarSettings",
    ]) {
      expect(validateCalendarProviderPatch({ [field]: true })).toEqual({
        field,
        ok: false,
        reason: "blocked_field",
      });
    }
  });

  it("rejects unknown provider patch fields", () => {
    expect(validateCalendarProviderPatch({ color: "blue" })).toEqual({
      field: "color",
      ok: false,
      reason: "unknown_field",
    });
  });

  it("blocks stale local cache unless provider freshness validation will run", () => {
    const now = new Date("2026-05-04T18:00:00.000Z");

    expect(
      evaluateProviderWriteFreshnessPolicy({
        lastSuccessfulSyncAt: new Date("2026-05-04T16:30:00.000Z"),
        now,
        willFetchProviderFreshness: false,
      }),
    ).toEqual({ allowed: false, reason: "stale_cache" });
    expect(
      evaluateProviderWriteFreshnessPolicy({
        lastSuccessfulSyncAt: new Date("2026-05-04T17:30:00.000Z"),
        now,
        willFetchProviderFreshness: false,
      }),
    ).toEqual({ allowed: true, requiresProviderFreshnessCheck: false });
  });

  it("allows stale local cache only when fetch-before-write validation is explicit", () => {
    expect(
      evaluateProviderWriteFreshnessPolicy({
        lastSuccessfulSyncAt: null,
        now: new Date("2026-05-04T18:00:00.000Z"),
        willFetchProviderFreshness: true,
      }),
    ).toEqual({ allowed: true, requiresProviderFreshnessCheck: true });
  });

  it("requires an idempotency key", () => {
    expect(validateIdempotencyKey("")).toEqual({
      ok: false,
      reason: "missing_idempotency_key",
    });
    expect(validateIdempotencyKey(" key-1 ")).toEqual({
      idempotencyKey: "key-1",
      ok: true,
    });
  });

  it("prevents duplicate idempotency keys from starting a second provider write", () => {
    expect(
      getDuplicateIdempotencyPolicy({ existingStatus: "succeeded" }),
    ).toEqual({
      shouldStartProviderWrite: false,
      statusToSurface: "succeeded",
    });
  });

  it("surfaces failed and conflict idempotency states instead of hiding them", () => {
    expect(getDuplicateIdempotencyPolicy({ existingStatus: "failed" })).toEqual(
      {
        shouldStartProviderWrite: false,
        statusToSurface: "failed",
      },
    );
    expect(
      getDuplicateIdempotencyPolicy({ existingStatus: "conflict" }),
    ).toEqual({
      shouldStartProviderWrite: false,
      statusToSurface: "conflict",
    });
  });

  it("keeps Calendar as the provider-write policy owner for Today entry points", () => {
    expect(calendarProviderWritePolicyOwner).toBe("calendar");
    expect(getCalendarProviderWriteActionOwner("calendar")).toBe("calendar");
    expect(getCalendarProviderWriteActionOwner("today")).toBe("calendar");
  });
});

function evaluatePolicy({
  accessRole = "writer",
  connectionStatus = "active",
  isDeleted = false,
  isSelected = true,
  operation = "update_event",
  recurringEventId = null,
  scopes = [googleCalendarEventsWriteScope],
  sourceEventId = "event-1",
}: {
  accessRole?: string | null;
  connectionStatus?: string;
  isDeleted?: boolean;
  isSelected?: boolean;
  operation?: "delete_event" | "publish_note_description" | "update_event";
  recurringEventId?: string | null;
  scopes?: string[];
  sourceEventId?: string | null;
}) {
  return evaluateCalendarProviderWritePolicy({
    calendar: {
      accessRole,
      isDeleted,
      isSelected,
    },
    connectionStatus,
    event: {
      recurringEventId,
      sourceEventId,
    },
    operation,
    scopes,
  });
}

function recurrenceContextFixture(
  overrides: Partial<{
    etag: string | null;
    originalStartAt: Date | null;
    recurringEventId: string | null;
    sourceEventId: string | null;
  }> = {},
) {
  return {
    etag: "etag-1",
    originalStartAt: new Date("2026-05-04T14:00:00.000Z"),
    recurringEventId: "series-1",
    sourceEventId: "occurrence-1",
    ...overrides,
  };
}

function providerOccurrenceFixture(
  overrides: Partial<{
    originalStartAt: Date | null;
    recurringEventId: string | null;
    sourceEventId: string | null;
  }> = {},
) {
  return {
    originalStartAt: new Date("2026-05-04T14:00:00.000Z"),
    recurringEventId: "series-1",
    sourceEventId: "occurrence-1",
    ...overrides,
  };
}
