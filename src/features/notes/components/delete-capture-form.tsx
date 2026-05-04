"use client";

import { Trash2 } from "lucide-react";

import { deleteCapture } from "@/features/notes/actions";

export function DeleteCaptureForm({ captureId }: { captureId: string }) {
  return (
    <form
      action={deleteCapture}
      onSubmit={(submitEvent) => {
        if (
          !window.confirm(
            "Delete this note? This removes it from Notes and Calendar.",
          )
        ) {
          submitEvent.preventDefault();
        }
      }}
    >
      <input name="captureId" type="hidden" value={captureId} />
      <button
        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--danger)] px-4 text-sm font-semibold text-[var(--danger)] transition hover:bg-[var(--danger)] hover:text-[var(--panel)]"
        type="submit"
      >
        <Trash2 aria-hidden="true" className="h-4 w-4" />
        Delete note
      </button>
    </form>
  );
}
