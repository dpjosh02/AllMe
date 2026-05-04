import {
  googleCalendarEventsWriteScope as googleCalendarEventsWriteScopeValue,
  googleCalendarReadonlyScope as googleCalendarReadonlyScopeValue,
  parseOAuthScopes,
} from "@/features/calendar/sync/connection";

export const googleCalendarEventsWriteScope = googleCalendarEventsWriteScopeValue;
export const googleCalendarBroadWriteScope =
  "https://www.googleapis.com/auth/calendar";
export const googleCalendarReadonlyScope = googleCalendarReadonlyScopeValue;
export const googleCalendarWriteReauthorizationMessage =
  "Reconnect Google Calendar with write access before publishing changes.";

export const calendarProviderWriteOperations = [
  "create_event",
  "update_event",
  "delete_event",
  "publish_note_description",
] as const;

export type CalendarProviderWriteOperation =
  (typeof calendarProviderWriteOperations)[number];

export const calendarProviderWriteStatuses = [
  "pending",
  "running",
  "succeeded",
  "failed",
  "conflict",
  "skipped",
] as const;

export type CalendarProviderWriteStatus =
  (typeof calendarProviderWriteStatuses)[number];

export const calendarProviderWriteEntryPoints = ["calendar", "today"] as const;

export type CalendarProviderWriteEntryPoint =
  (typeof calendarProviderWriteEntryPoints)[number];

export const calendarProviderWritePolicyOwner = "calendar" as const;
export const providerWriteStaleThresholdMs = 60 * 60 * 1000;

export type OAuthScopeInput = string | string[] | null | undefined;

export type CalendarProviderWriteReadiness =
  | {
      hasReadonlyScope: boolean;
      hasWriteScope: true;
      isWriteReady: true;
      message: null;
      status: "write_ready";
    }
  | {
      hasReadonlyScope: boolean;
      hasWriteScope: false;
      isWriteReady: false;
      message: typeof googleCalendarWriteReauthorizationMessage;
      reason: "reauthorization_required";
      status: "reauthorization_required";
    };

export type CalendarProviderWritePolicyInput = {
  calendar: {
    accessRole: string | null | undefined;
    isDeleted: boolean;
    isSelected: boolean;
  };
  connectionStatus:
    | "active"
    | "disabled"
    | "reauthorization_required"
    | "revoked"
    | string;
  event?: {
    recurringEventId?: string | null;
    sourceEventId?: string | null;
  };
  operation: CalendarProviderWriteOperation;
  scopes: OAuthScopeInput;
};

export type CalendarProviderWritePolicyResult =
  | { allowed: true }
  | {
      allowed: false;
      reason:
        | "calendar_deleted"
        | "calendar_not_selected"
        | "calendar_not_writable"
        | "connection_not_active"
        | "missing_source_event_id"
        | "reauthorization_required"
        | "recurring_event_not_supported";
    };

export type CalendarProviderPatchValidation =
  | {
      ok: true;
      patch: Partial<Record<CalendarProviderPatchKey, unknown>>;
    }
  | {
      field: string;
      ok: false;
      reason: "blocked_field" | "unknown_field";
    };

export type CalendarRecurrenceEditScope =
  | "entire_series"
  | "this_and_following"
  | "this_event_only";

export type CalendarThisEventOnlyContext = {
  etag?: string | null;
  originalStartAt?: Date | null;
  recurringEventId?: string | null;
  sourceEventId?: string | null;
};

export type CalendarProviderRecurrenceClassificationInput = {
  providerEvent: {
    originalStartAt?: Date | null;
    recurringEventId?: string | null;
    sourceEventId?: string | null;
  };
  requestedEvent: {
    recurringEventId?: string | null;
    sourceEventId?: string | null;
  };
};

export const calendarProviderPatchAllowedKeys = [
  "summary",
  "description",
  "location",
  "start",
  "end",
] as const;

export type CalendarProviderPatchKey =
  (typeof calendarProviderPatchAllowedKeys)[number];

