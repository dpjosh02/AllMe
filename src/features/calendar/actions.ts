"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { syncGoogleCalendarIncremental } from "@/features/calendar/sync/initial-full-sync";
import { db } from "@/server/db";
import { calendarCalendars } from "@/server/db/schema";
import { requireOwnerUser } from "@/server/auth/guards";

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
