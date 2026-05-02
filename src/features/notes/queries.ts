import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";

import { formatDisplayDate } from "@/features/today/date";
import { db } from "@/server/db";
import { notes } from "@/server/db/schema";

export type NotesPageData = Awaited<ReturnType<typeof getNotesPageData>>;

export async function getNotesPageData(userId: string) {
  const [activeCaptures, completedCaptures, dailyNotes] = await Promise.all([
    getActiveCaptures(userId),
    getCompletedCaptures(userId),
    getDailyNotes(userId),
  ]);

  return {
    activeCaptures,
    completedCaptures,
    dailyNotes,
    stats: {
      activeCaptureCount: activeCaptures.length,
      completedCaptureCount: completedCaptures.length,
      dailyNoteCount: dailyNotes.length,
    },
  };
}

export async function getCaptureDetail({
  captureId,
  userId,
}: {
  captureId: string;
  userId: string;
}) {
  const rows = await db
    .select({
      body: notes.body,
      completedAt: notes.completedAt,
      createdAt: notes.createdAt,
      id: notes.id,
      title: notes.title,
      updatedAt: notes.updatedAt,
    })
    .from(notes)
    .where(
      and(
        eq(notes.id, captureId),
        eq(notes.userId, userId),
        isNull(notes.noteDate),
      ),
    )
    .limit(1);

  return rows.length > 0 ? rows[0] : null;
}

async function getActiveCaptures(userId: string) {
  return db
    .select({
      body: notes.body,
      createdAt: notes.createdAt,
      id: notes.id,
      title: notes.title,
      updatedAt: notes.updatedAt,
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
    .limit(20);
}

async function getCompletedCaptures(userId: string) {
  return db
    .select({
      body: notes.body,
      completedAt: notes.completedAt,
      id: notes.id,
      title: notes.title,
    })
    .from(notes)
    .where(
      and(
        eq(notes.userId, userId),
        isNull(notes.noteDate),
        isNotNull(notes.completedAt),
      ),
    )
    .orderBy(desc(notes.completedAt))
    .limit(12);
}

async function getDailyNotes(userId: string) {
  const rows = await db
    .select({
      body: notes.body,
      id: notes.id,
      noteDate: notes.noteDate,
      title: notes.title,
      updatedAt: notes.updatedAt,
    })
    .from(notes)
    .where(and(eq(notes.userId, userId), isNotNull(notes.noteDate)))
    .orderBy(desc(notes.noteDate))
    .limit(14);

  return rows.map((note) => ({
    ...note,
    displayDate: note.noteDate ? formatDisplayDate(note.noteDate) : note.title,
  }));
}
