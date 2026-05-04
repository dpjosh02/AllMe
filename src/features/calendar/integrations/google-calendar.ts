import type {
  CalendarSyncSnapshot,
  ProviderCalendarSnapshot,
  ProviderCalendarEventSnapshot,
} from "@/features/calendar/sync/plan";

const googleCalendarApiBaseUrl = "https://www.googleapis.com/calendar/v3";

type GoogleCalendarListResponse = {
  items?: GoogleCalendarListEntry[];
  nextPageToken?: string;
};

type GoogleCalendarEventsResponse = {
  items?: GoogleCalendarEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
};

type GoogleCalendarListEntry = {
  accessRole?: string;
  backgroundColor?: string;
  deleted?: boolean;
  description?: string;
  id?: string;
  primary?: boolean;
  selected?: boolean;
  summary?: string;
  timeZone?: string;
};

type GoogleCalendarEvent = {
  description?: string;
  end?: GoogleCalendarEventDateTime;
  etag?: string;
  htmlLink?: string;
  iCalUID?: string;
  id?: string;
  location?: string;
  originalStartTime?: GoogleCalendarEventDateTime;
  recurringEventId?: string;
  start?: GoogleCalendarEventDateTime;
  status?: "cancelled" | "confirmed" | "tentative";
  summary?: string;
  transparency?: string;
  updated?: string;
  visibility?: string;
};

type GoogleCalendarEventDateTime = {
  date?: string;
  dateTime?: string;
  timeZone?: string;
};

export type GoogleCalendarSnapshotConfig = {
  accessToken: string;
  calendarIds?: string[];
  fetcher?: typeof fetch;
  maxResults?: number;
  syncTokenByCalendarId?: Map<string, string>;
  timeMax?: Date;
  timeMin?: Date;
};

export type GoogleCalendarProviderEvent = ProviderCalendarEventSnapshot;

export type GoogleCalendarEventWriteConfig = {
  accessToken: string;
  calendarId: string;
  eventId: string;
  fetcher?: typeof fetch;
};

export type GoogleCalendarPatchDescriptionConfig =
  GoogleCalendarEventWriteConfig & {
    description: string;
  };

export async function readGoogleCalendarSnapshot({
  accessToken,
  calendarIds,
  fetcher = fetch,
  maxResults = 2500,
  syncTokenByCalendarId,
  timeMax,
  timeMin,
}: GoogleCalendarSnapshotConfig): Promise<CalendarSyncSnapshot> {
  const calendars = await fetchGoogleCalendarList({ accessToken, fetcher });
  const selectedCalendars = calendarIds
    ? calendars.filter((calendar) => calendarIds.includes(calendar.sourceCalendarId))
    : calendars.filter((calendar) => !calendar.isDeleted && calendar.isSelected);
  const eventsByCalendar = await Promise.all(
    selectedCalendars.map(async (calendar) => {
      const eventsResponse = await fetchGoogleCalendarEvents({
        accessToken,
        calendarId: calendar.sourceCalendarId,
        fetcher,
        maxResults,
        syncToken: syncTokenByCalendarId?.get(calendar.sourceCalendarId),
        timeMax,
        timeMin,
      });

      calendar.syncToken = eventsResponse.nextSyncToken;

      return eventsResponse.events;
    }),
  );

  return {
    calendars,
    events: eventsByCalendar.flat(),
  };
}

export async function fetchGoogleCalendarEvent({
  accessToken,
  calendarId,
  eventId,
  fetcher = fetch,
}: GoogleCalendarEventWriteConfig): Promise<GoogleCalendarProviderEvent> {
  const url = new URL(
    `${googleCalendarApiBaseUrl}/calendars/${encodeURIComponent(
      calendarId,
    )}/events/${encodeURIComponent(eventId)}`,
  );
  const event = await fetchGoogleJson<GoogleCalendarEvent>({
    accessToken,
    fetcher,
    url,
  });

  return toCalendarEventSnapshot({ calendarId, event });
}

