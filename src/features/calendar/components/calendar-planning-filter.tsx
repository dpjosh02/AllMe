"use client";

import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { CalendarSelectionButton } from "@/features/calendar/components/calendar-selection-button";

type CalendarFilterSource = {
  color: string | null;
  id: string;
  isSelected: boolean;
  name: string;
};

type FilterView = "root" | "calendars";

export function CalendarPlanningFilter({
  calendars,
  updateCalendarSelection,
}: {
  calendars: CalendarFilterSource[];
  updateCalendarSelection: (formData: FormData) => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<FilterView>("root");
  const selectedCount = calendars.filter((calendar) => calendar.isSelected).length;

  function toggleOpen() {
    setIsOpen((current) => {
      const next = !current;

      if (!next) {
        setView("root");
      }

      return next;
    });
  }

  return (
    <div className="relative">
      <button
        aria-expanded={isOpen}
        aria-label="Open Calendar filters"
        className="allme-control inline-flex h-10 w-10 items-center justify-center p-0"
        onClick={toggleOpen}
        type="button"
      >
        <SlidersHorizontal aria-hidden="true" className="h-5 w-5" />
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-12 z-30 w-[min(20rem,calc(100vw-3rem))]">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-strong)] p-3 shadow-2xl">
            {view === "root" ? (
              <RootFilterView
                calendarCount={calendars.length}
                selectedCount={selectedCount}
                showCalendars={() => setView("calendars")}
              />
            ) : (
              <CalendarFilterView
                calendars={calendars}
                selectedCount={selectedCount}
                updateCalendarSelection={updateCalendarSelection}
                viewRoot={() => setView("root")}
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RootFilterView({
  calendarCount,
  selectedCount,
  showCalendars,
}: {
  calendarCount: number;
  selectedCount: number;
  showCalendars: () => void;
}) {
  return (
    <div>
      <div className="mb-3">
        <p className="allme-kicker">Filters</p>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
          Choose which local calendars appear in the planning view.
        </p>
      </div>

      <button
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--empty)] px-3 py-2 text-left transition hover:border-[var(--accent)]"
        onClick={showCalendars}
        type="button"
      >
        <span>
          <span className="block text-sm font-semibold text-[var(--foreground)]">
            Calendars
          </span>
          <span className="text-xs text-[var(--muted)]">
            {selectedCount}/{calendarCount} visible
          </span>
        </span>
        <ChevronRight
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-[var(--accent)]"
        />
      </button>
    </div>
  );
}

function CalendarFilterView({
  calendars,
  selectedCount,
  updateCalendarSelection,
  viewRoot,
}: {
  calendars: CalendarFilterSource[];
  selectedCount: number;
  updateCalendarSelection: (formData: FormData) => Promise<void>;
  viewRoot: () => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          aria-label="Back to filters"
          className="allme-control inline-flex h-8 w-8 items-center justify-center p-0"
          onClick={viewRoot}
          type="button"
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="allme-kicker">Calendars</p>
          <p className="truncate text-xs text-[var(--muted)]">
            {selectedCount}/{calendars.length} visible
          </p>
        </div>
      </div>

      {calendars.length > 0 ? (
        <div className="max-h-64 overflow-y-auto pr-1">
          <div className="grid gap-1.5">
            {calendars.map((calendar) => (
              <CompactCalendarRow
                calendar={calendar}
                key={calendar.id}
                updateCalendarSelection={updateCalendarSelection}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--empty)] px-3 py-2 text-sm text-[var(--muted)]">
          No calendars synced yet.
        </p>
      )}
    </div>
  );
}

function CompactCalendarRow({
  calendar,
  updateCalendarSelection,
}: {
  calendar: CalendarFilterSource;
  updateCalendarSelection: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--empty)] px-2.5 py-1.5">
      <div className="min-w-0 flex items-center gap-2">
        <span
          aria-hidden="true"
          className={[
            "h-2.5 w-2.5 shrink-0 rounded-full border border-[var(--line)]",
            calendar.isSelected ? "" : "opacity-40",
          ].join(" ")}
          style={{ backgroundColor: calendar.color ?? "var(--accent)" }}
        />
        <p
          className={[
            "truncate text-sm font-semibold",
            calendar.isSelected
              ? "text-[var(--foreground)]"
              : "text-[var(--muted)]",
          ].join(" ")}
        >
          {calendar.name}
        </p>
      </div>

      <form action={updateCalendarSelection} className="shrink-0">
        <input name="calendarId" type="hidden" value={calendar.id} />
        <input
          name="isSelected"
          type="hidden"
          value={calendar.isSelected ? "false" : "true"}
        />
        <CalendarSelectionButton isSelected={calendar.isSelected} />
      </form>
    </div>
  );
}
