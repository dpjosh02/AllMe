"use client";

import { useFormStatus } from "react-dom";

export function CalendarSelectionButton({
  isSelected,
}: {
  isSelected: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-pressed={isSelected}
      className={[
        "relative inline-flex h-6 w-11 items-center rounded-full border transition disabled:cursor-wait disabled:opacity-60",
        isSelected
          ? "border-[var(--positive)] bg-[var(--positive)]/20"
          : "border-[var(--line)] bg-[var(--empty)]",
      ].join(" ")}
      disabled={pending}
      type="submit"
    >
      <span className="sr-only">
        {pending
          ? "Saving calendar visibility"
          : isSelected
            ? "Hide calendar"
            : "Show calendar"}
      </span>
      <span
        aria-hidden="true"
        className={[
          "h-4 w-4 rounded-full bg-[var(--foreground)] transition",
          isSelected ? "translate-x-5" : "translate-x-1",
        ].join(" ")}
      />
    </button>
  );
}
