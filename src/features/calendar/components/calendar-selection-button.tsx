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
        "relative inline-flex h-5 w-9 items-center rounded-full border transition disabled:cursor-wait disabled:opacity-60",
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
          "h-3.5 w-3.5 rounded-full bg-[var(--foreground)] transition",
          isSelected ? "translate-x-4" : "translate-x-1",
        ].join(" ")}
      />
    </button>
  );
}
