import GoogleProvider from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

import { serverEnv } from "@/lib/env";

export const authOptions: NextAuthConfig = {
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
