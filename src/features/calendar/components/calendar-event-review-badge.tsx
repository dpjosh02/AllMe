import type { CalendarEventReviewStatus } from "@/features/calendar/components/calendar-event-detail-drawer";

export function CalendarEventReviewBadge({
  status,
}: {
  status: CalendarEventReviewStatus;
}) {
  if (status === "none") {
    return null;
  }

  return (
    <span
      className={[
        "inline-flex shrink-0 rounded-full border px-1.5 py-0.5 text-[0.62rem] font-semibold leading-none",
        getReviewStatusClassName(status),
      ].join(" ")}
    >
      {getReviewStatusLabel(status)}
    </span>
  );
}

function getReviewStatusLabel(status: CalendarEventReviewStatus) {
  switch (status) {
    case "done":
      return "Done";
    case "ignored":
      return "Ignored";
    case "needs_prep":
      return "Prep";
    case "none":
      return "None";
  }
}

function getReviewStatusClassName(status: CalendarEventReviewStatus) {
  switch (status) {
    case "done":
      return "border-[var(--positive)] bg-[var(--positive)]/10 text-[var(--positive)]";
    case "ignored":
      return "border-[var(--line)] bg-[var(--empty)] text-[var(--muted)]";
    case "needs_prep":
      return "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]";
    case "none":
      return "border-[var(--line)] text-[var(--muted)]";
  }
}
