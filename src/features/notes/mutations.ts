import { and, eq, isNotNull, isNull } from "drizzle-orm";

import type { CaptureMutationStore } from "@/features/notes/persistence";
import { db } from "@/server/db";
import { notes } from "@/server/db/schema";

export const notesMutationStore = {
  async completeCapture({ captureId, completedAt, userId }) {
    await db
      .update(notes)
      .set({
        completedAt,
        updatedAt: completedAt,
      })
      .where(
        and(
          eq(notes.id, captureId),
          eq(notes.userId, userId),
          isNull(notes.noteDate),
          isNull(notes.completedAt),
        ),
      );
  },
  async createCapture({ body, title, userId }) {
    await db.insert(notes).values({
      body,
      title,
      userId,
    });
  },
  async restoreCapture({ captureId, restoredAt, userId }) {
    await db
      .update(notes)
      .set({
        completedAt: null,
        updatedAt: restoredAt,
      })
      .where(
        and(
          eq(notes.id, captureId),
          eq(notes.userId, userId),
          isNull(notes.noteDate),
          isNotNull(notes.completedAt),
        ),
      );
  },
  async updateCapture({ body, captureId, savedAt, title, userId }) {
    await db
      .update(notes)
      .set({
        body,
        title,
        updatedAt: savedAt,
      })
      .where(
        and(
          eq(notes.id, captureId),
          eq(notes.userId, userId),
          isNull(notes.noteDate),
        ),
      );
  },
} satisfies CaptureMutationStore;
