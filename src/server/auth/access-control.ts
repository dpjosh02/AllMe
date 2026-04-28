export type AuthBoundaryMode =
  | "hosted-google"
  | "hosted-google-incomplete"
  | "local-owner";

export type AuthBoundaryTone = "attention" | "neutral" | "ready";

export type AuthBoundaryInput = {
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
  "/api/auth/*",
  "/_next/*",
  "/favicon.ico",
] as const;

export function resolveAuthBoundary(
  input: AuthBoundaryInput,
): AuthBoundaryStatus {
  const hostedReady =
    input.authSecretConfigured && input.googleProviderConfigured;

  if (hostedReady) {
    return {
      enforcementLabel: "Ready to enforce",
      mode: "hosted-google" satisfies AuthBoundaryMode,
      modeLabel: "Hosted Google sign-in",
      nextStep:
        "Enable middleware/page guards and map signed-in Google users to app users before public deployment.",
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
        "Set AUTH_SECRET before enforcing protected routes or deploying beyond local development.",
      productRoutesSummary: summarizeProductRoutes(),
      publicRoutesSummary: summarizePublicRoutes(),
      routePolicy:
        "Do not enforce hosted sign-in until both Google OAuth and AUTH_SECRET are configured.",
      statusLabel: "Hosted auth incomplete",
      tone: "attention" satisfies AuthBoundaryTone,
    };
  }

  return {
    enforcementLabel: input.ownerEmailConfigured
      ? "Local owner only"
      : "Owner email missing",
    mode: "local-owner" satisfies AuthBoundaryMode,
    modeLabel: "Local owner mode",
    nextStep:
      "Keep the app local-only, then add Google OAuth plus middleware before hosting it publicly.",
    productRoutesSummary: summarizeProductRoutes(),
    publicRoutesSummary: summarizePublicRoutes(),
    routePolicy:
      "Product routes are available to the local owner process; this mode is not a public deployment boundary.",
    statusLabel: input.ownerEmailConfigured ? "Owner mode" : "Needs owner email",
    tone: input.ownerEmailConfigured
      ? ("neutral" satisfies AuthBoundaryTone)
      : ("attention" satisfies AuthBoundaryTone),
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

function summarizeProductRoutes() {
  return productRoutes.map((route) => route.href).join(", ");
}

function summarizePublicRoutes() {
  return publicAuthRoutes.join(", ");
}
