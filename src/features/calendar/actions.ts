"use server";

import { revalidatePath } from "next/cache";

import { syncGoogleCalendarIncremental } from "@/features/calendar/sync/initial-full-sync";

export async function syncGoogleCalendarNow() {
  await syncGoogleCalendarIncremental();

  revalidatePath("/calendar");
  revalidatePath("/settings");
  revalidatePath("/today");
}
