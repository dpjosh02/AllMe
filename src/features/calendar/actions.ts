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
      .returning({ id: notes.id });

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

function isCalendarEventReviewStatus(
  value: string,
): value is (typeof calendarEventReviewStatuses)[number] {
  return calendarEventReviewStatuses.some((status) => status === value);
}
