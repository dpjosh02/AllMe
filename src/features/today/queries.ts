import { and, desc, eq, isNull } from "drizzle-orm";

import { getLocalDateKey, formatDisplayDate } from "@/features/today/date";
import { db } from "@/server/db";
import { notes, userSettings } from "@/server/db/schema";

export type TodayPageData = Awaited<ReturnType<typeof getTodayPageData>>;

const defaultTimezone = "America/Chicago";

export async function getTodayPageData(userId: string) {
  const timezone = await getUserTimezone(userId);
  const dateKey = getLocalDateKey({ timezone });
  const dailyNote = await ensureDailyNote({ dateKey, userId });

  return {
    dateKey,
    displayDate: formatDisplayDate(dateKey),
    dailyNote,
    quickCaptures: await getQuickCaptures(userId),
    timezone,
  };
}

async function getUserTimezone(userId: string) {
  await db
    .insert(userSettings)
    .values({ userId })
    .onConflictDoNothing();

  const [settings] = await db
    .select({ timezone: userSettings.timezone })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  return settings?.timezone ?? defaultTimezone;
}

async function ensureDailyNote({
  dateKey,
  userId,
}: {
  dateKey: string;
  userId: string;
}) {
  const [existingNote] = await db
    .select({
      body: notes.body,
      id: notes.id,
      title: notes.title,
      updatedAt: notes.updatedAt,
    })
    .from(notes)
    .where(and(eq(notes.userId, userId), eq(notes.noteDate, dateKey)))
    .limit(1);

  if (existingNote) {
    return existingNote;
  }

  const [createdNote] = await db
    .insert(notes)
    .values({
      noteDate: dateKey,
      title: `Daily note · ${formatDisplayDate(dateKey)}`,
      userId,
    })
    .returning({
      body: notes.body,
      id: notes.id,
      title: notes.title,
      updatedAt: notes.updatedAt,
    });

  return createdNote;
}

async function getQuickCaptures(userId: string) {
  return db
    .select({
      body: notes.body,
      createdAt: notes.createdAt,
      id: notes.id,
      title: notes.title,
    })
    .from(notes)
    .where(and(eq(notes.userId, userId), isNull(notes.noteDate)))
    .orderBy(desc(notes.createdAt))
    .limit(5);
}
