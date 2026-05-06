export type CaptureSearchItem = {
  body: string;
  title: string;
};

export type DailyNoteSearchItem = {
  body: string;
  displayDate: string;
  title: string;
};

export function buildNotesStats({
  activeCaptureCount,
  completedCaptureCount,
  dailyNoteCount,
}: {
  activeCaptureCount: number;
  completedCaptureCount: number;
  dailyNoteCount: number;
}) {
  return {
    activeCaptureCount,
    completedCaptureCount,
    dailyNoteCount,
  };
}

export function filterCapturesForQuery<TCapture extends CaptureSearchItem>(
  captures: TCapture[],
  query: string,
) {
  const normalizedQuery = normalizeNotesSearch(query);

  if (!normalizedQuery) {
    return captures;
  }

  return captures.filter((capture) =>
    normalizeNotesSearch(`${capture.title} ${capture.body}`).includes(
      normalizedQuery,
    ),
  );
}

export function filterDailyNotesForQuery<TNote extends DailyNoteSearchItem>(
  notes: TNote[],
  query: string,
) {
  const normalizedQuery = normalizeNotesSearch(query);

  if (!normalizedQuery) {
    return notes;
  }

  return notes.filter((note) =>
    normalizeNotesSearch(
      `${note.displayDate} ${note.title} ${note.body}`,
    ).includes(normalizedQuery),
  );
}

export function getEmptyCaptureLabel({
  defaultLabel,
  query,
}: {
  defaultLabel: string;
  query: string;
}) {
  return normalizeNotesSearch(query)
    ? "No captures match this search."
    : defaultLabel;
}

export function normalizeNotesSearch(value: string) {
  return value.trim().toLowerCase();
}
