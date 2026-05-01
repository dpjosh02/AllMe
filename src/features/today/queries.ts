import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";

import {
  getLocalDateKey,
  formatDisplayDate,
  isDateKey,
} from "@/features/today/date";
import { db } from "@/server/db";
import { notes, userSettings } from "@/server/db/schema";

export type TodayPageData = Awaited<ReturnType<typeof getTodayPageData>>;

const defaultTimezone = "America/Chicago";

export async function getTodayPageData({
  requestedDateKey,
  userId,
}: {
  requestedDateKey?: string;
  userId: string;
}) {
  const timezone = await getUserTimezone(userId);
  const localTodayKey = getLocalDateKey({ timezone });
  const dateKey =
    requestedDateKey && isDateKey(requestedDateKey)
      ? requestedDateKey
      : localTodayKey;
  const dailyNote = await ensureDailyNote({ dateKey, userId });

  return {
    dateKey,
    displayDate: formatDisplayDate(dateKey),
    dailyNote,
    isViewingToday: dateKey === localTodayKey,
    localTodayKey,
    quickCaptures: await getQuickCaptures(userId),
    recentDailyNotes: await getRecentDailyNotes(userId),
    timezone,
  };
}

async function getUserTimezone(userId: string) {
  await db.insert(userSettings).values({ userId }).onConflictDoNothing();

  const settingRows = await db
    .select({ timezone: userSettings.timezone })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  return settingRows.length > 0 ? settingRows[0].timezone : defaultTimezone;
}

async function ensureDailyNote({
  dateKey,
  userId,
}: {
  dateKey: string;
  userId: string;
}) {
  const existingNotes = await db
    .select({
      body: notes.body,
      id: notes.id,
      title: notes.title,
      updatedAt: notes.updatedAt,
    })
    .from(notes)
    .where(and(eq(notes.userId, userId), eq(notes.noteDate, dateKey)))
    .limit(1);
  const existingNote = existingNotes.length > 0 ? existingNotes[0] : null;

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
    .where(
      and(
        eq(notes.userId, userId),
        isNull(notes.noteDate),
        isNull(notes.completedAt),
      ),
    )
    .orderBy(desc(notes.createdAt))
    .limit(5);
}

async function getRecentDailyNotes(userId: string) {
  const rows = await db
    .select({
      id: notes.id,
      noteDate: notes.noteDate,
      title: notes.title,
      updatedAt: notes.updatedAt,
    })
    .from(notes)
    .where(and(eq(notes.userId, userId), isNotNull(notes.noteDate)))
    .orderBy(desc(notes.noteDate))
    .limit(7);

  return rows.map((note) => ({
    ...note,
    displayDate: formatNullableDisplayDate(note.noteDate),
  }));
}

function formatNullableDisplayDate(dateKey: string | null) {
  return dateKey ? formatDisplayDate(dateKey) : null;
}
