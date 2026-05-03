import { headers } from "next/headers";
import type { JWT } from "next-auth/jwt";

import {
  googleCalendarReadonlyScope,
  hasGoogleCalendarReadonlyScope,
} from "@/features/calendar/sync/connection";
import { serverEnv } from "@/lib/env";
import { db } from "@/server/db";
import {
  getStoredGoogleOAuthAccessToken,
  StoredOAuthTokenUnavailableError,
} from "@/server/auth/oauth-token-store";

export type GoogleCalendarAccessToken = {
  accessToken: string;
  accountEmail: string;
  expiresAt: Date | null;
  providerAccountId: string | null;
  scopes: string | null;
};

export class GoogleCalendarAccessTokenUnavailableError extends Error {
  constructor(message = "Google Calendar access token is unavailable") {
    super(message);
    this.name = "GoogleCalendarAccessTokenUnavailableError";
  }
}

export async function resolveGoogleCalendarAccessToken({
  userId,
}: {
  userId: string;
}) {
  try {
    return await getStoredGoogleOAuthAccessToken({ db, userId });
  } catch (error) {
    if (!(error instanceof StoredOAuthTokenUnavailableError)) {
      throw error;
    }
  }

  if (!serverEnv.AUTH_SECRET) {
    throw new GoogleCalendarAccessTokenUnavailableError(
      "Auth secret is required to resolve the Google Calendar token",
    );
  }

  const { getToken } = await import("next-auth/jwt");
  const token = await getToken({
    req: { headers: await headers() },
    secret: serverEnv.AUTH_SECRET,
    secureCookie: serverEnv.NODE_ENV === "production",
  });

  return toGoogleCalendarAccessToken(token);
}

export async function getGoogleCalendarAccessTokenReadiness() {
  try {
    const [{ requireOwnerUser }] = await Promise.all([
      import("@/server/auth/guards"),
    ]);
    const user = await requireOwnerUser();

    await resolveGoogleCalendarAccessToken({ userId: user.id });

    return { ready: true, reason: "Token available" };
  } catch (error) {
    return {
      ready: false,
      reason:
        error instanceof GoogleCalendarAccessTokenUnavailableError
          ? error.message
          : "Google Calendar token status is unavailable",
    };
  }
}

export function toGoogleCalendarAccessToken(
  token: JWT | null,
): GoogleCalendarAccessToken {
  const accessToken = getStringClaim(token, "googleCalendarAccessToken");
  const accountEmail = getStringClaim(token, "email");
  const providerAccountId = getStringClaim(
    token,
    "googleCalendarProviderAccountId",
  );
  const scopes = getStringClaim(token, "googleCalendarScopes");
  const expiresAt = getExpiresAt(token);

  if (!accessToken) {
    throw new GoogleCalendarAccessTokenUnavailableError(
      "Google Calendar access token is missing; reauthorization is required",
    );
  }

  if (!accountEmail) {
    throw new GoogleCalendarAccessTokenUnavailableError(
      "Google account email is missing; reauthorization is required",
    );
  }

  if (!hasGoogleCalendarReadonlyScope(scopes)) {
    throw new GoogleCalendarAccessTokenUnavailableError(
      `Google Calendar scope ${googleCalendarReadonlyScope} is missing; reauthorization is required`,
    );
  }

  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    throw new GoogleCalendarAccessTokenUnavailableError(
      "Google Calendar access token is expired; reauthorization is required",
    );
  }

  return {
    accessToken,
    accountEmail,
    expiresAt,
    providerAccountId,
    scopes,
  };
}

function getStringClaim(token: JWT | null, claim: string) {
  const value = token?.[claim];

  return typeof value === "string" && value.trim() ? value : null;
}

function getExpiresAt(token: JWT | null) {
  const value = token?.googleCalendarAccessTokenExpiresAt;

  if (typeof value !== "number") {
    return null;
  }

  return new Date(value * 1000);
}
