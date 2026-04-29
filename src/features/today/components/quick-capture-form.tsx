"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";

import { createQuickCapture } from "@/features/today/actions";

export function QuickCaptureForm() {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      action={async (formData) => {
        await createQuickCapture(formData);
        formRef.current?.reset();
      }}
      className="grid gap-3"
      ref={formRef}
    >
      <textarea
        aria-label="Quick capture"
        className="min-h-28 w-full resize-y rounded-xl border border-[var(--line)] bg-[var(--input)] p-3 text-sm leading-6 outline-none transition focus:border-[var(--accent)]"
        name="body"
        placeholder="Capture a task, thought, errand, or follow-up..."
      />
      <CaptureButton />
    </form>
  );
}

function CaptureButton() {
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
