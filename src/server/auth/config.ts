import GoogleProvider from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

import { serverEnv } from "@/lib/env";
import {
  isProductRoute,
  isPublicRoute,
  isOwnerEmail,
  resolveAuthorizationDecision,
} from "@/server/auth/access-control";

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
    jwt({ token, user }) {
      if (user?.email) {
        token.email = user.email;
      }

      if (user?.name) {
        token.name = user.name;
      }

      if (user?.image) {
        token.picture = user.image;
      }

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
    signIn({ user }) {
      return isOwnerEmail(user.email, serverEnv.ALLME_IMPORT_USER_EMAIL);
    },
  },
  session: {
    strategy: "jwt",
  },
  providers:
    serverEnv.AUTH_GOOGLE_ID && serverEnv.AUTH_GOOGLE_SECRET
      ? [
          GoogleProvider({
            clientId: serverEnv.AUTH_GOOGLE_ID,
            clientSecret: serverEnv.AUTH_GOOGLE_SECRET,
          }),
        ]
      : [],
};
