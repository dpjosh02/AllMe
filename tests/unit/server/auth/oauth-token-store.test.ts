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
