"use client";

import { Plus } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import {
  createProgressItemWithState,
  type ProgressCreateState,
} from "@/features/progress/actions";

const initialState = {
  error: null,
  savedAt: null,
} satisfies ProgressCreateState;

export function ProgressCreateForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(
    createProgressItemWithState,
    initialState,
  );

  useEffect(() => {
    if (state.savedAt) {
      formRef.current?.reset();
    }
  }, [state.savedAt]);

  return (
    <form
      action={formAction}
      className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--empty)] p-4"
      ref={formRef}
    >
      <label className="grid gap-2">
        <span className="allme-kicker">New item</span>
        <input
          className="min-h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--input)] px-3 text-sm outline-none transition focus:border-[var(--accent)]"
          maxLength={120}
          name="title"
          placeholder="One small check-in..."
        />
      </label>
      <CreateButton />
      <p
        aria-live="polite"
        className={`text-xs font-semibold ${
          state.error ? "text-[var(--danger)]" : "text-[var(--success)]"
        } ${state.error || state.savedAt ? "" : "sr-only"}`}
      >
        {state.error ?? (state.savedAt ? "Added." : "Progress item status")}
      </p>
    </form>
  );
}

function CreateButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--background)] transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      <Plus aria-hidden="true" className="h-4 w-4" />
      {pending ? "Adding..." : "Add item"}
    </button>
  );
}
