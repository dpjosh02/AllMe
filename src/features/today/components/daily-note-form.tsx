"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  type DailyNoteSaveState,
  updateDailyNoteWithState,
} from "@/features/today/actions";

type DailyNoteFormProps = {
  body: string;
  lastSavedLabel: string;
  noteId: string;
};

const initialState = {
  savedAt: null,
} satisfies DailyNoteSaveState;

export function DailyNoteForm({
  body,
  lastSavedLabel,
  noteId,
}: DailyNoteFormProps) {
  const [state, formAction] = useActionState(
    updateDailyNoteWithState,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <input name="noteId" type="hidden" value={noteId} />
      <textarea
        aria-label="Daily note body"
        className="min-h-[24rem] w-full resize-y rounded-xl border border-[var(--line)] bg-[var(--input)] p-4 text-base leading-7 outline-none transition focus:border-[var(--accent)]"
        name="body"
        placeholder="What matters today?"
        defaultValue={body}
      />
      <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-4 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-xs text-[var(--muted)]">{lastSavedLabel}</p>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <SaveButton />
          <p
            aria-live="polite"
            className={`text-xs font-semibold text-[var(--success)] ${
              state.savedAt
                ? "animate-[allme-saved-fade_2.2s_ease-out_forwards]"
                : "opacity-0"
            }`}
            key={state.savedAt ?? "not-saved"}
          >
            Saved!
          </p>
        </div>
      </div>
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--background)] transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      {pending ? "Saving..." : "Save daily note"}
    </button>
  );
}
