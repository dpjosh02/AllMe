import {
  evaluateCalendarProviderWritePolicy,
  validateCalendarProviderPatch,
  validateIdempotencyKey,
  type CalendarProviderWriteOperation,
  type CalendarProviderWriteStatus,
  type OAuthScopeInput,
} from "@/features/calendar/provider-write-policy";
import type { GoogleCalendarProviderEvent } from "@/features/calendar/integrations/google-calendar";

export const publishNoteDescriptionOperation =
  "publish_note_description" satisfies CalendarProviderWriteOperation;

export class CalendarProviderWriteUserError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "calendar_not_writable"
      | "conflict"
      | "missing_idempotency_key"
      | "provider_write_failed"
      | "reauthorization_required"
      | "unsupported_event",
  ) {
    super(message);
    this.name = "CalendarProviderWriteUserError";
  }
}

export type PublishNoteDescriptionEventContext = {
  accessRole: string | null;
  calendarId: string;
  connectionId: string;
  connectionStatus: string;
  description: string | null;
  etag: string | null;
  eventId: string | null;
  isCalendarDeleted: boolean;
  isCalendarSelected: boolean;
  linkedNoteBody: string;
  linkedNoteId: string;
  recurringEventId: string | null;
  scopes: OAuthScopeInput;
  sourceCalendarId: string;
  sourceEventId: string | null;
};

export type ProviderWriteAuditDraft = {
  calendarId: string;
  connectionId: string;
  entryPoint: "calendar";
  eventId: string | null;
  idempotencyKey: string;
  operation: CalendarProviderWriteOperation;
  previousEtag: string | null;
  requestPatch: Record<string, unknown>;
  scopeSnapshot: string[];
  sourceCalendarId: string;
  sourceEventId: string | null;
};

export type PublishNoteDescriptionDependencies = {
  createAudit: (draft: ProviderWriteAuditDraft) => Promise<{ id: string }>;
  fetchProviderEvent: (input: {
    accessToken: string;
    sourceCalendarId: string;
    sourceEventId: string;
  }) => Promise<GoogleCalendarProviderEvent>;
  markAudit: (input: {
    auditId: string;
    errorCode?: string | null;
    errorSummary?: string | null;
    providerEtag?: string | null;
    providerUpdatedAt?: Date | null;
    status: CalendarProviderWriteStatus;
  }) => Promise<void>;
  patchProviderDescription: (input: {
    accessToken: string;
    description: string;
    sourceCalendarId: string;
    sourceEventId: string;
  }) => Promise<GoogleCalendarProviderEvent>;
  reconcileLocalEvent: (event: GoogleCalendarProviderEvent) => Promise<void>;
  resolveAccessToken: () => Promise<{ accessToken: string; scopes: OAuthScopeInput }>;
};

export type PublishNoteDescriptionInput = {
  context: PublishNoteDescriptionEventContext;
  idempotencyKey: string | null | undefined;
};

