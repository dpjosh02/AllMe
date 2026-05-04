import type {
  GoogleCalendarProviderEvent,
  GoogleCalendarProviderEventPatch,
} from "@/features/calendar/integrations/google-calendar";
import {
  evaluateCalendarProviderWritePolicy,
  validateCalendarProviderPatch,
  validateIdempotencyKey,
  type CalendarProviderWriteOperation,
  type CalendarProviderWriteStatus,
  type OAuthScopeInput,
} from "@/features/calendar/provider-write-policy";
import {
  CalendarProviderWriteUserError,
  type ProviderWriteAuditDraft,
} from "@/features/calendar/provider-write/publish-note-description";
import { addDaysToDateKey, isDateKey } from "@/features/today/date";

export const createEventOperation =
  "create_event" satisfies CalendarProviderWriteOperation;

export type CreateCalendarEventContext = {
  accessRole: string | null;
  calendarId: string;
  connectionId: string;
  connectionStatus: string;
  isCalendarDeleted: boolean;
  isCalendarSelected: boolean;
  scopes: OAuthScopeInput;
  sourceCalendarId: string;
  timezone: string | null;
};

export type CalendarEventCreateForm = {
  description: string;
  endDate: string;
  endTime: string;
  isAllDay: boolean;
  location: string;
  startDate: string;
  startTime: string;
  title: string;
};

export type CreateCalendarEventDependencies = {
  createAudit: (draft: ProviderWriteAuditDraft) => Promise<{ id: string }>;
  createProviderEvent: (input: {
    accessToken: string;
    patch: GoogleCalendarProviderEventPatch;
    sourceCalendarId: string;
  }) => Promise<GoogleCalendarProviderEvent>;
  markAudit: (input: {
    auditId: string;
    errorCode?: string | null;
    errorSummary?: string | null;
    providerEtag?: string | null;
    providerUpdatedAt?: Date | null;
    status: CalendarProviderWriteStatus;
  }) => Promise<void>;
  reconcileLocalEvent: (event: GoogleCalendarProviderEvent) => Promise<void>;
  resolveAccessToken: () => Promise<{ accessToken: string; scopes: OAuthScopeInput }>;
};

export type CreateCalendarEventInput = {
  context: CreateCalendarEventContext;
  form: CalendarEventCreateForm;
  idempotencyKey: string | null | undefined;
};

export async function createCalendarEventInGoogle({
  deps,
  input,
}: {
  deps: CreateCalendarEventDependencies;
  input: CreateCalendarEventInput;
}) {
  const idempotency = validateIdempotencyKey(input.idempotencyKey);

  if (!idempotency.ok) {
    throw new CalendarProviderWriteUserError(
      "Create request is missing an idempotency key. Refresh and try again.",
      "missing_idempotency_key",
    );
  }

  const eventPatch = buildCreateEventPatch({
    form: input.form,
    timezone: input.context.timezone,
  });
  const patchValidation = validateCalendarProviderPatch(eventPatch);

  if (!patchValidation.ok) {
    throw new CalendarProviderWriteUserError(
      "Create request contains unsupported Google Calendar fields.",
      "unsupported_event",
    );
  }

  const audit = await deps.createAudit({
    calendarId: input.context.calendarId,
    connectionId: input.context.connectionId,
    entryPoint: "calendar",
    eventId: null,
    idempotencyKey: idempotency.idempotencyKey,
    operation: createEventOperation,
    previousEtag: null,
    requestPatch: patchValidation.patch,
    scopeSnapshot: normalizeScopeSnapshot(input.context.scopes),
    sourceCalendarId: input.context.sourceCalendarId,
    sourceEventId: null,
  });

  const policy = evaluateCalendarProviderWritePolicy({
    calendar: {
      accessRole: input.context.accessRole,
      isDeleted: input.context.isCalendarDeleted,
      isSelected: input.context.isCalendarSelected,
    },
    connectionStatus: input.context.connectionStatus,
    operation: createEventOperation,
    scopes: input.context.scopes,
  });

  if (!policy.allowed) {
    await deps.markAudit({
      auditId: audit.id,
      errorCode: policy.reason,
      errorSummary: getCreatePolicyErrorMessage(policy.reason),
      status: "skipped",
    });
    throw new CalendarProviderWriteUserError(
      getCreatePolicyErrorMessage(policy.reason),
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
      operation: createEventOperation,
      scopes: token.scopes,
    });

    if (!tokenPolicy.allowed) {
      await deps.markAudit({
        auditId: audit.id,
        errorCode: tokenPolicy.reason,
        errorSummary: getCreatePolicyErrorMessage(tokenPolicy.reason),
        status: "skipped",
      });
      throw new CalendarProviderWriteUserError(
        getCreatePolicyErrorMessage(tokenPolicy.reason),
        "reauthorization_required",
      );
    }

    await deps.markAudit({ auditId: audit.id, status: "running" });

    const createdEvent = await deps.createProviderEvent({
      accessToken: token.accessToken,
      patch: eventPatch,
      sourceCalendarId: input.context.sourceCalendarId,
    });

    await deps.reconcileLocalEvent(createdEvent);
    await deps.markAudit({
      auditId: audit.id,
      providerEtag: createdEvent.etag,
      providerUpdatedAt: createdEvent.providerUpdatedAt,
      status: "succeeded",
    });

    return {
      eventId: createdEvent.sourceEventId,
      status: "succeeded" as const,
    };
  } catch (error) {
    if (error instanceof CalendarProviderWriteUserError) {
      throw error;
    }

    await deps.markAudit({
      auditId: audit.id,
      errorCode: "provider_write_failed",
      errorSummary: "Google Calendar event creation failed. Try again after syncing.",
      status: "failed",
    });
    throw new CalendarProviderWriteUserError(
      "Google Calendar event creation failed. Try again after syncing.",
      "provider_write_failed",
    );
  }
}

