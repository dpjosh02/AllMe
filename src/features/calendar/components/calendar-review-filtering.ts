import type { CalendarEventReviewStatus } from "@/features/calendar/components/calendar-event-detail-drawer";

export type CalendarReviewFocus = CalendarEventReviewStatus | "all";

type CalendarEventCollectionItem = {
  localReviewStatus: CalendarEventReviewStatus | null;
};

export function filterCalendarEventsByReviewFocus<
  T extends CalendarEventCollectionItem,
>(events: T[], reviewFocus: CalendarReviewFocus) {
  if (reviewFocus === "all") {
    return events.filter(
      (event) => (event.localReviewStatus ?? "none") !== "ignored",
    );
  }

  return events.filter(
    (event) => (event.localReviewStatus ?? "none") === reviewFocus,
  );
}