export async function publishNoteDescriptionToGoogle({
  deps,
  input,
}: {
  deps: PublishNoteDescriptionDependencies;
  input: PublishNoteDescriptionInput;
}) {
  const idempotency = validateIdempotencyKey(input.idempotencyKey);

  if (!idempotency.ok) {
    throw new CalendarProviderWriteUserError(
      "Publish request is missing an idempotency key. Refresh and try again.",
      "missing_idempotency_key",
    );
  }

  const requestPatch = { description: input.context.linkedNoteBody };
  const patchValidation = validateCalendarProviderPatch(requestPatch);

  if (!patchValidation.ok) {
    throw new CalendarProviderWriteUserError(
      "Publish request contains unsupported Google Calendar fields.",
      "unsupported_event",
    );
  }

  const audit = await deps.createAudit({
    calendarId: input.context.calendarId,
    connectionId: input.context.connectionId,
    entryPoint: "calendar",
    eventId: input.context.eventId,
    idempotencyKey: idempotency.idempotencyKey,
    operation: publishNoteDescriptionOperation,
    previousEtag: input.context.etag,
    requestPatch: patchValidation.patch,
    scopeSnapshot: normalizeScopeSnapshot(input.context.scopes),
    sourceCalendarId: input.context.sourceCalendarId,
    sourceEventId: input.context.sourceEventId,
  });

  const policy = evaluateCalendarProviderWritePolicy({
    calendar: {
      accessRole: input.context.accessRole,
      isDeleted: input.context.isCalendarDeleted,
      isSelected: input.context.isCalendarSelected,
    },
    connectionStatus: input.context.connectionStatus,
    event: {
      recurringEventId: input.context.recurringEventId,
      sourceEventId: input.context.sourceEventId,
    },
    operation: publishNoteDescriptionOperation,
    scopes: input.context.scopes,
  });

  if (!policy.allowed) {
    await deps.markAudit({
      auditId: audit.id,
      errorCode: policy.reason,
      errorSummary: getPolicyErrorMessage(policy.reason),
      status: "skipped",
    });
    throw new CalendarProviderWriteUserError(
      getPolicyErrorMessage(policy.reason),
      policy.reason === "reauthorization_required"
        ? "reauthorization_required"
        : "calendar_not_writable",
    );
  }

  try {
    const token = await deps.resolveAccessToken();
    const tokenPolicy = evaluateCalendarProviderWritePolicy({
      calendar: {
        accessRole: input.context.accessRole,
        isDeleted: input.context.isCalendarDeleted,
        isSelected: input.context.isCalendarSelected,
      },
      connectionStatus: input.context.connectionStatus,
      event: {
        recurringEventId: input.context.recurringEventId,
        sourceEventId: input.context.sourceEventId,
      },
      operation: publishNoteDescriptionOperation,
      scopes: token.scopes,
    });

    if (!tokenPolicy.allowed) {
      await deps.markAudit({
        auditId: audit.id,
        errorCode: tokenPolicy.reason,
        errorSummary: getPolicyErrorMessage(tokenPolicy.reason),
        status: "skipped",
      });
      throw new CalendarProviderWriteUserError(
        getPolicyErrorMessage(tokenPolicy.reason),
        "reauthorization_required",
      );
    }

    await deps.markAudit({ auditId: audit.id, status: "running" });

    const sourceEventId = requireSourceEventId(input.context.sourceEventId);
    const currentProviderEvent = await deps.fetchProviderEvent({
      accessToken: token.accessToken,
      sourceCalendarId: input.context.sourceCalendarId,
      sourceEventId,
    });

    if (currentProviderEvent.etag !== input.context.etag) {
      await deps.markAudit({
        auditId: audit.id,
        errorCode: "etag_conflict",
        errorSummary:
          "Google Calendar changed since AllMe last synced. Sync Calendar and try again.",
        status: "conflict",
      });
      throw new CalendarProviderWriteUserError(
        "Google Calendar changed since AllMe last synced. Sync Calendar and try again.",
        "conflict",
      );
    }

    const patchedEvent = await deps.patchProviderDescription({
      accessToken: token.accessToken,
      description: input.context.linkedNoteBody,
      sourceCalendarId: input.context.sourceCalendarId,
      sourceEventId,
    });

    await deps.reconcileLocalEvent(patchedEvent);
    await deps.markAudit({
      auditId: audit.id,
      providerEtag: patchedEvent.etag,
      providerUpdatedAt: patchedEvent.providerUpdatedAt,
      status: "succeeded",
    });

    return {
      description: patchedEvent.description,
      eventId: input.context.eventId,
      status: "succeeded" as const,
    };
  } catch (error) {
    if (error instanceof CalendarProviderWriteUserError) {
      throw error;
    }

    await deps.markAudit({
      auditId: audit.id,
      errorCode: "provider_write_failed",
      errorSummary: "Google Calendar publish failed. Try again after syncing.",
      status: "failed",
    });
    throw new CalendarProviderWriteUserError(
      "Google Calendar publish failed. Try again after syncing.",
      "provider_write_failed",
    );
  }
}

function requireSourceEventId(sourceEventId: string | null) {
  if (!sourceEventId) {
    throw new CalendarProviderWriteUserError(
      "Calendar event is missing its Google event id.",
      "unsupported_event",
    );
  }

  return sourceEventId;
}

function normalizeScopeSnapshot(scopes: OAuthScopeInput) {
  if (Array.isArray(scopes)) {
    return scopes;
  }

  return scopes?.split(" ").filter(Boolean) ?? [];
}

function getPolicyErrorMessage(
  reason:
    | "calendar_deleted"
    | "calendar_not_selected"
    | "calendar_not_writable"
    | "connection_not_active"
    | "missing_source_event_id"
    | "reauthorization_required"
    | "recurring_event_not_supported",
) {
  switch (reason) {
    case "reauthorization_required":
      return "Reconnect Google Calendar with write access before publishing changes.";
    case "calendar_not_writable":
      return "This calendar does not allow Google Calendar writes.";
    case "calendar_deleted":
    case "calendar_not_selected":
      return "This calendar is not available for provider writes.";
    case "connection_not_active":
      return "Google Calendar is not connected for provider writes.";
    case "missing_source_event_id":
      return "This event is missing its Google event id.";
    case "recurring_event_not_supported":
      return "Recurring event writes are not supported yet.";
  }
}
