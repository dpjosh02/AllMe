"use client";

import { CheckCircle2, RotateCcw } from "lucide-react";
import { useFormStatus } from "react-dom";

import {
  completeProgressItem,
  undoProgressItem,
} from "@/features/progress/actions";

type ProgressActionFormProps = {
  dateKey: string;
  isCompleted: boolean;
  itemId: string;
};

export function ProgressActionForm({
  dateKey,
  isCompleted,
  itemId,
}: ProgressActionFormProps) {
  return (
    <form action={isCompleted ? undoProgressItem : completeProgressItem}>
      <input name="itemId" type="hidden" value={itemId} />
      <input name="dateKey" type="hidden" value={dateKey} />
      <ProgressActionButton isCompleted={isCompleted} />
    </form>
  );
}

function ProgressActionButton({ isCompleted }: { isCompleted: boolean }) {
  const { pending } = useFormStatus();
  const Icon = isCompleted ? RotateCcw : CheckCircle2;

  return (
    <button
      className={`allme-control inline-flex min-h-9 min-w-28 items-center justify-center gap-2 px-3 text-xs font-semibold ${
        isCompleted ? "border-[var(--success)] text-[var(--success)]" : ""
      }`}
      disabled={pending}
      type="submit"
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      {pending ? "Saving..." : isCompleted ? "Undo" : "Complete"}
    </button>
  );
}
