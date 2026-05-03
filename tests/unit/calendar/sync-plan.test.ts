import { describe, expect, it } from "vitest";

import {
  createCalendarSyncImportPlan,
  type ProviderCalendarEventSnapshot,
  type ProviderCalendarSnapshot,
} from "@/features/calendar/sync/plan";

const calendar = {
  accessRole: "owner",
  color: "#8bb8ff",
  description: "Personal calendar",
  isPrimary: true,
  name: "Personal",
  rawPayload: { provider: "calendar" },
  sourceCalendarId: "calendar-1",
  syncToken: "calendar-sync-token",
  timezone: "America/Chicago",
} satisfies ProviderCalendarSnapshot;

const timedEvent = {
  description: "Review the day",
  endAt: new Date("2026-05-02T15:30:00.000Z"),
  etag: "etag-1",
  htmlLink: "https://calendar.google.com/event",
  location: "Desk",
  providerUpdatedAt: new Date("2026-05-02T14:00:00.000Z"),
  rawPayload: { provider: "event" },
  sourceCalendarId: "calendar-1",
  sourceEventId: "event-1",
  sourceIcalUid: "ical-1",
  startAt: new Date("2026-05-02T15:00:00.000Z"),
  status: "confirmed",
  timezone: "America/Chicago",
  title: "Review today",
  transparency: "opaque",
  visibility: "default",
} satisfies ProviderCalendarEventSnapshot;

describe("createCalendarSyncImportPlan", () => {
  it("normalizes calendars and timed events into upsert candidates", () => {
    const plan = createCalendarSyncImportPlan({
      calendars: [calendar],
      events: [timedEvent],
    });

    expect(plan.calendars).toEqual([
      {
        accessRole: "owner",
        color: "#8bb8ff",
        description: "Personal calendar",
        isDeleted: false,
        isPrimary: true,
        isSelected: true,
        name: "Personal",
        rawPayload: { provider: "calendar" },
        sourceCalendarId: "calendar-1",
        syncToken: "calendar-sync-token",
        timezone: "America/Chicago",
      },
    ]);
    expect(plan.events).toEqual([
      {
        cancelledAt: null,
        description: "Review the day",
        endAt: new Date("2026-05-02T15:30:00.000Z"),
        endDate: null,
        etag: "etag-1",
        htmlLink: "https://calendar.google.com/event",
        isAllDay: false,
        location: "Desk",
        originalStartAt: null,
        providerUpdatedAt: new Date("2026-05-02T14:00:00.000Z"),
        rawPayload: { provider: "event" },
        recurringEventId: null,
        sourceCalendarId: "calendar-1",
        sourceEventId: "event-1",
        sourceIcalUid: "ical-1",
        startAt: new Date("2026-05-02T15:00:00.000Z"),
        startDate: null,
        status: "confirmed",
        timezone: "America/Chicago",
        title: "Review today",
        transparency: "opaque",
        visibility: "default",
      },
    ]);
    expect(plan.unmatchedEvents).toEqual([]);
  });

  it("normalizes all-day events with provider-exclusive date fields", () => {
    const plan = createCalendarSyncImportPlan({
      calendars: [calendar],
      events: [
        {
          rawPayload: { provider: "all-day-event" },
          sourceCalendarId: "calendar-1",
          sourceEventId: "all-day-1",
          startDate: "2026-05-02",
          endDate: "2026-05-03",
          title: "All day",
        },
      ],
    });

    expect(plan.events[0]).toMatchObject({
      endAt: null,
      endDate: "2026-05-03",
      isAllDay: true,
      startAt: null,
      startDate: "2026-05-02",
      title: "All day",
    });
  });

  it("marks cancelled events as tombstoned at the observed sync time", () => {
    const observedAt = new Date("2026-05-02T16:00:00.000Z");
    const plan = createCalendarSyncImportPlan(
      {
        calendars: [calendar],
        events: [
          {
            rawPayload: { status: "cancelled" },
            sourceCalendarId: "calendar-1",
            sourceEventId: "cancelled-1",
            status: "cancelled",
            title: "Cancelled",
          },
        ],
      },
      { observedAt },
    );

    expect(plan.events[0]).toMatchObject({
      cancelledAt: observedAt,
      status: "cancelled",
    });
  });

  it("separates events whose source calendar was not fetched", () => {
    const plan = createCalendarSyncImportPlan({
      calendars: [calendar],
      events: [
        timedEvent,
        {
          ...timedEvent,
          sourceCalendarId: "missing-calendar",
          sourceEventId: "orphan-event",
        },
      ],
    });

    expect(plan.events.map((event) => event.sourceEventId)).toEqual(["event-1"]);
    expect(plan.unmatchedEvents.map((event) => event.sourceEventId)).toEqual([
      "orphan-event",
    ]);
  });

  it("deduplicates calendars and events by stable provider identity", () => {
    const plan = createCalendarSyncImportPlan({
      calendars: [calendar, { ...calendar, name: "Duplicate calendar" }],
      events: [
        timedEvent,
        {
          ...timedEvent,
          title: "Duplicate event",
        },
      ],
    });

    expect(plan.calendars).toHaveLength(1);
    expect(plan.calendars[0]?.name).toBe("Personal");
    expect(plan.events).toHaveLength(1);
    expect(plan.events[0]?.title).toBe("Review today");
  });

  it("uses a stable title fallback for untitled provider events", () => {
    const plan = createCalendarSyncImportPlan({
      calendars: [calendar],
      events: [
        {
          rawPayload: {},
          sourceCalendarId: "calendar-1",
          sourceEventId: "untitled",
          title: "   ",
        },
      ],
    });

    expect(plan.events[0]?.title).toBe("(No title)");
  });
});
