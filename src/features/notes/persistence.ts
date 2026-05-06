export type CaptureMutationStore = {
  completeCapture(input: {
    captureId: string;
    completedAt: Date;
    userId: string;
  }): Promise<void>;
  createCapture(input: {
    body: string;
    title: string;
    userId: string;
  }): Promise<void>;
  restoreCapture(input: {
    captureId: string;
    restoredAt: Date;
    userId: string;
  }): Promise<void>;
  updateCapture(input: {
    body: string;
    captureId: string;
    savedAt: Date;
    title: string;
    userId: string;
  }): Promise<void>;
};

export class CaptureMutationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CaptureMutationError";
  }
}

export async function createCaptureForUser({
  body,
  store,
  userId,
}: {
  body: string;
  store: CaptureMutationStore;
  userId: string;
}) {
  const trimmedBody = body.trim();

  if (!trimmedBody) {
    return { created: false };
  }

  await store.createCapture({
    body: trimmedBody,
    title: createCaptureTitle(trimmedBody),
    userId,
  });

  return { created: true };
}

export async function updateCaptureForUser({
  body,
  captureId,
  now = new Date(),
  store,
  title,
  userId,
}: {
  body: string;
  captureId: string;
  now?: Date;
  store: CaptureMutationStore;
  title: string;
  userId: string;
}) {
  const normalizedCaptureId = normalizeCaptureId(captureId);
  const normalizedTitle = title.trim();

  if (!normalizedTitle) {
    throw new CaptureMutationError("Add a title before saving.");
  }

  await store.updateCapture({
    body: body.trim(),
    captureId: normalizedCaptureId,
    savedAt: now,
    title: normalizedTitle,
    userId,
  });
}

export async function completeCaptureForUser({
  captureId,
  now = new Date(),
  store,
  userId,
}: {
  captureId: string;
  now?: Date;
  store: CaptureMutationStore;
  userId: string;
}) {
  await store.completeCapture({
    captureId: normalizeCaptureId(captureId),
    completedAt: now,
    userId,
  });
}

export async function restoreCaptureForUser({
  captureId,
  now = new Date(),
  store,
  userId,
}: {
  captureId: string;
  now?: Date;
  store: CaptureMutationStore;
  userId: string;
}) {
  await store.restoreCapture({
    captureId: normalizeCaptureId(captureId),
    restoredAt: now,
    userId,
  });
}

export function createCaptureTitle(body: string) {
  const firstLine = body.split(/\r?\n/)[0]?.trim() ?? "";

  if (!firstLine) {
    return "Quick capture";
  }

  return firstLine.length > 72 ? `${firstLine.slice(0, 69)}...` : firstLine;
}

function normalizeCaptureId(captureId: string) {
  const normalizedCaptureId = captureId.trim();

  if (!normalizedCaptureId) {
    throw new CaptureMutationError("Capture not found.");
  }

  return normalizedCaptureId;
}
