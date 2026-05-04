import { describe, expect, it } from "vitest";

import {
  filterCalendarEventsByReviewFocus,
  type CalendarReviewFocus,
} from "@/features/calendar/components/calendar-review-filtering";

describe("calendar review focus filtering", () => {
  it("hides ignored events from the default All focus", () => {
    expect(filterIds("all")).toEqual([
      "needs-prep",
      "done",
      "unreviewed",
      "implicit-unreviewed",
    ]);
  });

  it("filters Needs prep events", () => {
    expect(filterIds("needs_prep")).toEqual(["needs-prep"]);
  });

  it("filters Done events", () => {
    expect(filterIds("done")).toEqual(["done"]);
  });

  it("filters Ignored events when explicitly selected", () => {
    expect(filterIds("ignored")).toEqual(["ignored"]);
  });

  it("treats null local review status as Unreviewed", () => {
    expect(filterIds("none")).toEqual(["unreviewed", "implicit-unreviewed"]);
  });
});

function filterIds(reviewFocus: CalendarReviewFocus) {
  return filterCalendarEventsByReviewFocus(
    [
      { id: "needs-prep", localReviewStatus: "needs_prep" },
      { id: "done", localReviewStatus: "done" },
      { id: "ignored", localReviewStatus: "ignored" },
      { id: "unreviewed", localReviewStatus: "none" },
      { id: "implicit-unreviewed", localReviewStatus: null },
    ],
    reviewFocus,
  ).map((event) => event.id);
}
