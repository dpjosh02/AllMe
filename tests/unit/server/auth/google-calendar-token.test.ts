import { describe, expect, it } from "vitest";

import {
  GoogleCalendarAccessTokenUnavailableError,
  toGoogleCalendarAccessToken,
} from "@/server/auth/google-calendar-token";

describe("Google Calendar access token resolution", () => {
  it("returns a validated Google Calendar token from Auth.js JWT claims", () => {
    expect(
      toGoogleCalendarAccessToken({
        email: "owner@example.com",
        googleCalendarAccessToken: "access-token",
        googleCalendarAccessTokenExpiresAt: Math.floor(Date.now() / 1000) + 3600,
        googleCalendarProviderAccountId: "google-account-1",
        googleCalendarScopes:
          "openid email https://www.googleapis.com/auth/calendar.readonly",
      }),
    ).toEqual({
      accessToken: "access-token",
      accountEmail: "owner@example.com",
      expiresAt: expect.any(Date),
      providerAccountId: "google-account-1",
      scopes: "openid email https://www.googleapis.com/auth/calendar.readonly",
    });
  });

  it("rejects missing, unscoped, or expired token claims", () => {
    expect(() => toGoogleCalendarAccessToken(null)).toThrow(
      GoogleCalendarAccessTokenUnavailableError,
    );
    expect(() =>
      toGoogleCalendarAccessToken({
        email: "owner@example.com",
        googleCalendarAccessToken: "access-token",
        googleCalendarScopes: "openid email profile",
      }),
    ).toThrow("scope");
    expect(() =>
      toGoogleCalendarAccessToken({
        email: "owner@example.com",
        googleCalendarAccessToken: "access-token",
        googleCalendarAccessTokenExpiresAt: Math.floor(Date.now() / 1000) - 60,
        googleCalendarScopes:
          "openid email https://www.googleapis.com/auth/calendar.readonly",
      }),
    ).toThrow("expired");
  });
});
