import { describe, expect, it } from "vitest";

import {
  buildNotesStats,
  filterCapturesForQuery,
  filterDailyNotesForQuery,
  getEmptyCaptureLabel,
} from "@/features/notes/read-model";

describe("notes read models", () => {
  it("builds the Notes summary from active, completed, and daily note counts", () => {
    expect(
      buildNotesStats({
        activeCaptureCount: 2,
        completedCaptureCount: 1,
        dailyNoteCount: 3,
      }),
    ).toEqual({
      activeCaptureCount: 2,
      completedCaptureCount: 1,
      dailyNoteCount: 3,
    });
  });

  it("filters active and completed captures by title or body", () => {
    const captures = [
      { body: "Renew car registration", title: "Errand" },
      { body: "Prep agenda", title: "Sam follow-up" },
    ];

    expect(filterCapturesForQuery(captures, "sam")).toEqual([captures[1]]);
    expect(filterCapturesForQuery(captures, " REGISTRATION ")).toEqual([
      captures[0],
    ]);
  });

  it("filters daily notes by display date, title, or body", () => {
    const notes = [
      {
        body: "Plan admin follow-through",
        displayDate: "Wednesday, May 6, 2026",
        title: "Daily note",
      },
      {
        body: "Workout notes",
        displayDate: "Thursday, May 7, 2026",
        title: "Daily note",
      },
    ];

    expect(filterDailyNotesForQuery(notes, "may 7")).toEqual([notes[1]]);
    expect(filterDailyNotesForQuery(notes, "admin")).toEqual([notes[0]]);
  });

  it("uses consistent empty labels for default and search-filtered captures", () => {
    expect(
      getEmptyCaptureLabel({
        defaultLabel: "No active captures.",
        query: "",
      }),
    ).toBe("No active captures.");
    expect(
      getEmptyCaptureLabel({
        defaultLabel: "No completed captures yet.",
        query: "anything",
      }),
    ).toBe("No captures match this search.");
  });
});
