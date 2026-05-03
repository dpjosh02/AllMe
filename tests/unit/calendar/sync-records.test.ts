import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("calendar sync persistence invariants", () => {
  const recordsSource = readFileSync(
    join(process.cwd(), "src/features/calendar/sync/records.ts"),
    "utf8",
  );

  it("preserves calendar conflict targets", () => {
    expect(recordsSource).toContain("calendarCalendars.userId");
    expect(recordsSource).toContain("calendarCalendars.connectionId");
    expect(recordsSource).toContain("calendarCalendars.sourceCalendarId");
  });

  it("preserves event conflict targets", () => {
    expect(recordsSource).toContain("calendarEvents.userId");
    expect(recordsSource).toContain("calendarEvents.calendarId");
    expect(recordsSource).toContain("calendarEvents.sourceEventId");
  });

  it("keeps provider payloads and tombstone fields in event writes", () => {
    expect(recordsSource).toContain("rawPayload: event.rawPayload");
    expect(recordsSource).toContain("cancelledAt: event.cancelledAt");
    expect(recordsSource).toContain("providerUpdatedAt: event.providerUpdatedAt");
  });

  it("updates sync tokens through the user and connection boundary", () => {
    expect(recordsSource).toContain("eq(calendarCalendars.userId, userId)");
    expect(recordsSource).toContain(
      "eq(calendarCalendars.connectionId, connectionId)",
    );
    expect(recordsSource).toContain(
      "eq(calendarCalendars.sourceCalendarId, sourceCalendarId)",
    );
  });
});
