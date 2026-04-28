import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";

import { authProxyMatcher } from "@/server/auth/access-control";

const proxyConfig = {
  matcher: [...authProxyMatcher],
};

describe("auth proxy matcher", () => {
  it("matches product routes", () => {
    expect(doesMatch("/")).toBe(true);
    expect(doesMatch("/finance")).toBe(true);
    expect(doesMatch("/finance/accounts/example")).toBe(true);
    expect(doesMatch("/settings")).toBe(true);
  });

  it("does not match public auth and static routes", () => {
    expect(doesMatch("/signin")).toBe(false);
    expect(doesMatch("/unauthorized")).toBe(false);
    expect(doesMatch("/api/auth/signin")).toBe(false);
    expect(doesMatch("/_next/static/chunk.js")).toBe(false);
    expect(doesMatch("/favicon.ico")).toBe(false);
  });
});

function doesMatch(url: string) {
  return unstable_doesMiddlewareMatch({
    config: proxyConfig,
    nextConfig: {},
    url,
  });
}
