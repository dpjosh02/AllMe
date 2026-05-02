"use server";

import { and, eq, isNull, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireCurrentUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import { notes } from "@/server/db/schema";

export type CaptureSaveState = {
  savedAt: string | null;
};

export async function createCapture(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const body = String(formData.get("body") ?? "").trim();

  if (!body) {
    return;
  }

  await db.insert(notes).values({
    body,
    title: createCaptureTitle(body),
    userId: currentUser.id,
  });

  revalidateCaptureViews();
}

export async function updateCapture(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const captureId = getCaptureId(formData);
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!title) {
    throw new Error("Capture title is required");
  }

  await db
    .update(notes)
    .set({
      body,
      title,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(notes.id, captureId),
        eq(notes.userId, currentUser.id),
        isNull(notes.noteDate),
      ),
    );

  revalidateCaptureViews(captureId);
}

export async function updateCaptureWithState(
  _previousState: CaptureSaveState,
  formData: FormData,
): Promise<CaptureSaveState> {
  await updateCapture(formData);

  return {
    savedAt: new Date().toISOString(),
  };
}

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

  revalidateCaptureViews(captureId);
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

  revalidateCaptureViews(captureId);
}

function getCaptureId(formData: FormData) {
  const captureId = String(formData.get("captureId") ?? "");

  if (!captureId) {
    throw new Error("Missing capture id");
  }

  return captureId;
}

function createCaptureTitle(body: string) {
  const firstLine = body.split(/\r?\n/)[0]?.trim() ?? "";

  if (!firstLine) {
    return "Quick capture";
  }

  return firstLine.length > 72 ? `${firstLine.slice(0, 69)}...` : firstLine;
}

function revalidateCaptureViews(captureId?: string) {
  revalidatePath("/");
  revalidatePath("/notes");
  revalidatePath("/today");

  if (captureId) {
    revalidatePath(`/notes/captures/${captureId}`);
  }
}
