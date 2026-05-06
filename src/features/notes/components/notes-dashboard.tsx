"use client";

import { Archive, Inbox, NotebookPen, Search, StickyNote } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useDeferredValue, useState } from "react";

import {
  AllMeCard,
  PageGrid,
  PageGridItem,
  PageSection,
} from "@/components/layout/page-scaffold";
import { CaptureCreateForm } from "@/features/notes/components/capture-create-form";
import { CaptureList } from "@/features/notes/components/capture-list";
import type { NotesPageData } from "@/features/notes/queries";
import {
  filterCapturesForQuery,
  filterDailyNotesForQuery,
  getEmptyCaptureLabel,
  normalizeNotesSearch,
} from "@/features/notes/read-model";

type NotesDashboardProps = {
  data: NotesPageData;
};

type NotesFilter = "active" | "all" | "captures" | "completed" | "daily";
type Density = "comfortable" | "compact";

const filterOptions = [
  { label: "All", value: "all" },
  { label: "Captures", value: "captures" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Daily notes", value: "daily" },
] satisfies Array<{ label: string; value: NotesFilter }>;

export function NotesDashboard({ data }: NotesDashboardProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<NotesFilter>("all");
  const [density, setDensity] = useState<Density>("comfortable");
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = normalizeNotesSearch(deferredQuery);

  const activeCaptures = filterCapturesForQuery(
    data.activeCaptures,
    normalizedQuery,
  );
  const completedCaptures = filterCapturesForQuery(
    data.completedCaptures,
    normalizedQuery,
  );
  const dailyNotes = filterDailyNotesForQuery(data.dailyNotes, normalizedQuery);
  const showActive =
    filter === "all" || filter === "captures" || filter === "active";
  const showCompleted =
    filter === "all" || filter === "captures" || filter === "completed";
  const showDaily = filter === "all" || filter === "daily";

  return (
    <div className="grid gap-5">
      <NotesControls
        density={density}
        filter={filter}
        onDensityChange={setDensity}
        onFilterChange={setFilter}
        onQueryChange={setQuery}
        query={query}
      />

      <PageGrid>
        {showActive ? (
          <PageGridItem className="xl:h-[34rem]" span="primary">
            <AllMeCard
              className="flex min-h-0 flex-col overflow-hidden"
              variant="activity"
            >
              <PageSection
                className="grid min-h-0 flex-1 grid-rows-[auto_auto_minmax(0,1fr)]"
                description="Inbox items are quick captures that have not been completed yet."
                eyebrow="Inbox"
                icon={<Inbox aria-hidden="true" className="h-6 w-6" />}
                title="Active captures"
              >
                <div className="border-b border-[var(--line)] pb-4">
                  <CaptureCreateForm />
                </div>
                <div className="min-h-0 overflow-y-auto pr-1">
                  <CaptureList
                    action="complete"
                    captures={activeCaptures}
                    density={density}
                    emptyLabel={getEmptyCaptureLabel({
                      defaultLabel: "No active captures.",
                      query: normalizedQuery,
                    })}
                  />
                </div>
              </PageSection>
            </AllMeCard>
          </PageGridItem>
        ) : null}

        {showDaily ? (
          <PageGridItem className="xl:h-[34rem]" span="support">
            <AllMeCard
              className="flex min-h-0 flex-col overflow-hidden"
              variant="activity"
            >
              <PageSection
                className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)]"
                description="Daily notes still open on Today so date navigation remains centralized."
                eyebrow="Archive"
                icon={<NotebookPen aria-hidden="true" className="h-6 w-6" />}
                title="Daily notes"
              >
                <DailyNotesList
                  density={density}
                  emptyLabel={
                    normalizedQuery
                      ? "No daily notes match this search."
                      : "No daily notes yet."
                  }
                  notes={dailyNotes}
                />
              </PageSection>
            </AllMeCard>
          </PageGridItem>
        ) : null}

        {showCompleted ? (
          <PageGridItem className="xl:h-[30rem]" span="full">
            <AllMeCard
              className="flex min-h-0 flex-col overflow-hidden"
              variant="activity"
            >
              <PageSection
                className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)]"
                description="Completed captures are retained so they can become review material for future Notes and Progress flows."
                eyebrow="Completed"
                icon={<Archive aria-hidden="true" className="h-6 w-6" />}
                title="Recent completed captures"
              >
                <div className="min-h-0 overflow-y-auto pr-1">
                  <CaptureList
                    action="restore"
                    captures={completedCaptures}
                    density={density}
                    emptyLabel={getEmptyCaptureLabel({
                      defaultLabel: "No completed captures yet.",
                      query: normalizedQuery,
                    })}
                  />
                </div>
              </PageSection>
            </AllMeCard>
          </PageGridItem>
        ) : null}
      </PageGrid>
    </div>
  );
}

function NotesControls({
  density,
  filter,
  onDensityChange,
  onFilterChange,
  onQueryChange,
  query,
}: {
  density: Density;
  filter: NotesFilter;
  onDensityChange: (density: Density) => void;
  onFilterChange: (filter: NotesFilter) => void;
  onQueryChange: (query: string) => void;
  query: string;
}) {
  return (
    <AllMeCard className="p-4" variant="status">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <label className="relative block">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
          />
          <input
            className="min-h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--input)] pl-10 pr-3 text-sm outline-none transition focus:border-[var(--accent)]"
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search captures and daily notes..."
            value={query}
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {filterOptions.map((option) => (
            <button
              className={`allme-control inline-flex min-h-9 items-center px-3 text-xs font-semibold ${
                filter === option.value ? "border-[var(--accent)]" : ""
              }`}
              key={option.value}
              onClick={() => onFilterChange(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
          <button
            className="allme-control inline-flex min-h-9 items-center px-3 text-xs font-semibold"
            onClick={() =>
              onDensityChange(
                density === "comfortable" ? "compact" : "comfortable",
              )
            }
            type="button"
          >
            {density === "comfortable" ? "Compact view" : "Comfortable view"}
          </button>
        </div>
      </div>
    </AllMeCard>
  );
}

function DailyNotesList({
  density,
  emptyLabel,
  notes,
}: {
  density: Density;
  emptyLabel: string;
  notes: NotesPageData["dailyNotes"];
}) {
  if (notes.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--empty)] px-4 py-3 text-sm text-[var(--muted)]">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="min-h-0 overflow-y-auto pr-1">
      <div className="grid gap-3">
        {notes.map((note) => {
          const noteHref = note.noteDate
            ? (`/today?date=${note.noteDate}` as Route)
            : ("/today" as Route);

          return (
            <Link
              className={`rounded-xl border border-[var(--line)] bg-[var(--empty)] transition hover:border-[var(--accent)] ${
                density === "compact" ? "p-3" : "p-4"
              }`}
              href={noteHref}
              key={note.id}
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <p className="font-semibold">{note.displayDate}</p>
                {note.isLinkedToCalendarEvent ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">
                    <StickyNote aria-hidden="true" className="h-3 w-3" />
                    {note.linkedCalendarScope === "recurring_series"
                      ? "Calendar series"
                      : "Calendar event"}
                  </span>
                ) : null}
              </div>
              <p
                className={`mt-2 text-sm leading-6 text-[var(--muted)] ${
                  density === "compact" ? "line-clamp-1" : "line-clamp-2"
                }`}
              >
                {note.body || "No note body yet."}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
