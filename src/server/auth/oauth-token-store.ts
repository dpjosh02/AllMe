import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { and, eq } from "drizzle-orm";

import {
  googleCalendarProvider,
  hasGoogleCalendarReadonlyScope,
  parseOAuthScopes,
} from "@/features/calendar/sync/connection";
import { serverEnv } from "@/lib/env";
import type { db as appDb } from "@/server/db";
import { authOAuthTokens } from "@/server/db/schema";

type Database = typeof appDb;

const googleOAuthTokenEndpoint = "https://oauth2.googleapis.com/token";

export type StoredGoogleOAuthTokenInput = {
  accessToken: string;
  accountEmail: string;
  expiresAt?: Date | null;
  providerAccountId?: string | null;
  refreshToken?: string | null;
  scopes?: string | null;
};

export type StoredGoogleOAuthAccessToken = {
  accessToken: string;
  accountEmail: string;
  expiresAt: Date | null;
  providerAccountId: string | null;
  scopes: string | null;
};

export class StoredOAuthTokenUnavailableError extends Error {
  constructor(message = "Stored OAuth token is unavailable") {
    super(message);
    this.name = "StoredOAuthTokenUnavailableError";
  }
}

export class StoredOAuthTokenMissingError extends StoredOAuthTokenUnavailableError {
  constructor(message = "Stored OAuth token is missing") {
    super(message);
    this.name = "StoredOAuthTokenMissingError";
  }
}

export async function upsertGoogleOAuthToken({
  db,
  input,
  userId,
}: {
  db: Database;
  input: StoredGoogleOAuthTokenInput;
  userId: string;
}) {
  const scopes = parseOAuthScopes(input.scopes);
  const existingToken = await getStoredGoogleTokenRow({ db, userId });
  const refreshTokenCiphertext = input.refreshToken
    ? encryptOAuthToken(input.refreshToken)
    : existingToken?.refreshTokenCiphertext ?? null;

  await db
    .insert(authOAuthTokens)
    .values({
      accessTokenCiphertext: encryptOAuthToken(input.accessToken),
      accountEmail: input.accountEmail,
      expiresAt: input.expiresAt ?? null,
      provider: googleCalendarProvider,
      providerAccountId: input.providerAccountId ?? null,
      refreshTokenCiphertext,
      scopes,
      userId,
    })
    .onConflictDoUpdate({
      target: [authOAuthTokens.userId, authOAuthTokens.provider],
      set: {
        accessTokenCiphertext: encryptOAuthToken(input.accessToken),
        accountEmail: input.accountEmail,
        expiresAt: input.expiresAt ?? null,
        providerAccountId: input.providerAccountId ?? null,
        refreshTokenCiphertext,
        scopes,
        updatedAt: new Date(),
      },
    });
}

export async function getStoredGoogleOAuthAccessToken({
  clientId = serverEnv.AUTH_GOOGLE_ID,
  clientSecret = serverEnv.AUTH_GOOGLE_SECRET,
  db,
  fetcher = fetch,
  now = new Date(),
  tokenEndpoint = googleOAuthTokenEndpoint,
  userId,
}: {
  clientId?: string;
  clientSecret?: string;
  db: Database;
  fetcher?: typeof fetch;
  now?: Date;
  tokenEndpoint?: string;
  userId: string;
}): Promise<StoredGoogleOAuthAccessToken> {
  const token = await getStoredGoogleTokenRow({ db, userId });

  if (!token) {
    throw new StoredOAuthTokenMissingError(
      "Google Calendar OAuth token is missing; reauthorization is required",
    );
  }

  const scopes = token.scopes.join(" ");

  if (!hasGoogleCalendarReadonlyScope(scopes)) {
    throw new StoredOAuthTokenUnavailableError(
      "Google Calendar read-only scope is missing; reauthorization is required",
    );
  }

  if (token.expiresAt && token.expiresAt.getTime() <= now.getTime()) {
    return refreshStoredGoogleOAuthToken({
      clientId,
      clientSecret,
      db,
      fetcher,
      now,
      token,
      tokenEndpoint,
      userId,
    });
  }

  return {
    accessToken: decryptOAuthToken(token.accessTokenCiphertext),
    accountEmail: token.accountEmail,
    expiresAt: token.expiresAt,
    providerAccountId: token.providerAccountId,
    scopes,
  };
}

