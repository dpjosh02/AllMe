"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { notesMutationStore } from "@/features/notes/mutations";
import {
  CaptureMutationError,
  completeCaptureForUser,
  createCaptureForUser,
  restoreCaptureForUser,
  updateCaptureForUser,
} from "@/features/notes/persistence";
import { requireCurrentUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import { calendarEventNoteLinks, notes } from "@/server/db/schema";

export type CaptureSaveState = {
  error: string | null;
  savedAt: string | null;
};

export async function createCapture(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const body = String(formData.get("body") ?? "").trim();

  const result = await createCaptureForUser({
    body,
    store: notesMutationStore,
    userId: currentUser.id,
  });

  if (result.created) {
    revalidateCaptureViews();
  }
}

export async function updateCapture(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const captureId = getCaptureId(formData);

  await updateCaptureForUser({
    body: String(formData.get("body") ?? ""),
    captureId,
    store: notesMutationStore,
    title: String(formData.get("title") ?? ""),
    userId: currentUser.id,
  });

  revalidateCaptureViews(captureId);
}

export async function updateCaptureWithState(
  _previousState: CaptureSaveState,
  formData: FormData,
): Promise<CaptureSaveState> {
  try {
    await updateCapture(formData);
  } catch (error) {
    if (error instanceof CaptureMutationError) {
      return {
        error: error.message,
        savedAt: null,
      };
    }

    throw error;
  }

  return {
    error: null,
    savedAt: new Date().toISOString(),
  };
}

export async function completeCapture(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const captureId = getCaptureId(formData);

  await completeCaptureForUser({
    captureId,
    store: notesMutationStore,
    userId: currentUser.id,
  });

  revalidateCaptureViews(captureId);
}

export async function restoreCapture(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const captureId = getCaptureId(formData);

  await restoreCaptureForUser({
    captureId,
    store: notesMutationStore,
    userId: currentUser.id,
  });

  revalidateCaptureViews(captureId);
}

export async function deleteCapture(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const captureId = getCaptureId(formData);

  const [link] = await db
    .select({ noteId: calendarEventNoteLinks.noteId })
    .from(calendarEventNoteLinks)
    .where(
      and(
        eq(calendarEventNoteLinks.noteId, captureId),
        eq(calendarEventNoteLinks.userId, currentUser.id),
      ),
    )
    .limit(1);

  if (!link) {
    throw new Error("Linked calendar note not found");
  }

  await db
    .delete(notes)
    .where(
      and(
        eq(notes.id, captureId),
        eq(notes.userId, currentUser.id),
        isNull(notes.noteDate),
      ),
    );

  revalidateCaptureViews(captureId);
  redirect("/notes");
}

function getCaptureId(formData: FormData) {
  const captureId = String(formData.get("captureId") ?? "");

  if (!captureId) {
    throw new CaptureMutationError("Capture not found.");
  }

  return captureId;
}

function revalidateCaptureViews(captureId?: string) {
  revalidatePath("/");
  revalidatePath("/notes");
  revalidatePath("/today");

  if (captureId) {
    revalidatePath(`/notes/captures/${captureId}`);
  }
}
