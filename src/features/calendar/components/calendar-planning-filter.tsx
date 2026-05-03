"use client";

import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedCount = calendars.filter((calendar) => calendar.isSelected).length;
  const holidayCalendarCount = calendars.filter(isHolidayCalendar).length;

  async function applyCalendarVisibility(
    calendarIds: string[],
    isSelected: boolean,
  ) {
    for (const calendarId of calendarIds) {
      const formData = new FormData();

      formData.set("calendarId", calendarId);
      formData.set("isSelected", String(isSelected));
      await updateCalendarSelection(formData);
    }
  }

  function closeMenu() {
    setIsOpen(false);
    setView("root");
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnOutsidePointer(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target)
      ) {
        closeMenu();
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

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
    <div className="relative" ref={menuRef}>
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
                hideAllCalendars={() =>
                  applyCalendarVisibility(
                    calendars
                      .filter((calendar) => calendar.isSelected)
                      .map((calendar) => calendar.id),
                    false,
                  )
                }
                hideHolidayCalendars={() =>
                  applyCalendarVisibility(
                    calendars
                      .filter(
                        (calendar) =>
                          calendar.isSelected && isHolidayCalendar(calendar),
                      )
                      .map((calendar) => calendar.id),
                    false,
                  )
                }
                holidayCalendarCount={holidayCalendarCount}
                selectedCount={selectedCount}
                showCalendars={() => setView("calendars")}
                showAllCalendars={() =>
                  applyCalendarVisibility(
                    calendars
                      .filter((calendar) => !calendar.isSelected)
                      .map((calendar) => calendar.id),
                    true,
                  )
                }
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
  hideAllCalendars,
  hideHolidayCalendars,
  holidayCalendarCount,
  selectedCount,
  showCalendars,
  showAllCalendars,
}: {
  calendarCount: number;
  hideAllCalendars: () => Promise<void>;
  hideHolidayCalendars: () => Promise<void>;
  holidayCalendarCount: number;
  selectedCount: number;
  showCalendars: () => void;
  showAllCalendars: () => Promise<void>;
}) {
  const [pendingQuickAction, setPendingQuickAction] = useState<string | null>(
    null,
  );
  const noVisibleCalendars = selectedCount === 0;
  const allCalendarsVisible = selectedCount === calendarCount;
  const hasHolidayCalendars = holidayCalendarCount > 0;

  async function runQuickAction(
    actionName: string,
    action: () => Promise<void>,
  ) {
    setPendingQuickAction(actionName);

    try {
      await action();
    } finally {
      setPendingQuickAction(null);
    }
  }

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

      <div className="mt-3 grid gap-2">
        <CalendarQuickActionButton
          disabled={allCalendarsVisible || pendingQuickAction !== null}
          isPending={pendingQuickAction === "show-all"}
          label="Show all calendars"
          onClick={() => {
            void runQuickAction("show-all", showAllCalendars);
          }}
        />
        <CalendarQuickActionButton
          disabled={noVisibleCalendars || pendingQuickAction !== null}
          isPending={pendingQuickAction === "hide-all"}
          label="Hide all calendars"
          onClick={() => {
            void runQuickAction("hide-all", hideAllCalendars);
          }}
        />
        <CalendarQuickActionButton
          disabled={
            !hasHolidayCalendars ||
            noVisibleCalendars ||
            pendingQuickAction !== null
          }
          isPending={pendingQuickAction === "hide-holidays"}
          label="Hide holidays"
          onClick={() => {
            void runQuickAction("hide-holidays", hideHolidayCalendars);
          }}
        />
      </div>
    </div>
  );
}

function CalendarQuickActionButton({
  disabled,
  isPending,
  label,
  onClick,
}: {
  disabled: boolean;
  isPending: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-left text-xs font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-45"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {isPending ? "Updating..." : label}
    </button>
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

function isHolidayCalendar(calendar: CalendarFilterSource) {
  return /holiday/i.test(calendar.name);
}
