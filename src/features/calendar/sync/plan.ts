export type CalendarSyncSnapshot = {
  calendars: ProviderCalendarSnapshot[];
  events: ProviderCalendarEventSnapshot[];
};

export type ProviderCalendarSnapshot = {
  accessRole?: string | null;
  color?: string | null;
  description?: string | null;
  isDeleted?: boolean;
  isPrimary?: boolean;
  isSelected?: boolean;
  name: string;
  rawPayload: Record<string, unknown>;
  sourceCalendarId: string;
  syncToken?: string | null;
  timezone?: string | null;
};

export type ProviderCalendarEventSnapshot = {
  description?: string | null;
  endAt?: Date | null;
  endDate?: string | null;
  etag?: string | null;
  htmlLink?: string | null;
  location?: string | null;
  originalStartAt?: Date | null;
  providerUpdatedAt?: Date | null;
  rawPayload: Record<string, unknown>;
  recurringEventId?: string | null;
  sourceCalendarId: string;
  sourceEventId: string;
  sourceIcalUid?: string | null;
  startAt?: Date | null;
  startDate?: string | null;
  status?: "cancelled" | "confirmed" | "tentative";
  timezone?: string | null;
  title?: string | null;
  transparency?: string | null;
  visibility?: string | null;
};

export type CalendarCandidate = {
  accessRole: string | null;
  color: string | null;
  description: string | null;
  isDeleted: boolean;
  isPrimary: boolean;
  isSelected: boolean;
  name: string;
  rawPayload: Record<string, unknown>;
  sourceCalendarId: string;
  syncToken: string | null;
  timezone: string | null;
};

export type CalendarEventCandidate = {
  cancelledAt: Date | null;
  description: string | null;
  endAt: Date | null;
  endDate: string | null;
  etag: string | null;
  htmlLink: string | null;
  isAllDay: boolean;
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
  title: string;
  transparency: string | null;
  visibility: string | null;
};

export type CalendarSyncImportPlan = {
  calendars: CalendarCandidate[];
  events: CalendarEventCandidate[];
  unmatchedEvents: CalendarEventCandidate[];
};

export function createCalendarSyncImportPlan(
  snapshot: CalendarSyncSnapshot,
  { observedAt = new Date() }: { observedAt?: Date } = {},
): CalendarSyncImportPlan {
  const calendars = dedupeBy(
    snapshot.calendars.map(toCalendarCandidate),
    (calendar) => calendar.sourceCalendarId,
  );
  const sourceCalendarIds = new Set(
    calendars.map((calendar) => calendar.sourceCalendarId),
  );
  const events = dedupeBy(
    snapshot.events.map((event) => toCalendarEventCandidate(event, observedAt)),
    (event) => `${event.sourceCalendarId}:${event.sourceEventId}`,
  );

  return {
    calendars,
    events: events.filter((event) => sourceCalendarIds.has(event.sourceCalendarId)),
    unmatchedEvents: events.filter(
      (event) => !sourceCalendarIds.has(event.sourceCalendarId),
    ),
  };
}

function toCalendarCandidate(calendar: ProviderCalendarSnapshot): CalendarCandidate {
  return {
    accessRole: calendar.accessRole ?? null,
    color: calendar.color ?? null,
    description: calendar.description ?? null,
    isDeleted: calendar.isDeleted ?? false,
    isPrimary: calendar.isPrimary ?? false,
    isSelected: calendar.isSelected ?? true,
    name: calendar.name,
    rawPayload: calendar.rawPayload,
    sourceCalendarId: calendar.sourceCalendarId,
    syncToken: calendar.syncToken ?? null,
    timezone: calendar.timezone ?? null,
  };
}

function toCalendarEventCandidate(
  event: ProviderCalendarEventSnapshot,
  observedAt: Date,
): CalendarEventCandidate {
  const status = event.status ?? "confirmed";
  const startDate = event.startDate ?? null;
  const endDate = event.endDate ?? null;
  const startAt = event.startAt ?? null;
  const endAt = event.endAt ?? null;

  return {
    cancelledAt: status === "cancelled" ? observedAt : null,
    description: event.description ?? null,
    endAt,
    endDate,
    etag: event.etag ?? null,
    htmlLink: event.htmlLink ?? null,
    isAllDay: Boolean(startDate),
    location: event.location ?? null,
    originalStartAt: event.originalStartAt ?? null,
    providerUpdatedAt: event.providerUpdatedAt ?? null,
    rawPayload: event.rawPayload,
    recurringEventId: event.recurringEventId ?? null,
    sourceCalendarId: event.sourceCalendarId,
    sourceEventId: event.sourceEventId,
    sourceIcalUid: event.sourceIcalUid ?? null,
    startAt,
    startDate,
    status,
    timezone: event.timezone ?? null,
    title: normalizeTitle(event.title),
    transparency: event.transparency ?? null,
    visibility: event.visibility ?? null,
  };
}

function normalizeTitle(title: string | null | undefined) {
  const normalizedTitle = title?.trim();

  return normalizedTitle ? normalizedTitle : "(No title)";
}

function dedupeBy<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();
  const deduped: T[] = [];

  for (const item of items) {
    const key = getKey(item);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}
