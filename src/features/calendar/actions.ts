"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
  createGoogleCalendarEvent,
  fetchGoogleCalendarEvent,
  patchGoogleCalendarEventDescription,
  type GoogleCalendarProviderEvent,
} from "@/features/calendar/integrations/google-calendar";
import {
  createCalendarEventInGoogle,
  type CalendarEventCreateForm,
} from "@/features/calendar/provider-write/create-event";
import {
  CalendarProviderWriteUserError,
  publishNoteDescriptionToGoogle,
  type ProviderWriteAuditDraft,
} from "@/features/calendar/provider-write/publish-note-description";
import { syncGoogleCalendarIncremental } from "@/features/calendar/sync/initial-full-sync";
import {
  googleCalendarOfflineConsentParams,
  googleCalendarWriteAuthScope,
} from "@/server/auth/google-calendar-scopes";
import { resolveGoogleCalendarAccessToken } from "@/server/auth/google-calendar-token";
import { requireOwnerUser } from "@/server/auth/guards";
import { signIn } from "@/server/auth";
import { db } from "@/server/db";
import {
  calendarCalendars,
  calendarEventAnnotations,
  calendarEventNoteLinks,
  calendarEvents,
  calendarConnections,
  calendarProviderWriteAudit,
  notes,
} from "@/server/db/schema";

export async function syncGoogleCalendarNow() {
  await syncGoogleCalendarIncremental();

  revalidatePath("/calendar");
  revalidatePath("/settings");
  revalidatePath("/today");
}

export async function reconnectGoogleCalendarWithWriteAccess(formData: FormData) {
  await requireOwnerUser();

  await signIn(
    "google",
    {
      redirectTo: normalizeCalendarReauthorizationRedirect(
        String(formData.get("redirectTo") ?? "/calendar"),
      ),
    },
    {
      ...googleCalendarOfflineConsentParams,
      scope: googleCalendarWriteAuthScope,
    },
  );
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

function normalizeCalendarReauthorizationRedirect(value: string) {
  if (
    value === "/calendar" ||
    value === "/settings" ||
    value.startsWith("/calendar?") ||
    value.startsWith("/settings?")
  ) {
    return value;
  }

  return "/calendar";
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
  const event = await getCalendarEventForLink({ eventId, userId: user.id });

  if (!event) {
    throw new Error("Calendar event not found.");
  }

  const existingNote = await getExistingCalendarEventNote({
    eventId: event.id,
    userId: user.id,
  });

  if (existingNote) {
    return toCalendarLinkedNoteMutationResult({
      note: existingNote,
      scope: "event_instance",
    });
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
      noteId: note.id,
      tx,
      userId: user.id,
    });

    return [note];
  });

  revalidateCalendarNoteViews(createdNote.id);

  return toCalendarLinkedNoteMutationResult({
    note: createdNote,
    scope: "event_instance",
  });
}

