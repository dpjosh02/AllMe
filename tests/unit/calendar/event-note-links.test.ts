import { describe, expect, it } from "vitest";

import {
  attachLinkedNotesToCalendarEvents,
  type CalendarEventNoteLinkRecord,
  type CalendarEventNoteLinkTargetEvent,
} from "@/features/calendar/event-note-links";

describe("calendar event note link resolution", () => {
  it("prefers an event-instance linked note over a recurring-series note", () => {
    const [event] = attachLinkedNotesToCalendarEvents({
      events: [eventFixture({ id: "event-1" })],
      links: [
        linkFixture({
          noteId: "series-note",
          noteTitle: "Series note",
          scope: "recurring_series",
        }),
        linkFixture({
          eventId: "event-1",
          noteId: "instance-note",
          noteTitle: "Instance note",
          scope: "event_instance",
        }),
      ],
    });

    expect(event.linkedNoteId).toBe("instance-note");
    expect(event.linkedNoteScope).toBe("event_instance");
    expect(event.linkedNoteTitle).toBe("Instance note");
  });

  it("shares one recurring-series linked note across matching occurrences", () => {
    const events = attachLinkedNotesToCalendarEvents({
      events: [
        eventFixture({ id: "event-1" }),
        eventFixture({ id: "event-2" }),
      ],
      links: [linkFixture({ scope: "recurring_series" })],
    });

    expect(events.map((event) => event.linkedNoteId)).toEqual([
      "note-1",
      "note-1",
    ]);
    expect(events.every((event) => event.linkedNoteScope === "recurring_series")).toBe(
      true,
    );
  });

  it("does not apply a recurring-series note across calendar boundaries", () => {
    const [event] = attachLinkedNotesToCalendarEvents({
      events: [eventFixture({ calendarId: "calendar-2" })],
      links: [linkFixture({ scope: "recurring_series" })],
    });

    expect(event.linkedNoteId).toBeNull();
  });
});

function eventFixture(
  overrides: Partial<CalendarEventNoteLinkTargetEvent> = {},
): CalendarEventNoteLinkTargetEvent {
  return {
    calendarId: "calendar-1",
    id: "event-1",
    recurringEventId: "recurring-1",
    sourceIcalUid: "ical-1",
    ...overrides,
  };
}

function linkFixture(
  overrides: Partial<CalendarEventNoteLinkRecord> = {},
): CalendarEventNoteLinkRecord {
  return {
    calendarId: "calendar-1",
    eventId: null,
    noteDate: null,
    noteId: "note-1",
    noteTitle: "Linked note",
    recurringEventId: "recurring-1",
    scope: "event_instance",
    sourceIcalUid: "ical-1",
    ...overrides,
  };
}
