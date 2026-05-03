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
  db,
  userId,
}: {
  db: Database;
  userId: string;
}): Promise<StoredGoogleOAuthAccessToken> {
  const token = await getStoredGoogleTokenRow({ db, userId });

  if (!token) {
    throw new StoredOAuthTokenUnavailableError(
      "Google Calendar OAuth token is missing; reauthorization is required",
    );
  }

  const scopes = token.scopes.join(" ");

  if (!hasGoogleCalendarReadonlyScope(scopes)) {
    throw new StoredOAuthTokenUnavailableError(
      "Google Calendar read-only scope is missing; reauthorization is required",
    );
  }

  if (token.expiresAt && token.expiresAt.getTime() <= Date.now()) {
    throw new StoredOAuthTokenUnavailableError(
      "Google Calendar OAuth token is expired; reauthorization is required",
    );
  }

  return {
    accessToken: decryptOAuthToken(token.accessTokenCiphertext),
    accountEmail: token.accountEmail,
    expiresAt: token.expiresAt,
    providerAccountId: token.providerAccountId,
    scopes,
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

function getOAuthEncryptionKey() {
  if (!serverEnv.AUTH_SECRET) {
    throw new StoredOAuthTokenUnavailableError(
      "Auth secret is required for OAuth token encryption",
    );
  }

  return createHash("sha256").update(serverEnv.AUTH_SECRET).digest();
}