export async function deleteLinkedCalendarNote(formData: FormData) {
  const user = await requireOwnerUser();
  const noteId = String(formData.get("noteId") ?? "");

  if (!noteId) {
    throw new Error("Missing note target.");
  }

  const [link] = await db
    .select({ noteId: calendarEventNoteLinks.noteId })
    .from(calendarEventNoteLinks)
    .where(
      and(
        eq(calendarEventNoteLinks.noteId, noteId),
        eq(calendarEventNoteLinks.userId, user.id),
      ),
    )
    .limit(1);

  if (!link) {
    throw new Error("Linked calendar note not found.");
  }

  await db
    .delete(notes)
    .where(
      and(
        eq(notes.id, noteId),
        eq(notes.userId, user.id),
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

export type CalendarProviderWriteMutationResult =
  | {
      message: string;
      status: "error";
    }
  | {
      message: string;
      status: "succeeded";
    };

export async function publishLinkedCalendarNoteToGoogle(
  formData: FormData,
): Promise<CalendarProviderWriteMutationResult> {
  const user = await requireOwnerUser();
  const eventId = getCalendarEventId(formData);
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  const context = await getCalendarEventForProviderWrite({
    eventId,
    userId: user.id,
  });

  if (!context) {
    return {
      message: "Calendar event or linked note was not found.",
      status: "error",
    };
  }

  try {
    const result = await publishNoteDescriptionToGoogle({
      deps: {
        createAudit: (draft) => createProviderWriteAudit({ draft, userId: user.id }),
        fetchProviderEvent: ({ accessToken, sourceCalendarId, sourceEventId }) =>
          fetchGoogleCalendarEvent({
            accessToken,
            calendarId: sourceCalendarId,
            eventId: sourceEventId,
          }),
        markAudit: markProviderWriteAudit,
        patchProviderDescription: ({
          accessToken,
          description,
          sourceCalendarId,
          sourceEventId,
        }) =>
          patchGoogleCalendarEventDescription({
            accessToken,
            calendarId: sourceCalendarId,
            description,
            eventId: sourceEventId,
          }),
        reconcileLocalEvent: (event) =>
          updateLocalEventFromProviderWrite({
            event,
            eventId: context.eventId,
            userId: user.id,
          }),
        resolveAccessToken: async () => {
          const token = await resolveGoogleCalendarAccessToken({ userId: user.id });

          return {
            accessToken: token.accessToken,
            scopes: token.scopes,
          };
        },
      },
      input: {
        context,
        idempotencyKey,
      },
    });

    revalidatePath("/calendar");
    revalidatePath("/today");

    return {
      message: "Published note to Google Calendar.",
      status: result.status,
    };
  } catch (error) {
    if (error instanceof CalendarProviderWriteUserError) {
      return {
        message: error.message,
        status: "error",
      };
    }

    return {
      message: "Google Calendar publish failed. Try again after syncing.",
      status: "error",
    };
  }
}

export async function createGoogleCalendarEventFromCalendar(
  formData: FormData,
): Promise<CalendarProviderWriteMutationResult> {
  const user = await requireOwnerUser();
  const context = await getCalendarForProviderEventCreate({
    calendarId: String(formData.get("calendarId") ?? ""),
    userId: user.id,
  });

  if (!context) {
    return {
      message: "No writable Google Calendar is available.",
      status: "error",
    };
  }

  try {
    await createCalendarEventInGoogle({
      deps: {
        createAudit: (draft) => createProviderWriteAudit({ draft, userId: user.id }),
        createProviderEvent: ({ accessToken, patch, sourceCalendarId }) =>
          createGoogleCalendarEvent({
            accessToken,
            calendarId: sourceCalendarId,
            patch,
          }),
        markAudit: markProviderWriteAudit,
        reconcileLocalEvent: (event) =>
          upsertLocalEventFromProviderWrite({
            calendarId: context.calendarId,
            connectionId: context.connectionId,
            event,
            userId: user.id,
          }),
        resolveAccessToken: async () => {
          const token = await resolveGoogleCalendarAccessToken({ userId: user.id });

          return {
            accessToken: token.accessToken,
            scopes: token.scopes,
          };
        },
      },
      input: {
        context,
        form: getCalendarEventCreateForm(formData),
        idempotencyKey: String(formData.get("idempotencyKey") ?? ""),
      },
    });

    revalidatePath("/calendar");
    revalidatePath("/today");

    return {
      message: "Created event in Google Calendar.",
      status: "succeeded",
    };
  } catch (error) {
    if (error instanceof CalendarProviderWriteUserError) {
      return {
        message: error.message,
        status: "error",
      };
    }

    return {
      message: "Google Calendar event creation failed. Try again after syncing.",
      status: "error",
    };
  }
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

async function getCalendarEventForProviderWrite({
  eventId,
  userId,
}: {
  eventId: string;
  userId: string;
}) {
  const [event] = await db
    .select({
      accessRole: calendarCalendars.accessRole,
      calendarId: calendarEvents.calendarId,
      connectionId: calendarEvents.connectionId,
      connectionStatus: calendarConnections.status,
      description: calendarEvents.description,
      etag: calendarEvents.etag,
      eventId: calendarEvents.id,
      isCalendarDeleted: calendarCalendars.isDeleted,
      isCalendarSelected: calendarCalendars.isSelected,
      linkedNoteBody: notes.body,
      linkedNoteId: notes.id,
      recurringEventId: calendarEvents.recurringEventId,
      scopes: calendarConnections.scopes,
      sourceCalendarId: calendarCalendars.sourceCalendarId,
      sourceEventId: calendarEvents.sourceEventId,
    })
    .from(calendarEvents)
    .innerJoin(
      calendarCalendars,
      eq(calendarCalendars.id, calendarEvents.calendarId),
    )
    .innerJoin(
      calendarConnections,
      eq(calendarConnections.id, calendarEvents.connectionId),
    )
    .innerJoin(
      calendarEventNoteLinks,
      eq(calendarEventNoteLinks.eventId, calendarEvents.id),
    )
    .innerJoin(notes, eq(notes.id, calendarEventNoteLinks.noteId))
    .where(
      and(
        eq(calendarEvents.id, eventId),
        eq(calendarEvents.userId, userId),
        eq(calendarCalendars.userId, userId),
        eq(calendarConnections.userId, userId),
        eq(calendarEventNoteLinks.userId, userId),
        eq(notes.userId, userId),
      ),
    )
    .limit(1);

  return event ?? null;
}

async function getCalendarForProviderEventCreate({
  calendarId,
  userId,
}: {
  calendarId: string;
  userId: string;
}) {
  const rows = await db
    .select({
      accessRole: calendarCalendars.accessRole,
      calendarId: calendarCalendars.id,
      connectionId: calendarCalendars.connectionId,
      connectionStatus: calendarConnections.status,
      isCalendarDeleted: calendarCalendars.isDeleted,
      isCalendarPrimary: calendarCalendars.isPrimary,
      isCalendarSelected: calendarCalendars.isSelected,
      scopes: calendarConnections.scopes,
      sourceCalendarId: calendarCalendars.sourceCalendarId,
      timezone: calendarCalendars.timezone,
    })
    .from(calendarCalendars)
    .innerJoin(
      calendarConnections,
      eq(calendarConnections.id, calendarCalendars.connectionId),
    )
    .where(
      and(
        eq(calendarCalendars.userId, userId),
        eq(calendarConnections.userId, userId),
      ),
    );

  const requestedCalendar = calendarId
    ? rows.find((calendar) => calendar.calendarId === calendarId)
    : null;

  if (requestedCalendar) {
    return requestedCalendar;
  }

  return (
    rows.find(
      (calendar) =>
        calendar.isCalendarPrimary &&
        calendar.isCalendarSelected &&
        !calendar.isCalendarDeleted &&
        calendar.connectionStatus === "active" &&
        (calendar.accessRole === "writer" || calendar.accessRole === "owner"),
    ) ??
    rows.find(
      (calendar) =>
        calendar.isCalendarSelected &&
        !calendar.isCalendarDeleted &&
        calendar.connectionStatus === "active" &&
        (calendar.accessRole === "writer" || calendar.accessRole === "owner"),
    ) ??
    null
  );
}

async function createProviderWriteAudit({
  draft,
  userId,
}: {
  draft: ProviderWriteAuditDraft;
  userId: string;
}) {
  const [existingAudit] = await db
    .select({
      errorSummary: calendarProviderWriteAudit.errorSummary,
      id: calendarProviderWriteAudit.id,
      status: calendarProviderWriteAudit.status,
    })
    .from(calendarProviderWriteAudit)
    .where(
      and(
        eq(calendarProviderWriteAudit.userId, userId),
        eq(calendarProviderWriteAudit.idempotencyKey, draft.idempotencyKey),
      ),
    )
    .limit(1);

  if (existingAudit) {
    throw new CalendarProviderWriteUserError(
      existingAudit.errorSummary ??
        `A previous publish attempt already finished with status ${existingAudit.status}.`,
      existingAudit.status === "conflict" ? "conflict" : "provider_write_failed",
    );
  }

  const [audit] = await db
    .insert(calendarProviderWriteAudit)
    .values({
      calendarId: draft.calendarId,
      connectionId: draft.connectionId,
      entryPoint: draft.entryPoint,
      eventId: draft.eventId,
      idempotencyKey: draft.idempotencyKey,
      operation: draft.operation,
      previousEtag: draft.previousEtag,
      requestPatch: draft.requestPatch,
      scopeSnapshot: draft.scopeSnapshot,
      sourceCalendarId: draft.sourceCalendarId,
      sourceEventId: draft.sourceEventId,
      startedAt: new Date(),
      status: "pending",
      userId,
    })
    .returning({ id: calendarProviderWriteAudit.id });

  if (!audit) {
    throw new Error("Unable to create provider write audit row.");
  }

  return audit;
}

async function markProviderWriteAudit({
  auditId,
  errorCode = null,
  errorSummary = null,
  providerEtag = null,
  providerUpdatedAt = null,
  status,
}: {
  auditId: string;
  errorCode?: string | null;
  errorSummary?: string | null;
  providerEtag?: string | null;
  providerUpdatedAt?: Date | null;
  status: "conflict" | "failed" | "pending" | "running" | "skipped" | "succeeded";
}) {
  await db
    .update(calendarProviderWriteAudit)
    .set({
      errorCode,
      errorSummary,
      finishedAt: status === "running" ? null : new Date(),
      providerEtag,
      providerUpdatedAt,
      status,
      updatedAt: new Date(),
    })
    .where(eq(calendarProviderWriteAudit.id, auditId));
}

async function updateLocalEventFromProviderWrite({
  event,
  eventId,
  userId,
}: {
  event: GoogleCalendarProviderEvent;
  eventId: string;
  userId: string;
}) {
  await db
    .update(calendarEvents)
    .set({
      description: event.description,
      etag: event.etag,
      providerUpdatedAt: event.providerUpdatedAt,
      rawPayload: event.rawPayload,
      updatedAt: new Date(),
    })
    .where(and(eq(calendarEvents.id, eventId), eq(calendarEvents.userId, userId)));
}

async function upsertLocalEventFromProviderWrite({
  calendarId,
  connectionId,
  event,
  userId,
}: {
  calendarId: string;
  connectionId: string;
  event: GoogleCalendarProviderEvent;
  userId: string;
}) {
  await db
    .insert(calendarEvents)
    .values({
      calendarId,
      cancelledAt: event.status === "cancelled" ? new Date() : null,
      connectionId,
      description: event.description,
      endAt: event.endAt,
      endDate: event.endDate,
      etag: event.etag,
      htmlLink: event.htmlLink,
      isAllDay: Boolean(event.startDate),
      location: event.location,
      originalStartAt: event.originalStartAt,
      providerUpdatedAt: event.providerUpdatedAt,
      rawPayload: event.rawPayload,
      recurringEventId: event.recurringEventId,
      sourceEventId: event.sourceEventId,
      sourceIcalUid: event.sourceIcalUid,
      startAt: event.startAt,
      startDate: event.startDate,
      status: event.status ?? "confirmed",
      timezone: event.timezone,
      title: event.title?.trim() || "(No title)",
      transparency: event.transparency,
      userId,
      visibility: event.visibility,
    })
    .onConflictDoUpdate({
      target: [
        calendarEvents.userId,
        calendarEvents.calendarId,
        calendarEvents.sourceEventId,
      ],
      set: {
        cancelledAt: event.status === "cancelled" ? new Date() : null,
        description: event.description,
        endAt: event.endAt,
        endDate: event.endDate,
        etag: event.etag,
        htmlLink: event.htmlLink,
        isAllDay: Boolean(event.startDate),
        location: event.location,
        originalStartAt: event.originalStartAt,
        providerUpdatedAt: event.providerUpdatedAt,
        rawPayload: event.rawPayload,
        recurringEventId: event.recurringEventId,
        sourceIcalUid: event.sourceIcalUid,
        startAt: event.startAt,
        startDate: event.startDate,
        status: event.status ?? "confirmed",
        timezone: event.timezone,
        title: event.title?.trim() || "(No title)",
        transparency: event.transparency,
        updatedAt: new Date(),
        visibility: event.visibility,
      },
    });
}

async function getExistingCalendarEventNote({
  eventId,
  userId,
}: {
  eventId: string;
  userId: string;
}) {
  const [note] = await db
    .select({
      body: notes.body,
      id: notes.id,
      noteDate: notes.noteDate,
      title: notes.title,
    })
    .from(calendarEventNoteLinks)
    .innerJoin(notes, eq(notes.id, calendarEventNoteLinks.noteId))
    .where(
      and(
        eq(calendarEventNoteLinks.userId, userId),
        eq(calendarEventNoteLinks.eventId, eventId),
        eq(notes.userId, userId),
      ),
    )
    .limit(1);

  return note ?? null;
}

async function replaceCalendarEventNoteLink({
  event,
  noteId,
  tx,
  userId,
}: {
  event: CalendarEventForLink;
  noteId: string;
  tx: CalendarEventNoteLinkTransaction;
  userId: string;
}) {
  await tx
    .delete(calendarEventNoteLinks)
    .where(
      and(
        eq(calendarEventNoteLinks.userId, userId),
        eq(calendarEventNoteLinks.eventId, event.id),
      ),
    );

  await tx.insert(calendarEventNoteLinks).values({
    calendarId: event.calendarId,
    eventId: event.id,
    noteId,
    recurringEventId: null,
    scope: "event_instance",
    sourceIcalUid: null,
    userId,
  });
}

function getCalendarEventId(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");

  if (!eventId) {
    throw new Error("Missing calendar event target.");
  }

  return eventId;
}

function getCalendarEventCreateForm(formData: FormData): CalendarEventCreateForm {
  return {
    description: String(formData.get("description") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    endTime: String(formData.get("endTime") ?? ""),
    isAllDay: formData.get("isAllDay") === "true",
    location: String(formData.get("location") ?? ""),
    startDate: String(formData.get("startDate") ?? ""),
    startTime: String(formData.get("startTime") ?? ""),
    title: String(formData.get("title") ?? ""),
  };
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
