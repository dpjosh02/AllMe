"use client";

import { useFormStatus } from "react-dom";

export function CalendarSelectionButton({
  isSelected,
}: {
  isSelected: boolean;
}) {
  const { pending } = useFormStatus();
  const nextLabel = isSelected ? "Hide" : "Show";

  return (
    <button
      className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-wait disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "Saving" : nextLabel}
    </button>
  );
}
