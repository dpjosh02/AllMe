"use client";

import { RefreshCw } from "lucide-react";
import { useFormStatus } from "react-dom";

export function SyncFintableButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--line)] bg-[var(--input)] px-3 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] disabled:cursor-wait disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      <RefreshCw
        aria-hidden="true"
        className={`h-4 w-4 ${pending ? "animate-spin" : ""}`}
      />
      {pending ? "Syncing..." : "Sync Fintable"}
    </button>
  );
}
