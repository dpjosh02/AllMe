import { CheckCircle2, Circle } from "lucide-react";

import { ProgressActionForm } from "@/features/progress/components/progress-action-form";
import type { ProgressPageData } from "@/features/progress/queries";

type ProgressItemListProps = {
  dateKey: string;
  items: ProgressPageData["items"];
};

export function ProgressItemList({ dateKey, items }: ProgressItemListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--empty)] px-4 py-5">
        <p className="text-sm font-semibold">No progress items yet.</p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Add one small daily check-in to start.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <ProgressItemRow dateKey={dateKey} item={item} key={item.id} />
      ))}
    </div>
  );
}

function ProgressItemRow({
  dateKey,
  item,
}: {
  dateKey: string;
  item: ProgressPageData["items"][number];
}) {
  const Icon = item.isCompleted ? CheckCircle2 : Circle;

  return (
    <article className="grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--empty)] px-3 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <Icon
          aria-hidden="true"
          className={`mt-0.5 h-5 w-5 shrink-0 ${
            item.isCompleted ? "text-[var(--success)]" : "text-[var(--muted)]"
          }`}
        />
        <div className="min-w-0">
          <p className="truncate font-semibold">{item.title}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {item.isCompleted ? "Completed" : "Not completed"}
          </p>
        </div>
      </div>
      <ProgressActionForm
        dateKey={dateKey}
        isCompleted={item.isCompleted}
        itemId={item.id}
      />
    </article>
  );
}
