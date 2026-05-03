"use client";

import { RefreshCw } from "lucide-react";
import { useFormStatus } from "react-dom";

export function SyncGoogleCalendarButton({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button
      className="allme-control inline-flex min-h-10 items-center justify-center gap-2 px-3 text-sm font-semibold text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isDisabled}
      type="submit"
    >
      <RefreshCw
        aria-hidden="true"
        className={`h-4 w-4 ${pending ? "animate-spin" : ""}`}
      />
      {pending ? "Syncing..." : "Sync Calendar"}
    </button>
  );
}
