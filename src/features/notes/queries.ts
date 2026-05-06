import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";

import { buildNotesStats } from "@/features/notes/read-model";
import { formatDisplayDate } from "@/features/today/date";
import { db } from "@/server/db";
import { calendarEventNoteLinks, notes } from "@/server/db/schema";

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
    stats: buildNotesStats({
      activeCaptureCount: activeCaptures.length,
      completedCaptureCount: completedCaptures.length,
      dailyNoteCount: dailyNotes.length,
    }),
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

  if (rows.length === 0) {
    return null;
  }

  const [capture] = await attachLinkedCalendarNoteState({
    notes: rows,
    userId,
  });

  return capture ?? null;
}

async function getActiveCaptures(userId: string) {
  const rows = await db
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

  return attachLinkedCalendarNoteState({ notes: rows, userId });
}

async function getCompletedCaptures(userId: string) {
  const rows = await db
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

  return attachLinkedCalendarNoteState({ notes: rows, userId });
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

  const rowsWithLinkState = await attachLinkedCalendarNoteState({
    notes: rows,
    userId,
  });

  return rowsWithLinkState.map((note) => ({
    ...note,
    displayDate: note.noteDate ? formatDisplayDate(note.noteDate) : note.title,
  }));
}

async function attachLinkedCalendarNoteState<TNote extends { id: string }>({
  notes: noteRows,
  userId,
}: {
  notes: TNote[];
  userId: string;
}) {
  if (noteRows.length === 0) {
    return [];
  }

  const links = await db
    .select({
      noteId: calendarEventNoteLinks.noteId,
      scope: calendarEventNoteLinks.scope,
    })
    .from(calendarEventNoteLinks)
    .where(
      and(
        eq(calendarEventNoteLinks.userId, userId),
        inArray(
          calendarEventNoteLinks.noteId,
          noteRows.map((note) => note.id),
        ),
      ),
    );
  const linksByNoteId = new Map(
    links.map((link) => [
      link.noteId,
      {
        linkedCalendarScope: link.scope,
        isLinkedToCalendarEvent: true,
      },
    ]),
  );

  return noteRows.map((note) => ({
    ...note,
    isLinkedToCalendarEvent:
      linksByNoteId.get(note.id)?.isLinkedToCalendarEvent ?? false,
    linkedCalendarScope:
      linksByNoteId.get(note.id)?.linkedCalendarScope ?? null,
  }));
}
