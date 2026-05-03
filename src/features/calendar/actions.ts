"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { syncGoogleCalendarIncremental } from "@/features/calendar/sync/initial-full-sync";
import { requireOwnerUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import {
  calendarCalendars,
  calendarEventAnnotations,
  calendarEvents,
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

function isCalendarEventReviewStatus(
  value: string,
): value is (typeof calendarEventReviewStatuses)[number] {
  return calendarEventReviewStatuses.some((status) => status === value);
}
