"use server";

import { and, eq, or, type SQL } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { syncGoogleCalendarIncremental } from "@/features/calendar/sync/initial-full-sync";
import { requireOwnerUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import {
  calendarCalendars,
  calendarEventAnnotations,
  calendarEventNoteLinks,
  calendarEvents,
  notes,
} from "@/server/db/schema";

export async function syncGoogleCalendarNow() {
  await syncGoogleCalendarIncremental();

  revalidatePath("/calendar");
  revalidatePath("/settings");
  revalidatePath("/today");
}

export async function updateCalendarSelection(formData: FormData) {
  const user = await requireOwnerUser();
  const calendarId = String(formData.get("calendarId") ?? "");
  const isSelected = formData.get("isSelected") === "true";

  if (!calendarId) {
    throw new Error("Missing calendar selection target.");
  }

  await db
    .update(calendarCalendars)
    .set({
      isSelected,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(calendarCalendars.id, calendarId),
        eq(calendarCalendars.userId, user.id),
      ),
    );

  revalidatePath("/calendar");
  revalidatePath("/today");
}

export async function updateCalendarEventReviewStatus(formData: FormData) {
  const user = await requireOwnerUser();
  const eventId = String(formData.get("eventId") ?? "");
  const reviewStatus = parseCalendarEventReviewStatus(formData);

  if (!eventId) {
    throw new Error("Missing calendar event target.");
  }

  const [event] = await db
    .select({ id: calendarEvents.id })
    .from(calendarEvents)
    .where(and(eq(calendarEvents.id, eventId), eq(calendarEvents.userId, user.id)))
    .limit(1);

  if (!event) {
    throw new Error("Calendar event not found.");
  }

  await db
    .insert(calendarEventAnnotations)
    .values({
      eventId: event.id,
      reviewStatus,
      userId: user.id,
    })
    .onConflictDoUpdate({
      target: [
        calendarEventAnnotations.userId,
        calendarEventAnnotations.eventId,
      ],
      set: {
        reviewStatus,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/calendar");
  revalidatePath("/today");
}

export async function createLinkedNoteFromCalendarEvent(formData: FormData) {
  const user = await requireOwnerUser();
  const eventId = getCalendarEventId(formData);
  const linkScope = parseCalendarEventNoteLinkScope(formData);
  const event = await getCalendarEventForLink({ eventId, userId: user.id });

  if (!event) {
    throw new Error("Calendar event not found.");
  }

  const [createdNote] = await db.transaction(async (tx) => {
    const [note] = await tx
      .insert(notes)
      .values({
        title: `Event note · ${event.title}`,
        userId: user.id,
      })
      .returning({
        body: notes.body,
        id: notes.id,
        noteDate: notes.noteDate,
        title: notes.title,
      });

    if (!note) {
      throw new Error("Unable to create linked note.");
    }

    await replaceCalendarEventNoteLink({
      event,
      linkScope,
      noteId: note.id,
      tx,
      userId: user.id,
    });

    return [note];
  });

  revalidateCalendarNoteViews(createdNote.id);

  return toCalendarLinkedNoteMutationResult({
    note: createdNote,
    scope: linkScope,
  });
}

export async function linkExistingNoteToCalendarEvent(formData: FormData) {
  const user = await requireOwnerUser();
  const eventId = getCalendarEventId(formData);
  const noteId = String(formData.get("noteId") ?? "");
  const linkScope = parseCalendarEventNoteLinkScope(formData);

  if (!noteId) {
    throw new Error("Missing note target.");
  }

  const [event, note] = await Promise.all([
    getCalendarEventForLink({ eventId, userId: user.id }),
    getNoteForLink({ noteId, userId: user.id }),
  ]);

  if (!event) {
    throw new Error("Calendar event not found.");
  }

  if (!note) {
    throw new Error("Note not found.");
  }

  await db.transaction(async (tx) => {
    await replaceCalendarEventNoteLink({
      event,
      linkScope,
      noteId: note.id,
      tx,
      userId: user.id,
    });
  });

  revalidateCalendarNoteViews(note.id);
}

export async function unlinkNoteFromCalendarEvent(formData: FormData) {
  const user = await requireOwnerUser();
  const eventId = getCalendarEventId(formData);
  const noteId = String(formData.get("noteId") ?? "");
  const linkScope = parseCalendarEventNoteLinkScope(formData);
  const event = await getCalendarEventForLink({ eventId, userId: user.id });

  if (!noteId) {
    throw new Error("Missing note target.");
  }

  if (!event) {
    throw new Error("Calendar event not found.");
  }

  await db
    .delete(calendarEventNoteLinks)
    .where(
      and(
        eq(calendarEventNoteLinks.userId, user.id),
        eq(calendarEventNoteLinks.noteId, noteId),
        getCalendarEventNoteLinkTargetPredicate({ event, linkScope }),
      ),
    );

  revalidateCalendarNoteViews(noteId);
}

export async function updateLinkedCalendarNote(formData: FormData) {
  const user = await requireOwnerUser();
  const noteId = String(formData.get("noteId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "");

  if (!noteId) {
    throw new Error("Missing note target.");
  }

  if (!title) {
    throw new Error("Linked note title is required.");
  }

  const [updatedNote] = await db
    .update(notes)
    .set({
      body,
      title,
      updatedAt: new Date(),
    })
    .where(and(eq(notes.id, noteId), eq(notes.userId, user.id)))
    .returning({
      body: notes.body,
      id: notes.id,
      noteDate: notes.noteDate,
      title: notes.title,
    });

  if (!updatedNote) {
    throw new Error("Linked note not found.");
  }

  revalidateCalendarNoteViews(updatedNote.id);

  return toCalendarLinkedNoteMutationResult({ note: updatedNote });
}

const calendarEventReviewStatuses = [
  "none",
  "needs_prep",
  "done",
  "ignored",
] as const;

function parseCalendarEventReviewStatus(formData: FormData) {
  const reviewStatus = String(formData.get("reviewStatus") ?? "");

  if (!isCalendarEventReviewStatus(reviewStatus)) {
    throw new Error("Invalid calendar event review status.");
  }

  return reviewStatus;
}

type CalendarEventNoteLinkScope = "event_instance" | "recurring_series";

export type CalendarLinkedNoteMutationResult = {
  body: string;
  href: string;
  id: string;
  noteDate: string | null;
  scope: CalendarEventNoteLinkScope | null;
  title: string;
};

type CalendarEventForLink = NonNullable<
  Awaited<ReturnType<typeof getCalendarEventForLink>>
>;

type CalendarEventNoteLinkTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

async function getCalendarEventForLink({
  eventId,
  userId,
}: {
  eventId: string;
  userId: string;
}) {
  const [event] = await db
    .select({
      calendarId: calendarEvents.calendarId,
      id: calendarEvents.id,
      recurringEventId: calendarEvents.recurringEventId,
      sourceIcalUid: calendarEvents.sourceIcalUid,
      title: calendarEvents.title,
    })
    .from(calendarEvents)
    .where(and(eq(calendarEvents.id, eventId), eq(calendarEvents.userId, userId)))
    .limit(1);

  return event ?? null;
}

async function getNoteForLink({
  noteId,
  userId,
}: {
  noteId: string;
  userId: string;
}) {
  const [note] = await db
    .select({ id: notes.id })
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
    .limit(1);

  return note ?? null;
}

async function replaceCalendarEventNoteLink({
  event,
  linkScope,
  noteId,
  tx,
  userId,
}: {
  event: CalendarEventForLink;
  linkScope: CalendarEventNoteLinkScope;
  noteId: string;
  tx: CalendarEventNoteLinkTransaction;
  userId: string;
}) {
  await tx
    .delete(calendarEventNoteLinks)
    .where(
      and(
        eq(calendarEventNoteLinks.userId, userId),
        getCalendarEventNoteLinkTargetPredicate({ event, linkScope }),
      ),
    );

  await tx.insert(calendarEventNoteLinks).values({
    calendarId: event.calendarId,
    eventId: linkScope === "event_instance" ? event.id : null,
    noteId,
    recurringEventId:
      linkScope === "recurring_series" ? event.recurringEventId : null,
    scope: linkScope,
    sourceIcalUid: linkScope === "recurring_series" ? event.sourceIcalUid : null,
    userId,
  });
}

function getCalendarEventNoteLinkTargetPredicate({
  event,
  linkScope,
}: {
  event: CalendarEventForLink;
  linkScope: CalendarEventNoteLinkScope;
}): SQL {
  if (linkScope === "event_instance") {
    return and(
      eq(calendarEventNoteLinks.scope, "event_instance"),
      eq(calendarEventNoteLinks.eventId, event.id),
    ) as SQL;
  }

  const seriesPredicates = [
    event.sourceIcalUid
      ? eq(calendarEventNoteLinks.sourceIcalUid, event.sourceIcalUid)
      : null,
    event.recurringEventId
      ? eq(calendarEventNoteLinks.recurringEventId, event.recurringEventId)
      : null,
  ].filter((predicate): predicate is SQL => Boolean(predicate));

  if (seriesPredicates.length === 0) {
    throw new Error("Calendar event does not have recurring-series identity.");
  }

  return and(
    eq(calendarEventNoteLinks.scope, "recurring_series"),
    eq(calendarEventNoteLinks.calendarId, event.calendarId),
    or(...seriesPredicates),
  ) as SQL;
}

function getCalendarEventId(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");

  if (!eventId) {
    throw new Error("Missing calendar event target.");
  }

  return eventId;
}

function parseCalendarEventNoteLinkScope(
  formData: FormData,
): CalendarEventNoteLinkScope {
  const linkScope = String(formData.get("linkScope") ?? "event_instance");

  if (
    linkScope === "event_instance" ||
    linkScope === "recurring_series"
  ) {
    return linkScope;
  }

  throw new Error("Invalid calendar event note link scope.");
}

function revalidateCalendarNoteViews(noteId: string) {
  revalidatePath("/calendar");
  revalidatePath("/today");
  revalidatePath("/notes");
  revalidatePath(`/notes/captures/${noteId}`);
}

function toCalendarLinkedNoteMutationResult({
  note,
  scope = null,
}: {
  note: {
    body: string;
    id: string;
    noteDate: string | null;
    title: string;
  };
  scope?: CalendarEventNoteLinkScope | null;
}): CalendarLinkedNoteMutationResult {
  return {
    body: note.body,
    href: note.noteDate
      ? `/today?date=${note.noteDate}`
      : `/notes/captures/${note.id}`,
    id: note.id,
    noteDate: note.noteDate,
    scope,
    title: note.title,
  };
}

function isCalendarEventReviewStatus(
  value: string,
): value is (typeof calendarEventReviewStatuses)[number] {
  return calendarEventReviewStatuses.some((status) => status === value);
}
