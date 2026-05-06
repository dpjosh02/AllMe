"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  type CaptureSaveState,
  updateCaptureWithState,
} from "@/features/notes/actions";

type CaptureDetailFormProps = {
  body: string;
  captureId: string;
  lastSavedLabel: string;
  title: string;
};

const initialState = {
  error: null,
  savedAt: null,
} satisfies CaptureSaveState;

export function CaptureDetailForm({
  body,
  captureId,
  lastSavedLabel,
  title,
}: CaptureDetailFormProps) {
  const [state, formAction] = useActionState(
    updateCaptureWithState,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <input name="captureId" type="hidden" value={captureId} />
      <label className="grid gap-2">
        <span className="allme-kicker">Title</span>
        <input
          aria-describedby={state.error ? "capture-title-error" : undefined}
          aria-invalid={state.error ? "true" : undefined}
          className="min-h-12 rounded-xl border border-[var(--line)] bg-[var(--input)] px-4 text-base font-semibold outline-none transition focus:border-[var(--accent)]"
          defaultValue={title}
          name="title"
          required
        />
        {state.error ? (
          <span
            aria-live="polite"
            className="text-sm font-semibold text-[var(--danger)]"
            id="capture-title-error"
          >
            {state.error}
          </span>
        ) : null}
      </label>
      <label className="grid gap-2">
        <span className="allme-kicker">Capture body</span>
        <textarea
          className="min-h-[18rem] w-full resize-y rounded-xl border border-[var(--line)] bg-[var(--input)] p-4 text-base leading-7 outline-none transition focus:border-[var(--accent)]"
          defaultValue={body}
          name="body"
          placeholder="Add detail, next actions, context, or links..."
        />
      </label>
      <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-4 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-xs text-[var(--muted)]">{lastSavedLabel}</p>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <SaveButton />
          <p
            aria-live="polite"
            className={`text-xs font-semibold text-[var(--success)] ${
              state.savedAt && !state.error
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
      {pending ? "Saving..." : "Save capture"}
    </button>
  );
}
