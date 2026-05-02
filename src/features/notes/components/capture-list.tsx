import { CheckCircle2, RotateCcw } from "lucide-react";

import { completeCapture, restoreCapture } from "@/features/notes/actions";

type CaptureListItem = {
  body: string;
  id: string;
  title: string;
};

type CaptureListProps = {
  action: "complete" | "restore";
  captures: CaptureListItem[];
  emptyLabel: string;
};

export function CaptureList({ action, captures, emptyLabel }: CaptureListProps) {
  if (captures.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--empty)] px-4 py-3 text-sm text-[var(--muted)]">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {captures.map((capture) => (
        <article
          className="grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--empty)] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start"
          key={capture.id}
        >
          <div>
            <p className="font-semibold">{capture.title}</p>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted)]">
              {capture.body}
            </p>
          </div>
          <CaptureAction action={action} captureId={capture.id} />
        </article>
      ))}
    </div>
  );
}

function CaptureAction({
  action,
  captureId,
}: {
  action: CaptureListProps["action"];
  captureId: string;
}) {
  const isCompleteAction = action === "complete";

  return (
    <form action={isCompleteAction ? completeCapture : restoreCapture}>
      <input name="captureId" type="hidden" value={captureId} />
      <button
        className="allme-control inline-flex min-h-9 items-center gap-2 px-3 text-xs font-semibold"
        type="submit"
      >
        {isCompleteAction ? (
          <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
        ) : (
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
        )}
        {isCompleteAction ? "Complete" : "Restore"}
      </button>
    </form>
  );
}
