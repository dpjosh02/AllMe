import { CheckCircle2 } from "lucide-react";

import { completeCapture } from "@/features/notes/actions";

type QuickCapture = {
  body: string;
  id: string;
  title: string;
};

type QuickCaptureListProps = {
  captures: QuickCapture[];
};

export function QuickCaptureList({ captures }: QuickCaptureListProps) {
  if (captures.length === 0) {
    return (
      <p className="mt-4 rounded-xl border border-dashed border-[var(--line)] bg-[var(--empty)] px-3 py-2 text-sm text-[var(--muted)]">
        No active captures.
      </p>
    );
  }

  return (
    <div className="mt-4 grid gap-2 border-t border-[var(--line)] pt-4">
      {captures.map((capture) => (
        <article
          className="grid gap-3 rounded-xl bg-[var(--empty)] px-3 py-3 text-sm sm:grid-cols-[1fr_auto] sm:items-start"
          key={capture.id}
        >
          <div>
            <p className="font-semibold">{capture.title}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted)]">
              {capture.body}
            </p>
          </div>
          <form action={completeCapture}>
            <input name="captureId" type="hidden" value={capture.id} />
            <button
              className="allme-control inline-flex min-h-9 items-center gap-2 px-3 text-xs font-semibold"
              type="submit"
            >
              <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
              Complete
            </button>
          </form>
        </article>
      ))}
    </div>
  );
}
