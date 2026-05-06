import { and, eq, isNull } from "drizzle-orm";

import type { ProgressMutationStore } from "@/features/progress/persistence";
import { db } from "@/server/db";
import { progressItems, progressLogs } from "@/server/db/schema";

export const progressMutationStore: ProgressMutationStore = {
  async createItem({ title, userId }) {
    const [item] = await db
      .insert(progressItems)
      .values({
        title,
        userId,
      })
      .returning({ id: progressItems.id });

    if (!item) {
      throw new Error("Failed to create progress item.");
    }

    return item;
  },

  async findActiveItemForUser({ itemId, userId }) {
    const [item] = await db
      .select({ id: progressItems.id })
      .from(progressItems)
      .where(
        and(
          eq(progressItems.id, itemId),
          eq(progressItems.userId, userId),
          isNull(progressItems.archivedAt),
        ),
      )
      .limit(1);

    return item ?? null;
  },

  async undoCompletion({ dateKey, itemId, updatedAt, userId }) {
    await db
      .update(progressLogs)
      .set({
        completedAt: null,
        updatedAt,
      })
      .where(
        and(
          eq(progressLogs.userId, userId),
          eq(progressLogs.itemId, itemId),
          eq(progressLogs.logDate, dateKey),
        ),
      );
  },

  async upsertCompletion({ completedAt, dateKey, itemId, userId }) {
    await db
      .insert(progressLogs)
      .values({
        completedAt,
        itemId,
        logDate: dateKey,
        updatedAt: completedAt,
        userId,
      })
      .onConflictDoUpdate({
        target: [
          progressLogs.userId,
          progressLogs.itemId,
          progressLogs.logDate,
        ],
        set: {
          completedAt,
          updatedAt: completedAt,
        },
      });
  },
};
