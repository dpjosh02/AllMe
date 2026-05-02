"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireCurrentUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import { notes } from "@/server/db/schema";

export type DailyNoteSaveState = {
  savedAt: string | null;
};

export async function updateDailyNote(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const noteId = String(formData.get("noteId") ?? "");
  const body = String(formData.get("body") ?? "");

  if (!noteId) {
    throw new Error("Missing note id");
  }

  await db
    .update(notes)
    .set({
      body,
      updatedAt: new Date(),
    })
    .where(and(eq(notes.id, noteId), eq(notes.userId, currentUser.id)));

  revalidatePath("/");
}

export async function updateDailyNoteWithState(
  _previousState: DailyNoteSaveState,
  formData: FormData,
): Promise<DailyNoteSaveState> {
  await updateDailyNote(formData);

  return {
    savedAt: new Date().toISOString(),
  };
}
