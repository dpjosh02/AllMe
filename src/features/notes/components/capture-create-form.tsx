"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";

import { createCapture } from "@/features/notes/actions";

export function CaptureCreateForm() {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      action={async (formData) => {
        await createCapture(formData);
        formRef.current?.reset();
      }}
      className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--empty)] p-4"
      ref={formRef}
    >
      <label className="grid gap-2">
        <span className="allme-kicker">New capture</span>
        <textarea
          aria-label="New capture"
          className="min-h-24 w-full resize-y rounded-xl border border-[var(--line)] bg-[var(--input)] p-3 text-sm leading-6 outline-none transition focus:border-[var(--accent)]"
          name="body"
          placeholder="Capture something for later review..."
        />
      </label>
      <CreateButton />
    </form>
  );
}

function CreateButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--background)] transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      {pending ? "Capturing..." : "Add capture"}
    </button>
  );
}
