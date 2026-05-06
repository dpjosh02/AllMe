import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { addDaysToDateKey } from "@/features/today/date";

type ProgressDateControlsProps = {
  dateKey: string;
  isViewingToday: boolean;
  localTodayKey: string;
};

export function ProgressDateControls({
  dateKey,
  isViewingToday,
  localTodayKey,
}: ProgressDateControlsProps) {
  const previousDateKey = addDaysToDateKey(dateKey, -1);
  const nextDateKey = addDaysToDateKey(dateKey, 1);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        className="allme-control inline-flex min-h-9 items-center gap-2 px-3 text-sm font-semibold"
        href={`/progress?date=${previousDateKey}`}
        scroll={false}
      >
        <ChevronLeft aria-hidden="true" className="h-4 w-4" />
        Previous day
      </Link>
      <Link
        className="allme-control inline-flex min-h-9 items-center gap-2 px-3 text-sm font-semibold"
        href={
          nextDateKey === localTodayKey
            ? "/progress"
            : `/progress?date=${nextDateKey}`
        }
        scroll={false}
      >
        Next day
        <ChevronRight aria-hidden="true" className="h-4 w-4" />
      </Link>
      {isViewingToday ? (
        <span
          aria-disabled="true"
          className="allme-control inline-flex min-h-9 cursor-not-allowed items-center px-3 text-sm font-semibold opacity-45"
        >
          Today
        </span>
      ) : (
        <Link
          className="allme-control inline-flex min-h-9 items-center px-3 text-sm font-semibold"
          href="/progress"
          scroll={false}
        >
          Today
        </Link>
      )}
    </div>
  );
}
