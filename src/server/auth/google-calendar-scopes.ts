import {
  googleCalendarEventsWriteScope,
  googleCalendarReadonlyScope,
} from "@/features/calendar/sync/connection";

export const googleIdentityScopes = ["openid", "email", "profile"] as const;

export const googleCalendarReadOnlyAuthScopes = [
  ...googleIdentityScopes,
  googleCalendarReadonlyScope,
] as const;

export const googleCalendarWriteAuthScopes = [
  ...googleCalendarReadOnlyAuthScopes,
  googleCalendarEventsWriteScope,
] as const;

export const googleCalendarReadOnlyAuthScope = googleCalendarReadOnlyAuthScopes.join(" ");
export const googleCalendarWriteAuthScope = googleCalendarWriteAuthScopes.join(" ");

export const googleCalendarOfflineConsentParams = {
  access_type: "offline",
  prompt: "consent",
} as const;
