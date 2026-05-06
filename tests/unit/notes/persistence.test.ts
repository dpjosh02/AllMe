import { describe, expect, it } from "vitest";

import {
  CaptureMutationError,
  type CaptureMutationStore,
  completeCaptureForUser,
  createCaptureForUser,
  createCaptureTitle,
  restoreCaptureForUser,
  updateCaptureForUser,
} from "@/features/notes/persistence";

describe("notes capture persistence helpers", () => {
  it("creates trimmed quick captures with a title from the first body line", async () => {
    const store = new FakeCaptureMutationStore();

    await createCaptureForUser({
      body: "  Follow up with Sam\nAdd agenda context  ",
      store,
      userId: "user-1",
    });

    expect(store.captures).toEqual([
      {
        body: "Follow up with Sam\nAdd agenda context",
        completedAt: null,
        id: "capture-1",
        noteDate: null,
        title: "Follow up with Sam",
        updatedAt: null,
        userId: "user-1",
      },
    ]);
  });

  it("ignores blank quick captures", async () => {
    const store = new FakeCaptureMutationStore();

    await expect(
      createCaptureForUser({
        body: "   ",
        store,
        userId: "user-1",
      }),
    ).resolves.toEqual({ created: false });

    expect(store.captures).toEqual([]);
  });

  it("updates capture title and body for the authorized user", async () => {
    const store = new FakeCaptureMutationStore([
      captureFixture({ id: "capture-1", userId: "user-1" }),
    ]);
    const savedAt = new Date("2026-05-06T15:00:00.000Z");

    await updateCaptureForUser({
      body: "  Add detail  ",
      captureId: "capture-1",
      now: savedAt,
      store,
      title: "  Refined title  ",
      userId: "user-1",
    });

    expect(store.captures[0]).toMatchObject({
      body: "Add detail",
      title: "Refined title",
      updatedAt: savedAt,
    });
  });

  it("returns a user-safe validation error for empty titles", async () => {
    const store = new FakeCaptureMutationStore([
      captureFixture({ id: "capture-1", userId: "user-1" }),
    ]);

    await expect(
      updateCaptureForUser({
        body: "Body",
        captureId: "capture-1",
        store,
        title: "   ",
        userId: "user-1",
      }),
    ).rejects.toThrow(new CaptureMutationError("Add a title before saving."));

    expect(store.captures[0]?.title).toBe("Original title");
  });

  it("completes and restores only undated captures owned by the user", async () => {
    const completedAt = new Date("2026-05-06T15:00:00.000Z");
    const restoredAt = new Date("2026-05-06T16:00:00.000Z");
    const store = new FakeCaptureMutationStore([
      captureFixture({ id: "capture-1", userId: "user-1" }),
      captureFixture({ id: "capture-2", userId: "user-2" }),
      captureFixture({
        id: "daily-note",
        noteDate: "2026-05-06",
        userId: "user-1",
      }),
    ]);

    await completeCaptureForUser({
      captureId: "capture-1",
      now: completedAt,
      store,
      userId: "user-1",
    });
    await completeCaptureForUser({
      captureId: "capture-2",
      now: completedAt,
      store,
      userId: "user-1",
    });
    await completeCaptureForUser({
      captureId: "daily-note",
      now: completedAt,
      store,
      userId: "user-1",
    });

    expect(store.captures).toMatchObject([
      { completedAt, id: "capture-1", updatedAt: completedAt },
      { completedAt: null, id: "capture-2", updatedAt: null },
      { completedAt: null, id: "daily-note", updatedAt: null },
    ]);

    await restoreCaptureForUser({
      captureId: "capture-1",
      now: restoredAt,
      store,
      userId: "user-1",
    });

    expect(store.captures[0]).toMatchObject({
      completedAt: null,
      id: "capture-1",
      updatedAt: restoredAt,
    });
  });

  it("keeps generated capture titles bounded for list rows", () => {
    expect(createCaptureTitle("x".repeat(90))).toHaveLength(72);
    expect(createCaptureTitle("\n\n")).toBe("Quick capture");
  });
});

type FakeCapture = {
  body: string;
  completedAt: Date | null;
  id: string;
  noteDate: string | null;
  title: string;
  updatedAt: Date | null;
  userId: string;
};

class FakeCaptureMutationStore implements CaptureMutationStore {
  readonly captures: FakeCapture[];

  constructor(captures: FakeCapture[] = []) {
    this.captures = captures;
  }

  async completeCapture({
    captureId,
    completedAt,
    userId,
  }: {
    captureId: string;
    completedAt: Date;
    userId: string;
  }) {
    const capture = this.findActiveCapture({ captureId, userId });

    if (!capture) {
      return;
    }

    capture.completedAt = completedAt;
    capture.updatedAt = completedAt;
  }

  async createCapture({
    body,
    title,
    userId,
  }: {
    body: string;
    title: string;
    userId: string;
  }) {
    this.captures.push({
      body,
      completedAt: null,
      id: `capture-${this.captures.length + 1}`,
      noteDate: null,
      title,
      updatedAt: null,
      userId,
    });
  }

  async restoreCapture({
    captureId,
    restoredAt,
    userId,
  }: {
    captureId: string;
    restoredAt: Date;
    userId: string;
  }) {
    const capture = this.findCompletedCapture({ captureId, userId });

    if (!capture) {
      return;
    }

    capture.completedAt = null;
    capture.updatedAt = restoredAt;
  }

  async updateCapture({
    body,
    captureId,
    savedAt,
    title,
    userId,
  }: {
    body: string;
    captureId: string;
    savedAt: Date;
    title: string;
    userId: string;
  }) {
    const capture = this.captures.find(
      (candidate) =>
        candidate.id === captureId &&
        candidate.userId === userId &&
        candidate.noteDate === null,
    );

    if (!capture) {
      return;
    }

    capture.body = body;
    capture.title = title;
    capture.updatedAt = savedAt;
  }

  private findActiveCapture({
    captureId,
    userId,
  }: {
    captureId: string;
    userId: string;
  }) {
    return this.captures.find(
      (capture) =>
        capture.id === captureId &&
        capture.userId === userId &&
        capture.noteDate === null &&
        capture.completedAt === null,
    );
  }

  private findCompletedCapture({
    captureId,
    userId,
  }: {
    captureId: string;
    userId: string;
  }) {
    return this.captures.find(
      (capture) =>
        capture.id === captureId &&
        capture.userId === userId &&
        capture.noteDate === null &&
        capture.completedAt !== null,
    );
  }
}

function captureFixture(overrides: Partial<FakeCapture> = {}): FakeCapture {
  return {
    body: "Original body",
    completedAt: null,
    id: "capture-1",
    noteDate: null,
    title: "Original title",
    updatedAt: null,
    userId: "user-1",
    ...overrides,
  };
}
