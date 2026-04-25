import NextAuth from "next-auth";

import { authOptions } from "@/server/auth/config";

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
