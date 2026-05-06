import { and, asc, eq, isNotNull, isNull, sql } from "drizzle-orm";

import { resolveProgressDateKey } from "@/features/progress/date";
import {
  buildProgressItems,
  buildProgressSummary,
} from "@/features/progress/read-model";
import { formatDisplayDate } from "@/features/today/date";
import { db } from "@/server/db";
import { progressItems, progressLogs, userSettings } from "@/server/db/schema";

export type ProgressPageData = Awaited<ReturnType<typeof getProgressPageData>>;
export type TodayProgressSummary = Awaited<
  ReturnType<typeof getTodayProgressSummary>
>;

const defaultTimezone = "America/Chicago";

export async function getProgressPageData({
  requestedDateKey,
  userId,
}: {
  requestedDateKey?: string;
  userId: string;
}) {
  const timezone = await getProgressUserTimezone(userId);
  const { dateKey, localTodayKey } = resolveProgressDateKey({
    requestedDateKey,
    timezone,
  });
  const itemRows = await getProgressPageRows({ dateKey, userId });
  const items = buildProgressItems(itemRows);

  return {
    dateKey,
    displayDate: formatDisplayDate(dateKey),
    isViewingToday: dateKey === localTodayKey,
    items,
    localTodayKey,
    summary: buildProgressSummary({
      activeItemCount: items.length,
      completedCount: items.filter((item) => item.isCompleted).length,
    }),
    timezone,
  };
}

export async function getTodayProgressSummary({
  dateKey,
  userId,
}: {
  dateKey: string;
  userId: string;
}) {
  const activeItemCount = await getActiveProgressItemCount(userId);
  const completedCount = await getCompletedProgressLogCount({
    dateKey,
    userId,
  });

  return buildProgressSummary({
    activeItemCount,
    completedCount,
  });
}

export async function getProgressUserTimezone(userId: string) {
  await db.insert(userSettings).values({ userId }).onConflictDoNothing();

  const [settings] = await db
    .select({ timezone: userSettings.timezone })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  return settings?.timezone ?? defaultTimezone;
}

async function getProgressPageRows({
  dateKey,
  userId,
}: {
  dateKey: string;
  userId: string;
}) {
  return db
    .select({
      completedAt: progressLogs.completedAt,
      createdAt: progressItems.createdAt,
      itemId: progressItems.id,
      logId: progressLogs.id,
      title: progressItems.title,
      updatedAt: progressItems.updatedAt,
    })
    .from(progressItems)
    .leftJoin(
      progressLogs,
      and(
        eq(progressLogs.userId, userId),
        eq(progressLogs.itemId, progressItems.id),
        eq(progressLogs.logDate, dateKey),
      ),
    )
    .where(
      and(eq(progressItems.userId, userId), isNull(progressItems.archivedAt)),
    )
    .orderBy(asc(progressItems.createdAt));
}

async function getActiveProgressItemCount(userId: string) {
  const [summary] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(progressItems)
    .where(
      and(eq(progressItems.userId, userId), isNull(progressItems.archivedAt)),
    );

  return summary?.count ?? 0;
}

async function getCompletedProgressLogCount({
  dateKey,
  userId,
}: {
  dateKey: string;
  userId: string;
}) {
  const [summary] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(progressLogs)
    .innerJoin(
      progressItems,
      and(
        eq(progressItems.id, progressLogs.itemId),
        eq(progressItems.userId, userId),
        isNull(progressItems.archivedAt),
      ),
    )
    .where(
      and(
        eq(progressLogs.userId, userId),
        eq(progressLogs.logDate, dateKey),
        isNotNull(progressLogs.completedAt),
      ),
    );

  return summary?.count ?? 0;
}
