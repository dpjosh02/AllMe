import { createRequire } from "node:module";
import type { loadEnvConfig as loadNextEnvConfig } from "@next/env";
import { and, asc, eq, isNotNull, sql } from "drizzle-orm";

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

const { db } = await import("@/server/db");
const { calendarCalendars, calendarEvents, users } = await import(
  "@/server/db/schema"
);

const [summary] = await db
  .select({
    recurringEvents: sql<number>`count(*) filter (where ${calendarEvents.recurringEventId} is not null)`,
    recurringEventsWithOriginalStart: sql<number>`count(*) filter (where ${calendarEvents.recurringEventId} is not null and ${calendarEvents.originalStartAt} is not null)`,
    writableReadyOccurrences: sql<number>`count(*) filter (
      where ${calendarEvents.recurringEventId} is not null
        and ${calendarEvents.originalStartAt} is not null
        and ${calendarEvents.etag} is not null
        and ${calendarEvents.sourceEventId} is not null
        and ${calendarCalendars.isSelected} = true
        and ${calendarCalendars.isDeleted} = false
        and ${calendarCalendars.accessRole} in ('writer', 'owner')
    )`,
  })
  .from(calendarEvents)
  .innerJoin(
    calendarCalendars,
    eq(calendarCalendars.id, calendarEvents.calendarId),
  )
  .innerJoin(users, eq(users.id, calendarEvents.userId))
  .where(eq(users.email, userEmail));

const candidates = await db
  .select({
    accessRole: calendarCalendars.accessRole,
    calendarName: calendarCalendars.name,
    etag: calendarEvents.etag,
    id: calendarEvents.id,
    originalStartAt: calendarEvents.originalStartAt,
    recurringEventId: calendarEvents.recurringEventId,
    sourceEventId: calendarEvents.sourceEventId,
    startAt: calendarEvents.startAt,
    startDate: calendarEvents.startDate,
    title: calendarEvents.title,
  })
  .from(calendarEvents)
  .innerJoin(
    calendarCalendars,
    eq(calendarCalendars.id, calendarEvents.calendarId),
  )
  .innerJoin(users, eq(users.id, calendarEvents.userId))
  .where(
    and(
      eq(users.email, userEmail),
      isNotNull(calendarEvents.recurringEventId),
    ),
  )
  .orderBy(asc(calendarEvents.startAt), asc(calendarEvents.startDate))
  .limit(10);

console.info("Calendar recurring-write smoke readiness");
console.info(`Owner: ${userEmail}`);
console.info(`Recurring cached events: ${summary.recurringEvents}`);
console.info(
  `Recurring events with original_start_at: ${summary.recurringEventsWithOriginalStart}`,
);
console.info(
  `Writable this-event-only candidates: ${summary.writableReadyOccurrences}`,
);

if (summary.writableReadyOccurrences === 0) {
  console.info("");
  console.info("No safe this-event-only provider-write smoke candidate found.");
  console.info(
    "Create or sync an upcoming recurring Google Calendar event with an occurrence id, recurring series id, original_start_at, cached ETag, and writer/owner access.",
  );
}

if (candidates.length > 0) {
  console.info("");
  console.info("First recurring cached rows:");

  for (const candidate of candidates) {
    console.info(
      [
        `- ${candidate.title}`,
        `calendar=${candidate.calendarName}`,
        `start=${candidate.startAt?.toISOString() ?? candidate.startDate}`,
        `sourceEventId=${candidate.sourceEventId}`,
        `recurringEventId=${candidate.recurringEventId ?? "missing"}`,
        `originalStartAt=${candidate.originalStartAt?.toISOString() ?? "missing"}`,
        `etag=${candidate.etag ? "present" : "missing"}`,
        `accessRole=${candidate.accessRole ?? "missing"}`,
      ].join(" | "),
    );
  }
}
