import { describe, expect, it } from "vitest";

import {
  buildProgressItems,
  buildProgressSummary,
} from "@/features/progress/read-model";

describe("progress read models", () => {
  it("maps completed and undone log rows without counting null completions", () => {
    const completedAt = new Date("2026-05-06T15:00:00.000Z");
    const createdAt = new Date("2026-05-05T15:00:00.000Z");
    const updatedAt = new Date("2026-05-05T16:00:00.000Z");
    const items = buildProgressItems([
      {
        completedAt,
        createdAt,
        itemId: "item-1",
        logId: "log-1",
        title: "Walk",
        updatedAt,
      },
      {
        completedAt: null,
        createdAt,
        itemId: "item-2",
        logId: "log-2",
        title: "Read",
        updatedAt,
      },
    ]);

    expect(items).toMatchObject([
      { id: "item-1", isCompleted: true, title: "Walk" },
      { id: "item-2", isCompleted: false, title: "Read" },
    ]);
    expect(
      buildProgressSummary({
        activeItemCount: items.length,
        completedCount: items.filter((item) => item.isCompleted).length,
      }),
    ).toEqual({
      activeItemCount: 2,
      completedCount: 1,
      hasItems: true,
    });
  });

  it("reports no items as an empty summary", () => {
    expect(
      buildProgressSummary({ activeItemCount: 0, completedCount: 0 }),
    ).toEqual({
      activeItemCount: 0,
      completedCount: 0,
      hasItems: false,
    });
  });
});
