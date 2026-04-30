import { eq } from "drizzle-orm";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { serverEnv } from "@/lib/env";
import { auth } from "@/server/auth";
import { resolveAuthorizationDecision } from "@/server/auth/access-control";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";

export type CurrentUser = {
  email: string;
  id: string;
  image: string | null;
  name: string | null;
};

export class AuthorizationError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const ownerEmail = serverEnv.ALLME_IMPORT_USER_EMAIL;

  if (serverEnv.ALLME_AUTH_MODE === "local-owner") {
    return ownerEmail ? getUserByEmail(ownerEmail) : null;
  }

  const session = await auth();
  const sessionEmail = session?.user?.email;
  const decision = resolveAuthorizationDecision({
    authMode: serverEnv.ALLME_AUTH_MODE,
    ownerEmail,
    sessionEmail,
  });

  if (decision.status !== "authorized" || !sessionEmail) {
    return null;
  }

  return getUserByEmail(sessionEmail);
}

export async function requireCurrentUser() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new AuthorizationError();
  }

  return currentUser;
}

export async function requireOwnerUser() {
  return requireCurrentUser();
}

export async function requirePageUser(callbackUrl: string) {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    return currentUser;
  }

  if (serverEnv.ALLME_AUTH_MODE === "hosted") {
    const session = await auth();
    const decision = resolveAuthorizationDecision({
      authMode: serverEnv.ALLME_AUTH_MODE,
      ownerEmail: serverEnv.ALLME_IMPORT_USER_EMAIL,
      sessionEmail: session?.user?.email,
    });

    if (decision.status === "unauthenticated") {
      redirect(
        `/signin?callbackUrl=${encodeURIComponent(callbackUrl)}` as Route,
      );
    }
  }

  redirect("/unauthorized" as Route);
}

async function getUserByEmail(email: string): Promise<CurrentUser | null> {
  const [user] = await db
    .select({
      email: users.email,
      id: users.id,
      image: users.image,
      name: users.name,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return user;
}
