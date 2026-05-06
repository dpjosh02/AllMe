import { describe, expect, it } from "vitest";

import {
  completeProgressItemForUser,
  createProgressItemForUser,
  type ProgressMutationStore,
  undoProgressItemForUser,
} from "@/features/progress/persistence";

describe("progress persistence helpers", () => {
  it("creates trimmed items with the authorized user id", async () => {
    const store = new FakeProgressMutationStore();

    await createProgressItemForUser({
      store,
      title: "  Morning   walk  ",
      userId: "user-1",
    });

    expect(store.items).toEqual([
      {
        archived: false,
        id: "item-1",
        title: "Morning walk",
        userId: "user-1",
      },
    ]);
  });

  it("rejects empty item titles", async () => {
    const store = new FakeProgressMutationStore();

    await expect(
      createProgressItemForUser({
        store,
        title: "   ",
        userId: "user-1",
      }),
    ).rejects.toThrow("Enter a progress item.");

    expect(store.items).toEqual([]);
  });

  it("upserts duplicate completions into one effective log row", async () => {
    const store = new FakeProgressMutationStore();
    store.items.push({
      archived: false,
      id: "item-1",
      title: "Walk",
      userId: "user-1",
    });

    await completeProgressItemForUser({
      itemId: "item-1",
      now: new Date("2026-05-06T15:00:00.000Z"),
      requestedDateKey: "2026-05-06",
      store,
      timezone: "UTC",
      userId: "user-1",
    });
    await completeProgressItemForUser({
      itemId: "item-1",
      now: new Date("2026-05-06T16:00:00.000Z"),
      requestedDateKey: "2026-05-06",
      store,
      timezone: "UTC",
      userId: "user-1",
    });

    expect(store.logs).toHaveLength(1);
    expect(store.logs[0]).toMatchObject({
      dateKey: "2026-05-06",
      itemId: "item-1",
      userId: "user-1",
    });
    expect(store.logs[0]?.completedAt?.toISOString()).toBe(
      "2026-05-06T16:00:00.000Z",
    );
  });

  it("undoes completion without deleting the log row", async () => {
    const store = new FakeProgressMutationStore();
    store.items.push({
      archived: false,
      id: "item-1",
      title: "Walk",
      userId: "user-1",
    });

    await completeProgressItemForUser({
      itemId: "item-1",
      now: new Date("2026-05-06T15:00:00.000Z"),
      requestedDateKey: "2026-05-06",
      store,
      timezone: "UTC",
      userId: "user-1",
    });
    await undoProgressItemForUser({
      itemId: "item-1",
      now: new Date("2026-05-06T16:00:00.000Z"),
      requestedDateKey: "2026-05-06",
      store,
      timezone: "UTC",
      userId: "user-1",
    });

    expect(store.logs).toHaveLength(1);
    expect(store.logs[0]?.completedAt).toBeNull();
  });

  it("rejects wrong-user item access before writing a log", async () => {
    const store = new FakeProgressMutationStore();
    store.items.push({
      archived: false,
      id: "item-1",
      title: "Walk",
      userId: "user-1",
    });

    await expect(
      completeProgressItemForUser({
        itemId: "item-1",
        now: new Date("2026-05-06T15:00:00.000Z"),
        requestedDateKey: "2026-05-06",
        store,
        timezone: "UTC",
        userId: "user-2",
      }),
    ).rejects.toThrow("Progress item not found.");

    expect(store.logs).toEqual([]);
  });

  it("rejects missing item access before writing a log", async () => {
    const store = new FakeProgressMutationStore();

    await expect(
      undoProgressItemForUser({
        itemId: "missing-item",
        now: new Date("2026-05-06T15:00:00.000Z"),
        requestedDateKey: "2026-05-06",
        store,
        timezone: "UTC",
        userId: "user-1",
      }),
    ).rejects.toThrow("Progress item not found.");

    expect(store.logs).toEqual([]);
  });

  it("falls back to local today on invalid completion dates", async () => {
    const store = new FakeProgressMutationStore();
    store.items.push({
      archived: false,
      id: "item-1",
      title: "Walk",
      userId: "user-1",
    });

    await completeProgressItemForUser({
      itemId: "item-1",
      now: new Date("2026-05-06T04:30:00.000Z"),
      requestedDateKey: "not-a-date",
      store,
      timezone: "America/Chicago",
      userId: "user-1",
    });

    expect(store.logs[0]?.dateKey).toBe("2026-05-05");
  });
});

type FakeProgressItem = {
  archived: boolean;
  id: string;
  title: string;
  userId: string;
};

type FakeProgressLog = {
  completedAt: Date | null;
  dateKey: string;
  itemId: string;
  updatedAt: Date;
  userId: string;
};

class FakeProgressMutationStore implements ProgressMutationStore {
  readonly items: FakeProgressItem[] = [];
  readonly logs: FakeProgressLog[] = [];

  async createItem({ title, userId }: { title: string; userId: string }) {
    const item = {
      archived: false,
      id: `item-${this.items.length + 1}`,
      title,
      userId,
    };
    this.items.push(item);

    return { id: item.id };
  }

  async findActiveItemForUser({
    itemId,
    userId,
  }: {
    itemId: string;
    userId: string;
  }) {
    const item = this.items.find(
      (candidate) =>
        candidate.id === itemId &&
        candidate.userId === userId &&
        !candidate.archived,
    );

    return item ? { id: item.id } : null;
  }

  async undoCompletion({
    dateKey,
    itemId,
    updatedAt,
    userId,
  }: {
    dateKey: string;
    itemId: string;
    updatedAt: Date;
    userId: string;
  }) {
    const log = this.findLog({ dateKey, itemId, userId });

    if (log) {
      log.completedAt = null;
      log.updatedAt = updatedAt;
    }
  }

  async upsertCompletion({
    completedAt,
    dateKey,
    itemId,
    userId,
  }: {
    completedAt: Date;
    dateKey: string;
    itemId: string;
    userId: string;
  }) {
    const log = this.findLog({ dateKey, itemId, userId });

    if (log) {
      log.completedAt = completedAt;
      log.updatedAt = completedAt;
      return;
    }

    this.logs.push({
      completedAt,
      dateKey,
      itemId,
      updatedAt: completedAt,
      userId,
    });
  }

  private findLog({
    dateKey,
    itemId,
    userId,
  }: {
    dateKey: string;
    itemId: string;
    userId: string;
  }) {
    return this.logs.find(
      (log) =>
        log.dateKey === dateKey &&
        log.itemId === itemId &&
        log.userId === userId,
    );
  }
}
