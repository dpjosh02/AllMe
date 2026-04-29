import { describe, expect, it } from "vitest";

import { formatDisplayDate, getLocalDateKey } from "@/features/today/date";

describe("today date helpers", () => {
  it("resolves the date key in the user's timezone", () => {
    const now = new Date("2026-04-29T04:30:00.000Z");

    expect(getLocalDateKey({ now, timezone: "America/Chicago" })).toBe(
      "2026-04-28",
    );
    expect(getLocalDateKey({ now, timezone: "UTC" })).toBe("2026-04-29");
  });

  it("formats a stored note date without timezone drift", () => {
    expect(formatDisplayDate("2026-04-29")).toBe("Wednesday, April 29, 2026");
  });
});
