import { describe, expect, it } from "vitest";

import { resolveProgressDateKey } from "@/features/progress/date";

describe("progress date helpers", () => {
  it("uses a valid requested date key", () => {
    expect(
      resolveProgressDateKey({
        now: new Date("2026-05-06T04:30:00.000Z"),
        requestedDateKey: "2026-05-01",
        timezone: "America/Chicago",
      }),
    ).toEqual({
      dateKey: "2026-05-01",
      localTodayKey: "2026-05-05",
    });
  });

  it("falls back to the user's local today for invalid date keys", () => {
    expect(
      resolveProgressDateKey({
        now: new Date("2026-05-06T04:30:00.000Z"),
        requestedDateKey: "2026-02-31",
        timezone: "America/Chicago",
      }),
    ).toEqual({
      dateKey: "2026-05-05",
      localTodayKey: "2026-05-05",
    });
  });
});