const calendarProviderPatchBlockedKeys = [
  "acl",
  "attachments",
  "attendees",
  "calendarColor",
  "calendarSettings",
  "colorId",
  "conferenceData",
  "guestsCanInviteOthers",
  "guestsCanModify",
  "guestsCanSeeOtherGuests",
  "linkedNoteBody",
  "linkedNoteId",
  "linkedNoteTitle",
  "localNoteId",
  "notifications",
  "originalStartTime",
  "raw_payload",
  "rawPayload",
  "recurrence",
  "recurringEventId",
  "reminders",
  "reviewState",
  "reviewStatus",
  "settings",
  "transparency",
  "visibility",
] as const;

const writeCapableGoogleCalendarScopes = new Set([
  googleCalendarEventsWriteScope,
  googleCalendarBroadWriteScope,
]);

const writableCalendarAccessRoles = new Set(["writer", "owner"]);
const operationsRequiringSourceEventId =
  new Set<CalendarProviderWriteOperation>([
    "delete_event",
    "publish_note_description",
    "update_event",
  ]);
const allowedPatchKeys = new Set<string>(calendarProviderPatchAllowedKeys);
const blockedPatchKeys = new Set<string>(calendarProviderPatchBlockedKeys);

export function normalizeOAuthScopes(scopes: OAuthScopeInput) {
  if (Array.isArray(scopes)) {
    return scopes.map((scope) => scope.trim()).filter(Boolean);
  }

  return parseOAuthScopes(scopes);
}

export function hasGoogleCalendarWriteScope(scopes: OAuthScopeInput) {
  return normalizeOAuthScopes(scopes).some((scope) =>
    writeCapableGoogleCalendarScopes.has(scope),
  );
}

export function getGoogleCalendarWriteReadiness(
  scopes: OAuthScopeInput,
): CalendarProviderWriteReadiness {
  const normalizedScopes = normalizeOAuthScopes(scopes);
  const hasReadonlyScope = normalizedScopes.includes(googleCalendarReadonlyScope);
  const hasWriteScope = normalizedScopes.some((scope) =>
    writeCapableGoogleCalendarScopes.has(scope),
  );

  if (hasWriteScope) {
    return {
      hasReadonlyScope,
      hasWriteScope: true,
      isWriteReady: true,
      message: null,
      status: "write_ready",
    };
  }

  return {
    hasReadonlyScope,
    hasWriteScope: false,
    isWriteReady: false,
    message: googleCalendarWriteReauthorizationMessage,
    reason: "reauthorization_required",
    status: "reauthorization_required",
  };
}

export function isWritableCalendarAccessRole(
  accessRole: string | null | undefined,
) {
  return (
    typeof accessRole === "string" &&
    writableCalendarAccessRoles.has(accessRole)
  );
}

export function isRecurringProviderEvent({
  recurringEventId,
}: {
  recurringEventId?: string | null;
}) {
  return Boolean(recurringEventId);
}

export function evaluateThisEventOnlyRecurrenceEditPolicy({
  context,
  scope,
}: {
  context: CalendarThisEventOnlyContext;
  scope: CalendarRecurrenceEditScope;
}):
  | { allowed: true }
  | {
      allowed: false;
      reason:
        | "missing_cached_etag"
        | "missing_original_start"
        | "missing_recurring_event_id"
        | "missing_source_event_id"
        | "unsupported_recurrence_scope";
    } {
  if (scope !== "this_event_only") {
    return { allowed: false, reason: "unsupported_recurrence_scope" };
  }

  if (!context.recurringEventId) {
    return { allowed: false, reason: "missing_recurring_event_id" };
  }

  if (!context.sourceEventId) {
    return { allowed: false, reason: "missing_source_event_id" };
  }

  if (!context.originalStartAt) {
    return { allowed: false, reason: "missing_original_start" };
  }

  if (!context.etag) {
    return { allowed: false, reason: "missing_cached_etag" };
  }

  return { allowed: true };
}

export function classifyFetchedRecurringOccurrence({
  providerEvent,
  requestedEvent,
}: CalendarProviderRecurrenceClassificationInput):
  | { ok: true }
  | {
      ok: false;
      reason:
        | "provider_master_response"
        | "provider_recurring_identity_mismatch"
        | "provider_source_event_mismatch";
    } {
  if (!providerEvent.recurringEventId || !providerEvent.originalStartAt) {
    return { ok: false, reason: "provider_master_response" };
  }

  if (providerEvent.sourceEventId !== requestedEvent.sourceEventId) {
    return { ok: false, reason: "provider_source_event_mismatch" };
  }

  if (providerEvent.recurringEventId !== requestedEvent.recurringEventId) {
    return { ok: false, reason: "provider_recurring_identity_mismatch" };
  }

  return { ok: true };
}

