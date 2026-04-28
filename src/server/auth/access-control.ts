export type AuthBoundaryMode =
  | "hosted-google"
  | "hosted-google-incomplete"
  | "local-owner";

export type AllMeAuthMode = "hosted" | "local-owner";
export type AuthBoundaryTone = "attention" | "neutral" | "ready";

export type AuthBoundaryInput = {
  authMode: AllMeAuthMode;
  authSecretConfigured: boolean;
  googleProviderConfigured: boolean;
  ownerEmailConfigured: boolean;
};

export type AuthBoundaryStatus = {
  enforcementLabel: string;
  mode: AuthBoundaryMode;
  modeLabel: string;
  nextStep: string;
  productRoutesSummary: string;
  publicRoutesSummary: string;
  routePolicy: string;
  statusLabel: string;
  tone: AuthBoundaryTone;
};

export type AuthModeInput = {
  configuredMode?: AllMeAuthMode;
  nodeEnv: string;
};

export type AuthorizationDecision =
  | { reason: "local-owner-mode"; status: "authorized" }
  | { reason: "missing-session"; status: "unauthenticated" }
  | { reason: "owner-match"; status: "authorized" }
  | { reason: "owner-missing"; status: "forbidden" }
  | { reason: "owner-mismatch"; status: "forbidden" };

export const productRoutes = [
  { href: "/", label: "Home" },
  { href: "/today", label: "Today" },
  { href: "/finance", label: "Finance" },
  { href: "/notes", label: "Notes" },
  { href: "/calendar", label: "Calendar" },
  { href: "/progress", label: "Progress" },
  { href: "/settings", label: "Settings" },
] as const;

export const publicAuthRoutes = [
  "/signin",
  "/unauthorized",
  "/api/auth/*",
  "/_next/*",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
] as const;

export const authProxyMatcher = [
  "/((?!api/auth|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|signin|unauthorized).*)",
] as const;

export function resolveAuthBoundary(
  input: AuthBoundaryInput,
): AuthBoundaryStatus {
  if (input.authMode === "local-owner") {
    return {
      enforcementLabel: input.ownerEmailConfigured
        ? "Local owner only"
        : "Owner email missing",
      mode: "local-owner",
      modeLabel: "Local owner mode",
      nextStep:
        "Keep local-owner mode for development only; use hosted Google sign-in before public deployment.",
      productRoutesSummary: summarizeProductRoutes(),
      publicRoutesSummary: summarizePublicRoutes(),
      routePolicy:
        "Product routes are available to the local owner process; this mode is not a public deployment boundary.",
      statusLabel: input.ownerEmailConfigured
        ? "Owner mode"
        : "Needs owner email",
      tone: input.ownerEmailConfigured ? "neutral" : "attention",
    };
  }

  const hostedReady =
    input.authSecretConfigured && input.googleProviderConfigured;

  if (hostedReady) {
    return {
      enforcementLabel: "Ready to enforce",
      mode: "hosted-google" satisfies AuthBoundaryMode,
      modeLabel: "Hosted Google sign-in",
      nextStep:
        "Protected routes now require signed-in Google access and server-side owner authorization.",
      productRoutesSummary: summarizeProductRoutes(),
      publicRoutesSummary: summarizePublicRoutes(),
      routePolicy:
        "Product routes should require a signed-in Google user before reading app data.",
      statusLabel: "Hosted auth ready",
      tone: "ready" satisfies AuthBoundaryTone,
    };
  }

  if (input.googleProviderConfigured) {
    return {
      enforcementLabel: "Blocked by missing auth secret",
      mode: "hosted-google-incomplete" satisfies AuthBoundaryMode,
      modeLabel: "Hosted Google sign-in incomplete",
      nextStep:
        "Set AUTH_SECRET and Google OAuth before using hosted mode beyond local verification.",
      productRoutesSummary: summarizeProductRoutes(),
      publicRoutesSummary: summarizePublicRoutes(),
      routePolicy:
        "Do not enforce hosted sign-in until both Google OAuth and AUTH_SECRET are configured.",
      statusLabel: "Hosted auth incomplete",
      tone: "attention" satisfies AuthBoundaryTone,
    };
  }

  return {
    enforcementLabel: "Blocked by missing Google OAuth",
    mode: "hosted-google-incomplete",
    modeLabel: "Hosted Google sign-in incomplete",
    nextStep:
      "Configure Google OAuth before relying on hosted route protection.",
    productRoutesSummary: summarizeProductRoutes(),
    publicRoutesSummary: summarizePublicRoutes(),
    routePolicy:
      "Hosted mode is selected, but Google OAuth is not configured enough to authenticate users.",
    statusLabel: "Hosted auth incomplete",
    tone: "attention",
  };
}

export function isProductRoute(pathname: string) {
  return productRoutes.some((route) => {
    if (route.href === "/") {
      return pathname === "/";
    }

    return pathname === route.href || pathname.startsWith(`${route.href}/`);
  });
}

export function isPublicRoute(pathname: string) {
  return publicAuthRoutes.some((route) => {
    if (route.endsWith("/*")) {
      const prefix = route.slice(0, -1);
      return pathname.startsWith(prefix);
    }

    return pathname === route;
  });
}

export function resolveAuthMode({
  configuredMode,
  nodeEnv,
}: AuthModeInput): AllMeAuthMode {
  if (configuredMode) {
    return configuredMode;
  }

  return nodeEnv === "production" ? "hosted" : "local-owner";
}

export function assertValidAuthMode({
  configuredMode,
  nodeEnv,
}: AuthModeInput) {
  const authMode = resolveAuthMode({ configuredMode, nodeEnv });

  if (nodeEnv === "production" && authMode === "local-owner") {
    throw new Error("ALLME_AUTH_MODE=local-owner is not allowed in production");
  }

  return authMode;
}

export function isOwnerEmail(
  email: string | null | undefined,
  ownerEmail: string | null | undefined,
) {
  return Boolean(
    email &&
      ownerEmail &&
      email.trim().toLowerCase() === ownerEmail.trim().toLowerCase(),
  );
}

export function resolveAuthorizationDecision({
  authMode,
  ownerEmail,
  sessionEmail,
}: {
  authMode: AllMeAuthMode;
  ownerEmail: string | null | undefined;
  sessionEmail: string | null | undefined;
}): AuthorizationDecision {
  if (authMode === "local-owner") {
    return { reason: "local-owner-mode", status: "authorized" };
  }

  if (!sessionEmail) {
    return { reason: "missing-session", status: "unauthenticated" };
  }

  if (!ownerEmail) {
    return { reason: "owner-missing", status: "forbidden" };
  }

  if (!isOwnerEmail(sessionEmail, ownerEmail)) {
    return { reason: "owner-mismatch", status: "forbidden" };
  }

  return { reason: "owner-match", status: "authorized" };
}

function summarizeProductRoutes() {
  return productRoutes.map((route) => route.href).join(", ");
}

function summarizePublicRoutes() {
  return publicAuthRoutes.join(", ");
}
