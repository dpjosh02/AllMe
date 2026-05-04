import { describe, expect, it, vi } from "vitest";

describe("OAuth token encryption", () => {
  it("round-trips token ciphertext without storing plaintext", async () => {
    vi.resetModules();
    vi.stubEnv("AUTH_SECRET", "test-secret-for-oauth-token-encryption");
    const { decryptOAuthToken, encryptOAuthToken } = await import(
      "@/server/auth/oauth-token-store"
    );
    const encryptedToken = encryptOAuthToken("google-access-token");

    expect(encryptedToken).not.toContain("google-access-token");
    expect(encryptedToken.startsWith("v1:")).toBe(true);
    expect(decryptOAuthToken(encryptedToken)).toBe("google-access-token");
  });
});

describe("stored Google OAuth token resolution", () => {
  it("returns a valid stored access token without refreshing it", async () => {
    const { getStoredGoogleOAuthAccessToken, encryptOAuthToken } =
      await loadTokenStore();
    const db = createTokenStoreDb({
      accessTokenCiphertext: encryptOAuthToken("valid-access-token"),
      expiresAt: new Date("2026-05-04T13:00:00.000Z"),
      refreshTokenCiphertext: encryptOAuthToken("refresh-token"),
    });
    const fetcher = vi.fn();

    await expect(
      getStoredGoogleOAuthAccessToken({
        db,
        fetcher: fetcher as unknown as typeof fetch,
        now: new Date("2026-05-04T12:00:00.000Z"),
        userId: "user-1",
      }),
    ).resolves.toEqual({
      accessToken: "valid-access-token",
      accountEmail: "owner@example.com",
      expiresAt: new Date("2026-05-04T13:00:00.000Z"),
      providerAccountId: "google-account-1",
      scopes: "openid email https://www.googleapis.com/auth/calendar.readonly",
    });
    expect(fetcher).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("refreshes an expired stored access token and preserves the refresh token when Google omits one", async () => {
    const {
      decryptOAuthToken,
      getStoredGoogleOAuthAccessToken,
      encryptOAuthToken,
    } = await loadTokenStore();
    const originalRefreshTokenCiphertext = encryptOAuthToken("refresh-token");
    const db = createTokenStoreDb({
      accessTokenCiphertext: encryptOAuthToken("expired-access-token"),
      expiresAt: new Date("2026-05-04T11:59:00.000Z"),
      refreshTokenCiphertext: originalRefreshTokenCiphertext,
    });
    const fetcher = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        Response.json({
          access_token: "fresh-access-token",
          expires_in: 3600,
          token_type: "Bearer",
        }),
    );

    await expect(
      getStoredGoogleOAuthAccessToken({
        clientId: "google-client-id",
        clientSecret: "google-client-secret",
        db,
        fetcher: fetcher as unknown as typeof fetch,
        now: new Date("2026-05-04T12:00:00.000Z"),
        userId: "user-1",
      }),
    ).resolves.toEqual({
      accessToken: "fresh-access-token",
      accountEmail: "owner@example.com",
      expiresAt: new Date("2026-05-04T13:00:00.000Z"),
      providerAccountId: "google-account-1",
      scopes: "openid email https://www.googleapis.com/auth/calendar.readonly",
    });

    const [endpoint, requestInit] = fetcher.mock.calls[0] as [
      string,
      RequestInit,
    ];
    const requestBody = String(requestInit.body);
    expect(endpoint).toBe("https://oauth2.googleapis.com/token");
    expect(requestInit).toMatchObject({
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });
    expect(requestBody).toContain("grant_type=refresh_token");
    expect(requestBody).toContain("client_id=google-client-id");
    expect(requestBody).toContain("client_secret=google-client-secret");
    expect(requestBody).toContain("refresh_token=refresh-token");

    const updatedToken = db.updatedToken;

    expect(updatedToken).toMatchObject({
      expiresAt: new Date("2026-05-04T13:00:00.000Z"),
      refreshTokenCiphertext: originalRefreshTokenCiphertext,
      updatedAt: new Date("2026-05-04T12:00:00.000Z"),
    });

    if (!updatedToken) {
      throw new Error("Expected token update");
    }

    expect(decryptOAuthToken(String(updatedToken.accessTokenCiphertext))).toBe(
      "fresh-access-token",
    );
  });

  it("rejects an expired stored token when no refresh token exists", async () => {
    const { getStoredGoogleOAuthAccessToken, encryptOAuthToken } =
      await loadTokenStore();
    const db = createTokenStoreDb({
      accessTokenCiphertext: encryptOAuthToken("expired-access-token"),
      expiresAt: new Date("2026-05-04T11:59:00.000Z"),
      refreshTokenCiphertext: null,
    });
    const fetcher = vi.fn();

    await expect(
      getStoredGoogleOAuthAccessToken({
        db,
        fetcher: fetcher as unknown as typeof fetch,
        now: new Date("2026-05-04T12:00:00.000Z"),
        userId: "user-1",
      }),
    ).rejects.toThrow("Reconnect Google Calendar");
    expect(fetcher).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });
});

async function loadTokenStore() {
  vi.resetModules();
  vi.stubEnv("AUTH_SECRET", "test-secret-for-oauth-token-encryption");
  vi.stubEnv("AUTH_GOOGLE_ID", "google-client-id");
  vi.stubEnv("AUTH_GOOGLE_SECRET", "google-client-secret");

  return import("@/server/auth/oauth-token-store");
}

function createTokenStoreDb({
  accessTokenCiphertext,
  expiresAt,
  refreshTokenCiphertext,
}: {
  accessTokenCiphertext: string;
  expiresAt: Date;
  refreshTokenCiphertext: string | null;
}) {
  const tokenRow = {
    accessTokenCiphertext,
    accountEmail: "owner@example.com",
    expiresAt,
    providerAccountId: "google-account-1",
    refreshTokenCiphertext,
    scopes: [
      "openid",
      "email",
      "https://www.googleapis.com/auth/calendar.readonly",
    ],
  };
  const db = {
    updatedToken: null as Record<string, unknown> | null,
    select: vi.fn(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [tokenRow],
        }),
      }),
    })),
    update: vi.fn(() => ({
      set: (value: Record<string, unknown>) => {
        db.updatedToken = value;

        return {
          where: async () => undefined,
        };
      },
    })),
  };

  return db as typeof db & Parameters<
    typeof import("@/server/auth/oauth-token-store").getStoredGoogleOAuthAccessToken
  >[0]["db"];
}
