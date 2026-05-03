import { describe, expect, it } from "vitest";

import {
  googleCalendarReadonlyScope,
  hasGoogleCalendarReadonlyScope,
  parseOAuthScopes,
} from "@/features/calendar/sync/connection";

describe("calendar connection helpers", () => {
  it("parses OAuth scopes into a normalized list", () => {
    expect(parseOAuthScopes("openid  email profile ")).toEqual([
      "openid",
      "email",
      "profile",
    ]);
  });

  it("detects Google Calendar read-only scope", () => {
    expect(
      hasGoogleCalendarReadonlyScope(`openid email ${googleCalendarReadonlyScope}`),
    ).toBe(true);
    expect(hasGoogleCalendarReadonlyScope("openid email profile")).toBe(false);
    expect(hasGoogleCalendarReadonlyScope(undefined)).toBe(false);
  });
});