export function buildCreateEventPatch({
  form,
  timezone,
}: {
  form: CalendarEventCreateForm;
  timezone: string | null;
}): GoogleCalendarProviderEventPatch {
  const title = form.title.trim();
  const startDate = form.startDate.trim();
  const endDate = form.endDate.trim();

  if (!title) {
    throw new CalendarProviderWriteUserError(
      "Event title is required.",
      "unsupported_event",
    );
  }

  if (!isDateKey(startDate) || !isDateKey(endDate)) {
    throw new CalendarProviderWriteUserError(
      "Event start and end dates are required.",
      "unsupported_event",
    );
  }

  return form.isAllDay
    ? buildAllDayCreateEventPatch({ endDate, form, startDate, title })
    : buildTimedCreateEventPatch({ endDate, form, startDate, timezone, title });
}

function buildAllDayCreateEventPatch({
  endDate,
  form,
  startDate,
  title,
}: {
  endDate: string;
  form: CalendarEventCreateForm;
  startDate: string;
  title: string;
}): GoogleCalendarProviderEventPatch {
  if (endDate < startDate) {
    throw new CalendarProviderWriteUserError(
      "All-day event end date must be on or after the start date.",
      "unsupported_event",
    );
  }

  return compactProviderPatch({
    description: normalizeOptionalText(form.description),
    end: { date: addDaysToDateKey(endDate, 1) },
    location: normalizeOptionalText(form.location),
    start: { date: startDate },
    summary: title,
  });
}

function buildTimedCreateEventPatch({
  endDate,
  form,
  startDate,
  timezone,
  title,
}: {
  endDate: string;
  form: CalendarEventCreateForm;
  startDate: string;
  timezone: string | null;
  title: string;
}): GoogleCalendarProviderEventPatch {
  const startTime = form.startTime.trim();
  const endTime = form.endTime.trim();

  if (!isTimeInput(startTime) || !isTimeInput(endTime)) {
    throw new CalendarProviderWriteUserError(
      "Timed events require start and end times.",
      "unsupported_event",
    );
  }

  const startDateTime = `${startDate}T${startTime}:00`;
  const endDateTime = `${endDate}T${endTime}:00`;

  if (endDateTime <= startDateTime) {
    throw new CalendarProviderWriteUserError(
      "Event end time must be after the start time.",
      "unsupported_event",
    );
  }

  return compactProviderPatch({
    description: normalizeOptionalText(form.description),
    end: { dateTime: endDateTime, timeZone: timezone ?? undefined },
    location: normalizeOptionalText(form.location),
    start: { dateTime: startDateTime, timeZone: timezone ?? undefined },
    summary: title,
  });
}

function compactProviderPatch(
  patch: GoogleCalendarProviderEventPatch,
): GoogleCalendarProviderEventPatch {
  const compacted: GoogleCalendarProviderEventPatch = {
    end: patch.end,
    start: patch.start,
    summary: patch.summary,
  };

  if (patch.description) {
    compacted.description = patch.description;
  }

  if (patch.location) {
    compacted.location = patch.location;
  }

  return compacted;
}

function normalizeOptionalText(value: string) {
  const normalized = value.trim();

  return normalized ? normalized : null;
}

function isTimeInput(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

function normalizeScopeSnapshot(scopes: OAuthScopeInput) {
  if (Array.isArray(scopes)) {
    return scopes;
  }

  return scopes?.split(" ").filter(Boolean) ?? [];
}

function getCreatePolicyErrorMessage(
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
      return "Reconnect Google Calendar with write access before creating events.";
    case "calendar_not_writable":
      return "This calendar does not allow Google Calendar event creation.";
    case "calendar_deleted":
    case "calendar_not_selected":
      return "This calendar is not available for provider writes.";
    case "connection_not_active":
      return "Google Calendar is not connected for provider writes.";
    case "missing_source_event_id":
    case "recurring_event_not_supported":
      return "This event create request is not supported.";
  }
}
