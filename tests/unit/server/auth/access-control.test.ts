import { describe, expect, it } from "vitest";

import {
  isProductRoute,
  isPublicRoute,
  assertValidAuthMode,
  isOwnerEmail,
  resolveAuthBoundary,
  resolveAuthorizationDecision,
  resolveAuthMode,
} from "@/server/auth/access-control";

describe("auth access boundary", () => {
  it("treats configured owner email without OAuth as local owner mode", () => {
    const boundary = resolveAuthBoundary({
      authMode: "local-owner",
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
      authMode: "hosted",
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
      authMode: "hosted",
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

  it("matches public routes used by auth and static assets", () => {
    expect(isPublicRoute("/signin")).toBe(true);
    expect(isPublicRoute("/unauthorized")).toBe(true);
    expect(isPublicRoute("/api/auth/signin")).toBe(true);
    expect(isPublicRoute("/_next/static/chunk.js")).toBe(true);
    expect(isPublicRoute("/finance")).toBe(false);
  });

  it("defaults to hosted in production and local owner outside production", () => {
    expect(resolveAuthMode({ nodeEnv: "production" })).toBe("hosted");
    expect(resolveAuthMode({ nodeEnv: "development" })).toBe("local-owner");
    expect(resolveAuthMode({ configuredMode: "hosted", nodeEnv: "development" })).toBe(
      "hosted",
    );
  });

  it("rejects local owner mode in production", () => {
    expect(() =>
      assertValidAuthMode({
        configuredMode: "local-owner",
        nodeEnv: "production",
      }),
    ).toThrow("ALLME_AUTH_MODE=local-owner is not allowed in production");
  });

  it("allows only the configured owner email in hosted mode", () => {
    expect(isOwnerEmail("Owner@Example.com", "owner@example.com")).toBe(true);
    expect(isOwnerEmail("other@example.com", "owner@example.com")).toBe(false);

    expect(
      resolveAuthorizationDecision({
        authMode: "hosted",
        ownerEmail: "owner@example.com",
        sessionEmail: undefined,
      }),
    ).toMatchObject({ status: "unauthenticated" });

    expect(
      resolveAuthorizationDecision({
        authMode: "hosted",
        ownerEmail: "owner@example.com",
        sessionEmail: "other@example.com",
      }),
    ).toMatchObject({ status: "forbidden" });

    expect(
      resolveAuthorizationDecision({
        authMode: "hosted",
        ownerEmail: "owner@example.com",
        sessionEmail: "owner@example.com",
      }),
    ).toMatchObject({ status: "authorized" });
  });
});
