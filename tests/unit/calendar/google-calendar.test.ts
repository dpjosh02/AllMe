import { describe, expect, it, vi } from "vitest";

import {
  fetchGoogleCalendarEvent,
  patchGoogleCalendarEventDescription,
  readGoogleCalendarSnapshot,
} from "@/features/calendar/integrations/google-calendar";

describe("Google Calendar reader", () => {
  it("reads selected calendars and normalizes timed/all-day events", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              accessRole: "owner",
              backgroundColor: "#8bb8ff",
              id: "primary",
              primary: true,
              selected: true,
              summary: "Personal",
              timeZone: "America/Chicago",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              description: "Focus block",
              end: {
                dateTime: "2026-05-02T10:30:00-05:00",
                timeZone: "America/Chicago",
              },
              etag: "etag-1",
              htmlLink: "https://calendar.google.com/event",
              iCalUID: "ical-1",
              id: "event-1",
              location: "Desk",
              start: {
                dateTime: "2026-05-02T10:00:00-05:00",
                timeZone: "America/Chicago",
              },
              status: "confirmed",
              summary: "Review today",
              updated: "2026-05-02T14:00:00.000Z",
            },
            {
              end: { date: "2026-05-03" },
              id: "all-day-1",
              start: { date: "2026-05-02" },
              summary: "All day",
            },
          ],
          nextSyncToken: "next-token",
        }),
      );

    const snapshot = await readGoogleCalendarSnapshot({
      accessToken: "access-token",
      fetcher,
      timeMax: new Date("2027-05-02T05:00:00.000Z"),
      timeMin: new Date("2026-02-01T06:00:00.000Z"),
    });

    expect(snapshot.calendars).toEqual([
      {
        accessRole: "owner",
        color: "#8bb8ff",
        description: null,
        isDeleted: false,
        isPrimary: true,
        isSelected: true,
        name: "Personal",
        rawPayload: {
          accessRole: "owner",
          backgroundColor: "#8bb8ff",
          id: "primary",
          primary: true,
          selected: true,
          summary: "Personal",
          timeZone: "America/Chicago",
        },
        sourceCalendarId: "primary",
        syncToken: "next-token",
        timezone: "America/Chicago",
      },
    ]);
    expect(snapshot.events).toHaveLength(2);
    expect(snapshot.events[0]).toMatchObject({
      description: "Focus block",
      endAt: new Date("2026-05-02T15:30:00.000Z"),
      endDate: null,
      sourceCalendarId: "primary",
      sourceEventId: "event-1",
      startAt: new Date("2026-05-02T15:00:00.000Z"),
      startDate: null,
      title: "Review today",
    });
    expect(snapshot.events[1]).toMatchObject({
      endAt: null,
      endDate: "2026-05-03",
      sourceEventId: "all-day-1",
      startAt: null,
      startDate: "2026-05-02",
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1]?.[0].toString()).toContain("singleEvents=true");
    expect(fetcher.mock.calls[1]?.[0].toString()).toContain("showDeleted=true");
  });

  it("uses sync tokens instead of bounded time windows for incremental reads", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          items: [{ id: "primary", selected: true, summary: "Personal" }],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ items: [], nextSyncToken: "next" }));

    await readGoogleCalendarSnapshot({
      accessToken: "access-token",
      fetcher,
      syncTokenByCalendarId: new Map([["primary", "existing-token"]]),
      timeMax: new Date("2027-05-02T05:00:00.000Z"),
      timeMin: new Date("2026-02-01T06:00:00.000Z"),
    });

    const eventUrl = fetcher.mock.calls[1]?.[0].toString() ?? "";
    expect(eventUrl).toContain("syncToken=existing-token");
    expect(eventUrl).not.toContain("timeMin=");
    expect(eventUrl).not.toContain("timeMax=");
  });

  it("follows Google pagination for calendar lists and events", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          items: [{ id: "primary", selected: true, summary: "Personal" }],
          nextPageToken: "calendar-page-2",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [{ id: "work", selected: true, summary: "Work" }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [{ id: "event-1", start: { date: "2026-05-02" } }],
          nextPageToken: "event-page-2",
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ items: [{ id: "event-2" }] }))
      .mockResolvedValueOnce(jsonResponse({ items: [] }));

    const snapshot = await readGoogleCalendarSnapshot({
      accessToken: "access-token",
      calendarIds: ["primary"],
      fetcher,
    });

    expect(snapshot.calendars.map((calendar) => calendar.sourceCalendarId)).toEqual([
      "primary",
      "work",
    ]);
    expect(snapshot.events.map((event) => event.sourceEventId)).toEqual([
      "event-1",
      "event-2",
    ]);
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(fetcher.mock.calls[1]?.[0].toString()).toContain(
      "pageToken=calendar-page-2",
    );
    expect(fetcher.mock.calls[3]?.[0].toString()).toContain(
      "pageToken=event-page-2",
    );
  });

  it("sends bearer authorization and surfaces provider errors", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("nope", { status: 403 }));

    await expect(
      readGoogleCalendarSnapshot({
        accessToken: "access-token",
        fetcher,
      }),
    ).rejects.toThrow("Google Calendar request failed with status 403");

    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      headers: {
        Authorization: "Bearer access-token",
      },
    });
  });

  it("fetches one provider event before write validation", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({
        description: "Existing",
        etag: "etag-1",
        id: "event-1",
        updated: "2026-05-04T16:00:00.000Z",
      }),
    );

    const event = await fetchGoogleCalendarEvent({
      accessToken: "access-token",
      calendarId: "primary",
      eventId: "event-1",
      fetcher,
    });

    expect(event).toMatchObject({
      description: "Existing",
      etag: "etag-1",
      sourceCalendarId: "primary",
      sourceEventId: "event-1",
    });
    expect(fetcher.mock.calls[0]?.[0].toString()).toContain(
      "/calendars/primary/events/event-1",
    );
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      headers: {
        Authorization: "Bearer access-token",
      },
    });
  });

  it("patches only the provider description", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({
        description: "Published note",
        etag: "etag-2",
        id: "event-1",
        summary: "Provider title",
        updated: "2026-05-04T16:05:00.000Z",
      }),
    );

    const event = await patchGoogleCalendarEventDescription({
      accessToken: "access-token",
      calendarId: "primary",
      description: "Published note",
      eventId: "event-1",
      fetcher,
    });

    expect(event).toMatchObject({
      description: "Published note",
      etag: "etag-2",
      title: "Provider title",
    });
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      body: JSON.stringify({ description: "Published note" }),
      headers: {
        Authorization: "Bearer access-token",
        "Content-Type": "application/json",
      },
      method: "PATCH",
    });
    expect(String(fetcher.mock.calls[0]?.[1]?.body)).not.toContain("summary");
    expect(String(fetcher.mock.calls[0]?.[1]?.body)).not.toContain("location");
    expect(String(fetcher.mock.calls[0]?.[1]?.body)).not.toContain("attendees");
    expect(String(fetcher.mock.calls[0]?.[1]?.body)).not.toContain("recurrence");
  });
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}
