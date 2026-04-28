import { describe, expect, it } from "vitest";

import {
  isProductRoute,
  resolveAuthBoundary,
} from "@/server/auth/access-control";

describe("auth access boundary", () => {
  it("treats configured owner email without OAuth as local owner mode", () => {
    const boundary = resolveAuthBoundary({
      authSecretConfigured: false,
      googleProviderConfigured: false,
      ownerEmailConfigured: true,
    });

    expect(boundary.mode).toBe("local-owner");
    expect(boundary.statusLabel).toBe("Owner mode");
    expect(boundary.tone).toBe("neutral");
    expect(boundary.routePolicy).toContain("local owner");
  });

  it("marks hosted auth incomplete when OAuth exists without AUTH_SECRET", () => {
    const boundary = resolveAuthBoundary({
      authSecretConfigured: false,
      googleProviderConfigured: true,
      ownerEmailConfigured: true,
    });

    expect(boundary.mode).toBe("hosted-google-incomplete");
    expect(boundary.tone).toBe("attention");
    expect(boundary.enforcementLabel).toContain("missing auth secret");
  });

  it("marks hosted auth ready when OAuth and AUTH_SECRET are configured", () => {
    const boundary = resolveAuthBoundary({
      authSecretConfigured: true,
      googleProviderConfigured: true,
      ownerEmailConfigured: true,
    });

    expect(boundary.mode).toBe("hosted-google");
    expect(boundary.tone).toBe("ready");
    expect(boundary.routePolicy).toContain("signed-in Google user");
  });

  it("matches product routes without treating similarly named paths as protected", () => {
    expect(isProductRoute("/")).toBe(true);
    expect(isProductRoute("/finance/accounts/example")).toBe(true);
    expect(isProductRoute("/api/auth/signin")).toBe(false);
    expect(isProductRoute("/finances")).toBe(false);
  });
});
