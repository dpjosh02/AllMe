"use server";

import { revalidatePath } from "next/cache";

import { syncInitialGoogleCalendarFullSync } from "@/features/calendar/sync/initial-full-sync";

export async function syncGoogleCalendarNow() {
  await syncInitialGoogleCalendarFullSync();

  revalidatePath("/calendar");
  revalidatePath("/settings");
  revalidatePath("/today");
}
