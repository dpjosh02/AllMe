import { createRequire } from "node:module";
import type { loadEnvConfig as loadNextEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env") as {
  loadEnvConfig: typeof loadNextEnvConfig;
};

loadEnvConfig(process.cwd());

const userEmail = process.env.ALLME_IMPORT_USER_EMAIL;

if (!userEmail) {
  console.error(
    "Missing required environment variable: ALLME_IMPORT_USER_EMAIL",
  );
  process.exit(1);
}

const { executeInitialGoogleCalendarFullSync } = await import(
  "@/features/calendar/sync/initial-full-sync"
);
const { db } = await import("@/server/db");
const { resolveGoogleCalendarAccessToken } = await import(
  "@/server/auth/google-calendar-token"
);
const { users } = await import("@/server/db/schema");

const owners = await db
  .select({ id: users.id })
  .from(users)
  .where(eq(users.email, userEmail))
  .limit(1);

if (owners.length === 0) {
  console.error(`No AllMe user found for ALLME_IMPORT_USER_EMAIL=${userEmail}`);
  process.exit(1);
}

const user = owners[0];
const token = await resolveGoogleCalendarAccessToken({ userId: user.id });
const result = await executeInitialGoogleCalendarFullSync({
  token,
  userId: user.id,
});

console.info("Google Calendar full sync succeeded.");
console.info(`Import run: ${result.syncRunId}`);
console.info(`Calendars scanned: ${result.calendars}`);
console.info(`Events imported: ${result.events}`);
console.info(`Events cancelled: ${result.cancelledEvents}`);
console.info(`Events skipped: ${result.unmatchedEvents}`);