export function evaluateCalendarProviderWritePolicy(
  input: CalendarProviderWritePolicyInput,
): CalendarProviderWritePolicyResult {
  if (input.connectionStatus !== "active") {
    return { allowed: false, reason: "connection_not_active" };
  }

  if (!getGoogleCalendarWriteReadiness(input.scopes).isWriteReady) {
    return { allowed: false, reason: "reauthorization_required" };
  }

  if (input.calendar.isDeleted) {
    return { allowed: false, reason: "calendar_deleted" };
  }

  if (!input.calendar.isSelected) {
    return { allowed: false, reason: "calendar_not_selected" };
  }

  if (!isWritableCalendarAccessRole(input.calendar.accessRole)) {
    return { allowed: false, reason: "calendar_not_writable" };
  }

  if (
    operationsRequiringSourceEventId.has(input.operation) &&
    !input.event?.sourceEventId
  ) {
    return { allowed: false, reason: "missing_source_event_id" };
  }

  if (input.event && isRecurringProviderEvent(input.event)) {
    return { allowed: false, reason: "recurring_event_not_supported" };
  }

  return { allowed: true };
}

export function validateCalendarProviderPatch(
  patch: Record<string, unknown>,
): CalendarProviderPatchValidation {
  const providerPatch: Partial<Record<CalendarProviderPatchKey, unknown>> = {};

  for (const [field, value] of Object.entries(patch)) {
    if (blockedPatchKeys.has(field)) {
      return { field, ok: false, reason: "blocked_field" };
    }

    if (!allowedPatchKeys.has(field)) {
      return { field, ok: false, reason: "unknown_field" };
    }

    providerPatch[field as CalendarProviderPatchKey] = value;
  }

  return { ok: true, patch: providerPatch };
}

export function isProviderWriteCacheStale({
  lastSuccessfulSyncAt,
  now,
  staleThresholdMs = providerWriteStaleThresholdMs,
}: {
  lastSuccessfulSyncAt: Date | null;
  now: Date;
  staleThresholdMs?: number;
}) {
  if (!lastSuccessfulSyncAt) {
    return true;
  }

  return now.getTime() - lastSuccessfulSyncAt.getTime() > staleThresholdMs;
}

export function evaluateProviderWriteFreshnessPolicy({
  lastSuccessfulSyncAt,
  now,
  staleThresholdMs = providerWriteStaleThresholdMs,
  willFetchProviderFreshness,
}: {
  lastSuccessfulSyncAt: Date | null;
  now: Date;
  staleThresholdMs?: number;
  willFetchProviderFreshness: boolean;
}):
  | {
      allowed: true;
      requiresProviderFreshnessCheck: boolean;
    }
  | {
      allowed: false;
      reason: "stale_cache";
    } {
  const stale = isProviderWriteCacheStale({
    lastSuccessfulSyncAt,
    now,
    staleThresholdMs,
  });

  if (!stale) {
    return { allowed: true, requiresProviderFreshnessCheck: false };
  }

  if (willFetchProviderFreshness) {
    return { allowed: true, requiresProviderFreshnessCheck: true };
  }

  return { allowed: false, reason: "stale_cache" };
}

export function validateIdempotencyKey(
  idempotencyKey: string | null | undefined,
):
  | {
      idempotencyKey: string;
      ok: true;
    }
  | {
      ok: false;
      reason: "missing_idempotency_key";
    } {
  const normalizedKey = idempotencyKey?.trim();

  if (!normalizedKey) {
    return { ok: false, reason: "missing_idempotency_key" };
  }

  return { idempotencyKey: normalizedKey, ok: true };
}

export function getDuplicateIdempotencyPolicy({
  existingStatus,
}: {
  existingStatus: CalendarProviderWriteStatus;
}) {
  return {
    shouldStartProviderWrite: false,
    statusToSurface: existingStatus,
  };
}

export function getCalendarProviderWriteActionOwner(
  _entryPoint: CalendarProviderWriteEntryPoint,
) {
  return calendarProviderWritePolicyOwner;
}
