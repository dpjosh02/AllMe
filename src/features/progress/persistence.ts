import { resolveProgressDateKey } from "@/features/progress/date";

export const maxProgressItemTitleLength = 120;

export class ProgressMutationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProgressMutationError";
  }
}

export type ProgressMutationStore = {
  createItem(input: { title: string; userId: string }): Promise<{ id: string }>;
  findActiveItemForUser(input: {
    itemId: string;
    userId: string;
  }): Promise<{ id: string } | null>;
  undoCompletion(input: {
    dateKey: string;
    itemId: string;
    updatedAt: Date;
    userId: string;
  }): Promise<void>;
  upsertCompletion(input: {
    completedAt: Date;
    dateKey: string;
    itemId: string;
    userId: string;
  }): Promise<void>;
};

export function normalizeProgressItemTitle(title: string) {
  return title.trim().replace(/\s+/g, " ").slice(0, maxProgressItemTitleLength);
}

export async function createProgressItemForUser({
  store,
  title,
  userId,
}: {
  store: ProgressMutationStore;
  title: string;
  userId: string;
}) {
  const normalizedTitle = normalizeProgressItemTitle(title);

  if (!normalizedTitle) {
    throw new ProgressMutationError("Enter a progress item.");
  }

  return store.createItem({
    title: normalizedTitle,
    userId,
  });
}

export async function completeProgressItemForUser({
  itemId,
  now = new Date(),
  requestedDateKey,
  store,
  timezone,
  userId,
}: {
  itemId: string;
  now?: Date;
  requestedDateKey?: string | null;
  store: ProgressMutationStore;
  timezone: string;
  userId: string;
}) {
  requireProgressItemId(itemId);
  await requireActiveItemOwnership({ itemId, store, userId });

  const { dateKey } = resolveProgressDateKey({
    now,
    requestedDateKey,
    timezone,
  });

  await store.upsertCompletion({
    completedAt: now,
    dateKey,
    itemId,
    userId,
  });

  return { dateKey };
}

export async function undoProgressItemForUser({
  itemId,
  now = new Date(),
  requestedDateKey,
  store,
  timezone,
  userId,
}: {
  itemId: string;
  now?: Date;
  requestedDateKey?: string | null;
  store: ProgressMutationStore;
  timezone: string;
  userId: string;
}) {
  requireProgressItemId(itemId);
  await requireActiveItemOwnership({ itemId, store, userId });

  const { dateKey } = resolveProgressDateKey({
    now,
    requestedDateKey,
    timezone,
  });

  await store.undoCompletion({
    dateKey,
    itemId,
    updatedAt: now,
    userId,
  });

  return { dateKey };
}

function requireProgressItemId(itemId: string) {
  if (!itemId) {
    throw new ProgressMutationError("Missing progress item id.");
  }
}

async function requireActiveItemOwnership({
  itemId,
  store,
  userId,
}: {
  itemId: string;
  store: ProgressMutationStore;
  userId: string;
}) {
  const item = await store.findActiveItemForUser({ itemId, userId });

  if (!item) {
    throw new ProgressMutationError("Progress item not found.");
  }
}
