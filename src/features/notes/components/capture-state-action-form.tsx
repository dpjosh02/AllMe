"use client";

import { CheckCircle2, RotateCcw } from "lucide-react";
import { useFormStatus } from "react-dom";

import { completeCapture, restoreCapture } from "@/features/notes/actions";

type CaptureStateActionFormProps = {
  captureId: string;
  mode: "complete" | "restore";
  size?: "detail" | "list";
};

export function CaptureStateActionForm({
  captureId,
  mode,
  size = "list",
}: CaptureStateActionFormProps) {
  const isCompleteAction = mode === "complete";

  return (
    <form action={isCompleteAction ? completeCapture : restoreCapture}>
      <input name="captureId" type="hidden" value={captureId} />
      <CaptureStateButton mode={mode} size={size} />
    </form>
  );
}

function CaptureStateButton({
  mode,
  size,
}: {
  mode: CaptureStateActionFormProps["mode"];
  size: NonNullable<CaptureStateActionFormProps["size"]>;
}) {
  const { pending } = useFormStatus();
  const isCompleteAction = mode === "complete";
  const label = getActionLabel({ isCompleteAction, pending, size });

  return (
    <button
      className={`allme-control inline-flex items-center justify-center gap-2 font-semibold disabled:cursor-not-allowed disabled:opacity-70 ${
        size === "detail"
          ? "min-h-10 min-w-36 px-4 text-sm"
          : "min-h-9 min-w-28 px-3 text-xs"
      }`}
      disabled={pending}
      type="submit"
    >
      {isCompleteAction ? (
        <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
      ) : (
        <RotateCcw aria-hidden="true" className="h-4 w-4" />
      )}
      {label}
    </button>
  );
}

function getActionLabel({
  isCompleteAction,
  pending,
  size,
}: {
  isCompleteAction: boolean;
  pending: boolean;
  size: NonNullable<CaptureStateActionFormProps["size"]>;
}) {
  if (pending) {
    return isCompleteAction ? "Completing..." : "Restoring...";
  }

  if (size === "detail") {
    return isCompleteAction ? "Mark complete" : "Restore to inbox";
  }

  return isCompleteAction ? "Complete" : "Restore";
}
