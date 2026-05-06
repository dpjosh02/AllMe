export type ProgressPageRow = {
  completedAt: Date | null;
  createdAt: Date;
  itemId: string;
  logId: string | null;
  title: string;
  updatedAt: Date;
};

export type ProgressItemReadModel = {
  completedAt: Date | null;
  createdAt: Date;
  id: string;
  isCompleted: boolean;
  logId: string | null;
  title: string;
  updatedAt: Date;
};

export type ProgressSummary = {
  activeItemCount: number;
  completedCount: number;
  hasItems: boolean;
};

export function buildProgressItems(rows: ProgressPageRow[]) {
  return rows.map((row) => ({
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    id: row.itemId,
    isCompleted: row.completedAt !== null,
    logId: row.logId,
    title: row.title,
    updatedAt: row.updatedAt,
  }));
}

export function buildProgressSummary({
  activeItemCount,
  completedCount,
}: {
  activeItemCount: number;
  completedCount: number;
}): ProgressSummary {
  return {
    activeItemCount,
    completedCount,
    hasItems: activeItemCount > 0,
  };
}
