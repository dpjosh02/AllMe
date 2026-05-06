"use server";

import { revalidatePath } from "next/cache";

import { progressMutationStore } from "@/features/progress/mutations";
import {
  completeProgressItemForUser,
  createProgressItemForUser,
  undoProgressItemForUser,
} from "@/features/progress/persistence";
import { getProgressUserTimezone } from "@/features/progress/queries";
import { requireCurrentUser } from "@/server/auth/guards";

export async function createProgressItem(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const title = String(formData.get("title") ?? "");

  await createProgressItemForUser({
    store: progressMutationStore,
    title,
    userId: currentUser.id,
  });

  revalidateProgressViews();
}

export async function completeProgressItem(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const itemId = String(formData.get("itemId") ?? "");
  const requestedDateKey = String(formData.get("dateKey") ?? "");
  const timezone = await getProgressUserTimezone(currentUser.id);

  await completeProgressItemForUser({
    itemId,
    requestedDateKey,
    store: progressMutationStore,
    timezone,
    userId: currentUser.id,
  });

  revalidateProgressViews();
}

export async function undoProgressItem(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const itemId = String(formData.get("itemId") ?? "");
  const requestedDateKey = String(formData.get("dateKey") ?? "");
  const timezone = await getProgressUserTimezone(currentUser.id);

  await undoProgressItemForUser({
    itemId,
    requestedDateKey,
    store: progressMutationStore,
    timezone,
    userId: currentUser.id,
  });

  revalidateProgressViews();
}

function revalidateProgressViews() {
  revalidatePath("/");
  revalidatePath("/progress");
  revalidatePath("/today");
}