async function refreshStoredGoogleOAuthToken({
  clientId,
  clientSecret,
  db,
  fetcher,
  now,
  token,
  tokenEndpoint,
  userId,
}: {
  clientId?: string;
  clientSecret?: string;
  db: Database;
  fetcher: typeof fetch;
  now: Date;
  token: StoredGoogleTokenRow;
  tokenEndpoint: string;
  userId: string;
}): Promise<StoredGoogleOAuthAccessToken> {
  if (!token.refreshTokenCiphertext) {
    throw new StoredOAuthTokenUnavailableError(
      "Google Calendar authorization expired. Reconnect Google Calendar.",
    );
  }

  if (!clientId || !clientSecret) {
    throw new StoredOAuthTokenUnavailableError(
      "Google Calendar authorization cannot be refreshed. Reconnect Google Calendar.",
    );
  }

  const refreshToken = decryptOAuthToken(token.refreshTokenCiphertext);
  const response = await fetcher(tokenEndpoint, {
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new StoredOAuthTokenUnavailableError(
      "Google Calendar authorization refresh failed. Reconnect Google Calendar.",
    );
  }

  const refreshedToken = parseGoogleOAuthRefreshResponse(await response.json());
  const expiresAt = new Date(now.getTime() + refreshedToken.expiresIn * 1000);
  const refreshTokenCiphertext = refreshedToken.refreshToken
    ? encryptOAuthToken(refreshedToken.refreshToken)
    : token.refreshTokenCiphertext;

  await db
    .update(authOAuthTokens)
    .set({
      accessTokenCiphertext: encryptOAuthToken(refreshedToken.accessToken),
      expiresAt,
      refreshTokenCiphertext,
      updatedAt: now,
    })
    .where(
      and(
        eq(authOAuthTokens.userId, userId),
        eq(authOAuthTokens.provider, googleCalendarProvider),
      ),
    );

  return {
    accessToken: refreshedToken.accessToken,
    accountEmail: token.accountEmail,
    expiresAt,
    providerAccountId: token.providerAccountId,
    scopes: token.scopes.join(" "),
  };
}

function parseGoogleOAuthRefreshResponse(body: unknown) {
  if (!isRecord(body)) {
    throw new StoredOAuthTokenUnavailableError(
      "Google Calendar authorization refresh returned an invalid response.",
    );
  }

  const accessToken = body.access_token;
  const expiresIn = body.expires_in;
  const refreshToken = body.refresh_token;

  if (typeof accessToken !== "string" || !accessToken.trim()) {
    throw new StoredOAuthTokenUnavailableError(
      "Google Calendar authorization refresh returned no access token.",
    );
  }

  if (typeof expiresIn !== "number" || !Number.isFinite(expiresIn)) {
    throw new StoredOAuthTokenUnavailableError(
      "Google Calendar authorization refresh returned no expiry.",
    );
  }

  if (
    refreshToken !== undefined &&
    (typeof refreshToken !== "string" || !refreshToken.trim())
  ) {
    throw new StoredOAuthTokenUnavailableError(
      "Google Calendar authorization refresh returned an invalid refresh token.",
    );
  }

  return {
    accessToken,
    expiresIn,
    refreshToken: typeof refreshToken === "string" ? refreshToken : null,
  };
}

export function encryptOAuthToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getOAuthEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":");
}

export function decryptOAuthToken(encryptedToken: string) {
  const [version, iv, tag, ciphertext] = encryptedToken.split(":");

  if (version !== "v1" || !iv || !tag || !ciphertext) {
    throw new StoredOAuthTokenUnavailableError(
      "Stored OAuth token format is invalid",
    );
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getOAuthEncryptionKey(),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

async function getStoredGoogleTokenRow({
  db,
  userId,
}: {
  db: Database;
  userId: string;
}) {
  const tokens = await db
    .select({
      accessTokenCiphertext: authOAuthTokens.accessTokenCiphertext,
      accountEmail: authOAuthTokens.accountEmail,
      expiresAt: authOAuthTokens.expiresAt,
      providerAccountId: authOAuthTokens.providerAccountId,
      refreshTokenCiphertext: authOAuthTokens.refreshTokenCiphertext,
      scopes: authOAuthTokens.scopes,
    })
    .from(authOAuthTokens)
    .where(
      and(
        eq(authOAuthTokens.userId, userId),
        eq(authOAuthTokens.provider, googleCalendarProvider),
      ),
    )
    .limit(1);

  return tokens.length > 0 ? tokens[0] : null;
}

type StoredGoogleTokenRow = NonNullable<
  Awaited<ReturnType<typeof getStoredGoogleTokenRow>>
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getOAuthEncryptionKey() {
  if (!serverEnv.AUTH_SECRET) {
    throw new StoredOAuthTokenUnavailableError(
      "Auth secret is required for OAuth token encryption",
    );
  }

  return createHash("sha256").update(serverEnv.AUTH_SECRET).digest();
}
