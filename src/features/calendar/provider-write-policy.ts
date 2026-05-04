import { parseOAuthScopes } from "@/features/calendar/sync/connection";

export const googleCalendarEventsWriteScope =
  "https://www.googleapis.com/auth/calendar.events";
export const googleCalendarBroadWriteScope =
  "https://www.googleapis.com/auth/calendar";
export const googleCalendarReadonlyScope =
  "https://www.googleapis.com/auth/calendar.readonly";

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
      isWriteReady: true;
      status: "write_ready";
    }
  | {
      isWriteReady: false;
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
  if (hasGoogleCalendarWriteScope(scopes)) {
    return { isWriteReady: true, status: "write_ready" };
  }

  return {
    isWriteReady: false,
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