export async function patchGoogleCalendarEventDescription({
  accessToken,
  calendarId,
  description,
  eventId,
  fetcher = fetch,
}: GoogleCalendarPatchDescriptionConfig): Promise<GoogleCalendarProviderEvent> {
  const url = new URL(
    `${googleCalendarApiBaseUrl}/calendars/${encodeURIComponent(
      calendarId,
    )}/events/${encodeURIComponent(eventId)}`,
  );
  const event = await fetchGoogleJson<GoogleCalendarEvent>({
    accessToken,
    fetcher,
    init: {
      body: JSON.stringify({ description }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "PATCH",
    },
    url,
  });

  return toCalendarEventSnapshot({ calendarId, event });
}

async function fetchGoogleCalendarList({
  accessToken,
  fetcher,
}: {
  accessToken: string;
  fetcher: typeof fetch;
}) {
  const calendars = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${googleCalendarApiBaseUrl}/users/me/calendarList`);
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const body = await fetchGoogleJson<GoogleCalendarListResponse>({
      accessToken,
      fetcher,
      url,
    });

    calendars.push(...(body.items ?? []).map(toCalendarSnapshot));
    pageToken = body.nextPageToken;
  } while (pageToken);

  return calendars;
}

async function fetchGoogleCalendarEvents({
  accessToken,
  calendarId,
  fetcher,
  maxResults,
  syncToken,
  timeMax,
  timeMin,
}: {
  accessToken: string;
  calendarId: string;
  fetcher: typeof fetch;
  maxResults: number;
  syncToken?: string;
  timeMax?: Date;
  timeMin?: Date;
}) {
  const events = [];
  let nextSyncToken: string | null = null;
  let pageToken: string | undefined;

  do {
    const url = new URL(
      `${googleCalendarApiBaseUrl}/calendars/${encodeURIComponent(calendarId)}/events`,
    );
    url.searchParams.set("maxResults", String(maxResults));
    url.searchParams.set("showDeleted", "true");
    url.searchParams.set("singleEvents", "true");

    if (syncToken) {
      url.searchParams.set("syncToken", syncToken);
    } else {
      if (timeMin) {
        url.searchParams.set("timeMin", timeMin.toISOString());
      }

      if (timeMax) {
        url.searchParams.set("timeMax", timeMax.toISOString());
      }
    }

    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const body = await fetchGoogleJson<GoogleCalendarEventsResponse>({
      accessToken,
      fetcher,
      url,
    });

    events.push(
      ...(body.items ?? []).map((event) =>
        toCalendarEventSnapshot({ calendarId, event }),
      ),
    );
    pageToken = body.nextPageToken;
    nextSyncToken = body.nextSyncToken ?? nextSyncToken;
  } while (pageToken);

  return { events, nextSyncToken };
}

async function fetchGoogleJson<T>({
  accessToken,
  fetcher,
  init,
  url,
}: {
  accessToken: string;
  fetcher: typeof fetch;
  init?: RequestInit;
  url: URL;
}) {
  const response = await fetcher(url, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Google Calendar request failed with status ${response.status}: ${errorText}`,
    );
  }

  return (await response.json()) as T;
}

function toCalendarSnapshot(calendar: GoogleCalendarListEntry): ProviderCalendarSnapshot {
  return {
    accessRole: calendar.accessRole ?? null,
    color: calendar.backgroundColor ?? null,
    description: calendar.description ?? null,
    isDeleted: calendar.deleted ?? false,
    isPrimary: calendar.primary ?? false,
    isSelected: calendar.selected ?? true,
    name: calendar.summary?.trim() || "(Unnamed calendar)",
    rawPayload: calendar as Record<string, unknown>,
    sourceCalendarId: requireGoogleId(calendar.id, "calendar"),
    syncToken: null,
    timezone: calendar.timeZone ?? null,
  };
}

function toCalendarEventSnapshot({
  calendarId,
  event,
}: {
  calendarId: string;
  event: GoogleCalendarEvent;
}): ProviderCalendarEventSnapshot {
  return {
    description: event.description ?? null,
    endAt: parseGoogleDateTime(event.end),
    endDate: event.end?.date ?? null,
    etag: event.etag ?? null,
    htmlLink: event.htmlLink ?? null,
    location: event.location ?? null,
    originalStartAt: parseGoogleDateTime(event.originalStartTime),
    providerUpdatedAt: event.updated ? new Date(event.updated) : null,
    rawPayload: event as Record<string, unknown>,
    recurringEventId: event.recurringEventId ?? null,
    sourceCalendarId: calendarId,
    sourceEventId: requireGoogleId(event.id, "event"),
    sourceIcalUid: event.iCalUID ?? null,
    startAt: parseGoogleDateTime(event.start),
    startDate: event.start?.date ?? null,
    status: event.status ?? "confirmed",
    timezone: event.start?.timeZone ?? event.end?.timeZone ?? null,
    title: event.summary ?? null,
    transparency: event.transparency ?? null,
    visibility: event.visibility ?? null,
  };
}

function parseGoogleDateTime(value: GoogleCalendarEventDateTime | undefined) {
  return value?.dateTime ? new Date(value.dateTime) : null;
}

function requireGoogleId(value: string | undefined, resource: string) {
  if (!value) {
    throw new Error(`Google Calendar ${resource} response is missing id`);
  }

  return value;
}
