import { describe, expect, it } from "vitest";

import {
  getTodayAgendaItems,
  type TodayAgendaSourceRow,
} from "@/features/calendar/agenda-read-model";

describe("calendar agenda helpers", () => {
  it("includes timed events that intersect the local day", () => {
    const items = getTodayAgendaItems({
      dateKey: "2026-05-02",
      rows: [
        agendaRow({
          endAt: new Date("2026-05-02T16:00:00.000Z"),
          id: "event-in-window",
          startAt: new Date("2026-05-02T15:00:00.000Z"),
          title: "Planning block",
        }),
        agendaRow({
          endAt: new Date("2026-05-03T06:30:00.000Z"),
          id: "event-after-window",
          startAt: new Date("2026-05-03T06:00:00.000Z"),
          title: "Tomorrow only",
        }),
      ],
      timezone: "America/Chicago",
    });

    expect(items.map((item) => item.id)).toEqual(["event-in-window"]);
  });

  it("handles all-day provider-exclusive end dates", () => {
    const rows = [
      agendaRow({
        endDate: "2026-05-03",
        id: "single-day",
        isAllDay: true,
        startDate: "2026-05-02",
        title: "All day",
      }),
      agendaRow({
        endDate: "2026-05-02",
        id: "ended-before-day",
        isAllDay: true,
        startDate: "2026-05-01",
        title: "Past all day",
      }),
    ];

    expect(
      getTodayAgendaItems({
        dateKey: "2026-05-02",
        rows,
        timezone: "America/Chicago",
      }).map((item) => item.id),
    ).toEqual(["single-day"]);

    expect(
      getTodayAgendaItems({
        dateKey: "2026-05-03",
        rows,
        timezone: "America/Chicago",
      }).map((item) => item.id),
    ).toEqual([]);
  });

  it("excludes cancelled events", () => {
    const items = getTodayAgendaItems({
      dateKey: "2026-05-02",
      rows: [
        agendaRow({
          id: "cancelled",
          status: "cancelled",
          title: "Cancelled event",
        }),
        agendaRow({ id: "visible", title: "Visible event" }),
      ],
      timezone: "America/Chicago",
    });

    expect(items.map((item) => item.id)).toEqual(["visible"]);
  });

  it("excludes events from unselected or deleted calendars", () => {
    const items = getTodayAgendaItems({
      dateKey: "2026-05-02",
      rows: [
        agendaRow({
          calendarIsSelected: false,
          id: "unselected",
          title: "Unselected calendar event",
        }),
        agendaRow({
          calendarIsDeleted: true,
          id: "deleted-calendar",
          title: "Deleted calendar event",
        }),
        agendaRow({ id: "visible", title: "Visible event" }),
      ],
      timezone: "America/Chicago",
    });

    expect(items.map((item) => item.id)).toEqual(["visible"]);
  });

  it("sorts all-day events before timed events and timed events by start time", () => {
    const items = getTodayAgendaItems({
      dateKey: "2026-05-02",
      rows: [
        agendaRow({
          id: "later",
          startAt: new Date("2026-05-02T18:00:00.000Z"),
          title: "Later",
        }),
        agendaRow({
          endDate: "2026-05-03",
          id: "all-day",
          isAllDay: true,
          startAt: null,
          startDate: "2026-05-02",
          title: "All day",
        }),
        agendaRow({
          id: "earlier",
          startAt: new Date("2026-05-02T14:00:00.000Z"),
          title: "Earlier",
        }),
      ],
      timezone: "America/Chicago",
    });

    expect(items.map((item) => item.id)).toEqual(["all-day", "earlier", "later"]);
  });

  it("handles timed events that cross local midnight", () => {
    const rows = [
      agendaRow({
        endAt: new Date("2026-05-03T05:30:00.000Z"),
        id: "crosses-midnight",
        startAt: new Date("2026-05-03T04:30:00.000Z"),
        title: "Late event",
      }),
    ];

    expect(
      getTodayAgendaItems({
        dateKey: "2026-05-02",
        rows,
        timezone: "America/Chicago",
      }).map((item) => item.id),
    ).toEqual(["crosses-midnight"]);

    expect(
      getTodayAgendaItems({
        dateKey: "2026-05-03",
        rows,
        timezone: "America/Chicago",
      }).map((item) => item.id),
    ).toEqual(["crosses-midnight"]);
  });
});

function agendaRow(
  overrides: Partial<TodayAgendaSourceRow> = {},
): TodayAgendaSourceRow {
  return {
    calendarColor: "#8bb8ff",
    calendarId: "calendar-1",
    calendarIsDeleted: false,
    calendarIsSelected: true,
    calendarName: "Personal",
    description: null,
    endAt: new Date("2026-05-02T15:30:00.000Z"),
    endDate: null,
    htmlLink: null,
    id: "event-1",
    isAllDay: false,
    location: null,
    linkedNoteDate: null,
    linkedNoteHref: null,
    linkedNoteId: null,
    linkedNoteScope: null,
    linkedNoteTitle: null,
    localReviewStatus: null,
    recurringEventId: null,
    sourceIcalUid: null,
    startAt: new Date("2026-05-02T15:00:00.000Z"),
    startDate: null,
    status: "confirmed",
    title: "Calendar event",
    ...overrides,
  };
}
