import { and, desc, eq, inArray, or, type SQL } from "drizzle-orm";

import { db } from "@/server/db";
import {
  calendarEventNoteLinks,
  notes,
} from "@/server/db/schema";

export type CalendarEventNoteLinkScope =
  | "event_instance"
  | "recurring_series";

export type CalendarEventLinkedNoteFields = {
  linkedNoteDate: string | null;
  linkedNoteHref: string | null;
  linkedNoteId: string | null;
  linkedNoteScope: CalendarEventNoteLinkScope | null;
  linkedNoteTitle: string | null;
};

export type CalendarEventNoteLinkTargetEvent = {
  calendarId: string;
  id: string;
  recurringEventId: string | null;
  sourceIcalUid: string | null;
};

export type CalendarEventNoteLinkRecord = {
  calendarId: string | null;
  eventId: string | null;
  noteDate: string | null;
  noteId: string;
  noteTitle: string;
  recurringEventId: string | null;
  scope: CalendarEventNoteLinkScope;
  sourceIcalUid: string | null;
};

export async function getCalendarEventNoteLinksForEvents({
  events,
  userId,
}: {
  events: CalendarEventNoteLinkTargetEvent[];
  userId: string;
}) {
  const predicates = getEventNoteLinkPredicates(events);

  if (predicates.length === 0) {
    return [];
  }

  return db
    .select({
      calendarId: calendarEventNoteLinks.calendarId,
      eventId: calendarEventNoteLinks.eventId,
      noteDate: notes.noteDate,
      noteId: calendarEventNoteLinks.noteId,
      noteTitle: notes.title,
      recurringEventId: calendarEventNoteLinks.recurringEventId,
      scope: calendarEventNoteLinks.scope,
      sourceIcalUid: calendarEventNoteLinks.sourceIcalUid,
    })
    .from(calendarEventNoteLinks)
    .innerJoin(notes, eq(notes.id, calendarEventNoteLinks.noteId))
    .where(
      and(
        eq(calendarEventNoteLinks.userId, userId),
        eq(notes.userId, userId),
        or(...predicates),
      ),
    )
    .orderBy(desc(calendarEventNoteLinks.updatedAt));
}

export function attachLinkedNotesToCalendarEvents<
  TEvent extends CalendarEventNoteLinkTargetEvent,
>({
  events,
  links,
}: {
  events: TEvent[];
  links: CalendarEventNoteLinkRecord[];
}): Array<TEvent & CalendarEventLinkedNoteFields> {
  return events.map((event) => {
    const link = getBestEventNoteLink({ event, links });

    return {
      ...event,
      linkedNoteDate: link?.noteDate ?? null,
      linkedNoteHref: link ? getLinkedNoteHref(link) : null,
      linkedNoteId: link?.noteId ?? null,
      linkedNoteScope: link?.scope ?? null,
      linkedNoteTitle: link?.noteTitle ?? null,
    };
  });
}

function getLinkedNoteHref(link: CalendarEventNoteLinkRecord) {
  return link.noteDate ? `/today?date=${link.noteDate}` : `/notes/captures/${link.noteId}`;
}

function getEventNoteLinkPredicates(
  events: CalendarEventNoteLinkTargetEvent[],
) {
  const eventIds = events.map((event) => event.id);
  const sourceIcalUids = getUniqueValues(
    events.map((event) => event.sourceIcalUid),
  );
  const recurringEventIds = getUniqueValues(
    events.map((event) => event.recurringEventId),
  );
  const predicates: SQL[] = [];

  if (eventIds.length > 0) {
    predicates.push(inArray(calendarEventNoteLinks.eventId, eventIds));
  }

  if (sourceIcalUids.length > 0) {
    predicates.push(inArray(calendarEventNoteLinks.sourceIcalUid, sourceIcalUids));
  }

  if (recurringEventIds.length > 0) {
    predicates.push(
      inArray(calendarEventNoteLinks.recurringEventId, recurringEventIds),
    );
  }

  return predicates;
}

function getBestEventNoteLink({
  event,
  links,
}: {
  event: CalendarEventNoteLinkTargetEvent;
  links: CalendarEventNoteLinkRecord[];
}) {
  return (
    links.find(
      (link) =>
        link.scope === "event_instance" &&
        link.eventId !== null &&
        link.eventId === event.id,
    ) ??
    links.find((link) => isMatchingSeriesLink({ event, link })) ??
    null
  );
}

function isMatchingSeriesLink({
  event,
  link,
}: {
  event: CalendarEventNoteLinkTargetEvent;
  link: CalendarEventNoteLinkRecord;
}) {
  if (link.scope !== "recurring_series" || link.calendarId !== event.calendarId) {
    return false;
  }

  return (
    (Boolean(link.sourceIcalUid) &&
      link.sourceIcalUid === event.sourceIcalUid) ||
    (Boolean(link.recurringEventId) &&
      link.recurringEventId === event.recurringEventId)
  );
}

function getUniqueValues(values: Array<string | null>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}
