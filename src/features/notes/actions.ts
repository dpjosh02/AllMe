"use server";

import { and, eq, isNull, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireCurrentUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import { notes } from "@/server/db/schema";

export async function completeCapture(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const captureId = getCaptureId(formData);
  const completedAt = new Date();

  await db
    .update(notes)
    .set({
      completedAt,
      updatedAt: completedAt,
    })
    .where(
      and(
        eq(notes.id, captureId),
        eq(notes.userId, currentUser.id),
        isNull(notes.noteDate),
        isNull(notes.completedAt),
      ),
    );

  revalidateCaptureViews();
}

export async function restoreCapture(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const captureId = getCaptureId(formData);

  await db
    .update(notes)
    .set({
      completedAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(notes.id, captureId),
        eq(notes.userId, currentUser.id),
        isNull(notes.noteDate),
        isNotNull(notes.completedAt),
      ),
    );

  revalidateCaptureViews();
}

function getCaptureId(formData: FormData) {
  const captureId = String(formData.get("captureId") ?? "");

  if (!captureId) {
    throw new Error("Missing capture id");
  }

  return captureId;
}

function revalidateCaptureViews() {
  revalidatePath("/");
  revalidatePath("/notes");
  revalidatePath("/today");
}
