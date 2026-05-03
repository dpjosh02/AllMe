import GoogleProvider from "next-auth/providers/google";
import type { Account, NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";

import {
  googleCalendarReadonlyScope,
  hasGoogleCalendarReadonlyScope,
  upsertGoogleCalendarConnection,
  upsertOwnerUserFromGoogleProfile,
} from "@/features/calendar/sync/connection";
import { serverEnv } from "@/lib/env";
import {
  isProductRoute,
  isPublicRoute,
  isOwnerEmail,
  resolveAuthorizationDecision,
} from "@/server/auth/access-control";
import { upsertGoogleOAuthToken } from "@/server/auth/oauth-token-store";
import { db } from "@/server/db";

const googleAuthScopes = [
  "openid",
  "email",
  "profile",
  googleCalendarReadonlyScope,
].join(" ");

export const authOptions: NextAuthConfig = {
  callbacks: {
    authorized({ auth, request }) {
      const pathname = request.nextUrl.pathname;

      if (isPublicRoute(pathname) || !isProductRoute(pathname)) {
        return true;
      }

      const decision = resolveAuthorizationDecision({
        authMode: serverEnv.ALLME_AUTH_MODE,
        ownerEmail: serverEnv.ALLME_IMPORT_USER_EMAIL,
        sessionEmail: auth?.user?.email,
      });

      if (decision.status === "authorized") {
        return true;
      }

      if (decision.status === "unauthenticated") {
        const signInUrl = new URL("/signin", request.nextUrl.origin);
        signInUrl.searchParams.set(
          "callbackUrl",
          `${request.nextUrl.pathname}${request.nextUrl.search}`,
        );
        return Response.redirect(signInUrl);
      }

      return Response.redirect(new URL("/unauthorized", request.nextUrl.origin));
    },
    jwt({ account, token, user }) {
      if (user?.email) {
        token.email = user.email;
      }

      if (user?.name) {
        token.name = user.name;
      }

      if (user?.image) {
        token.picture = user.image;
      }

      syncGoogleCalendarJwtClaims(token, account);

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.email = token.email ?? session.user.email;
        session.user.name = token.name ?? session.user.name;
        session.user.image = token.picture ?? session.user.image;
      }

      return session;
    },
    async signIn({ account, user }) {
      if (!isOwnerEmail(user.email, serverEnv.ALLME_IMPORT_USER_EMAIL)) {
        return false;
      }

      if (user.email) {
        const owner = await upsertOwnerUserFromGoogleProfile({
          db,
          email: user.email,
          image: user.image,
          name: user.name,
        });

        if (hasGoogleCalendarReadonlyScope(account?.scope)) {
          if (account?.access_token) {
            await upsertGoogleOAuthToken({
              db,
              input: {
                accessToken: account.access_token,
                accountEmail: user.email,
                expiresAt: account.expires_at
                  ? new Date(account.expires_at * 1000)
                  : null,
                providerAccountId: account.providerAccountId,
                refreshToken: account.refresh_token,
                scopes: account.scope,
              },
              userId: owner.id,
            });
          }

          await upsertGoogleCalendarConnection({
            db,
            input: {
              accountEmail: user.email,
              displayName: "Google Calendar",
              providerAccountId: account?.providerAccountId,
              scopes: account?.scope,
            },
            userId: owner.id,
          });
        }
      }

      return true;
    },
  },
  session: {
    strategy: "jwt",
  },
  providers:
    serverEnv.AUTH_GOOGLE_ID && serverEnv.AUTH_GOOGLE_SECRET
      ? [
          GoogleProvider({
            authorization: {
              params: {
                access_type: "offline",
                prompt: "consent",
                scope: googleAuthScopes,
              },
            },
            clientId: serverEnv.AUTH_GOOGLE_ID,
            clientSecret: serverEnv.AUTH_GOOGLE_SECRET,
          }),
        ]
      : [],
};

function syncGoogleCalendarJwtClaims(
  token: JWT,
  account: Account | null | undefined,
) {
  if (account?.provider !== "google") {
    return;
  }

  if (account.access_token && hasGoogleCalendarReadonlyScope(account.scope)) {
    token.googleCalendarAccessToken = account.access_token;
    token.googleCalendarAccessTokenExpiresAt = account.expires_at ?? null;
    token.googleCalendarProviderAccountId = account.providerAccountId ?? null;
    token.googleCalendarScopes = account.scope ?? null;
    return;
  }

  delete token.googleCalendarAccessToken;
  delete token.googleCalendarAccessTokenExpiresAt;
  delete token.googleCalendarProviderAccountId;
  delete token.googleCalendarScopes;
}
