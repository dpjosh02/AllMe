import { describe, expect, it } from "vitest";

import { googleCalendarEventsWriteScope } from "@/features/calendar/sync/connection";
import {
  googleCalendarOfflineConsentParams,
  googleCalendarReadOnlyAuthScope,
  googleCalendarWriteAuthScope,
} from "@/server/auth/google-calendar-scopes";

describe("Google Calendar OAuth scope configuration", () => {
  it("keeps normal sign-in read-only", () => {
    expect(googleCalendarReadOnlyAuthScope).toBe(
      "openid email profile https://www.googleapis.com/auth/calendar.readonly",
    );
    expect(googleCalendarReadOnlyAuthScope).not.toContain(
      googleCalendarEventsWriteScope,
    );
  });

  it("uses explicit reauthorization for calendar.events write access", () => {
    expect(googleCalendarWriteAuthScope).toBe(
      "openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events",
    );
    expect(googleCalendarWriteAuthScope).not.toContain(
      "https://www.googleapis.com/auth/calendar ",
    );
  });

  it("requests offline consent without embedding token values", () => {
    expect(googleCalendarOfflineConsentParams).toEqual({
      access_type: "offline",
      prompt: "consent",
    });
  });
});
