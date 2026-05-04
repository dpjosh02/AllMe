"use client";

import { StickyNote, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import type {
  CalendarLinkedNoteMutationResult,
  CalendarProviderWriteMutationResult,
} from "@/features/calendar/actions";

const publishWarningPreferenceKey =
  "allme.calendar.publish_note_description_warning_dismissed";

export type CalendarEventReviewStatus =
  | "done"
  | "ignored"
  | "needs_prep"
  | "none";

export type CalendarEventDetail = {
  calendarColor: string | null;
  calendarName: string;
  description: string | null;
  endDate: string | null;
  endsAt: Date | null;
  htmlLink: string | null;
  id: string;
  isAllDay: boolean;
  linkedNoteBody: string | null;
  linkedNoteDate: string | null;
  linkedNoteHref: string | null;
  linkedNoteId: string | null;
  linkedNoteScope: "event_instance" | "recurring_series" | null;
  linkedNoteTitle: string | null;
  location: string | null;
  localReviewStatus: CalendarEventReviewStatus;
  recurringEventId: string | null;
  sourceIcalUid: string | null;
  startDate: string | null;
  startsAt: Date | null;
  status: string;
  title: string;
};

export function CalendarEventDetailDrawer({
  createLinkedNoteFromEvent,
  deleteLinkedNote,
  event,
  onClose,
  onReviewStatusChange,
  publishLinkedNoteToGoogle,
  updateGoogleCalendarEvent,
  updateLinkedNote,
  updateEventReviewStatus,
}: {
  createLinkedNoteFromEvent: (
    formData: FormData,
  ) => Promise<CalendarLinkedNoteMutationResult>;
  event: CalendarEventDetail | null;
  onClose: () => void;
  onReviewStatusChange?: (
    eventId: string,
    reviewStatus: CalendarEventReviewStatus,
  ) => void;
  deleteLinkedNote: (formData: FormData) => Promise<void>;
  publishLinkedNoteToGoogle: (
    formData: FormData,
  ) => Promise<CalendarProviderWriteMutationResult>;
  updateGoogleCalendarEvent: (
    formData: FormData,
  ) => Promise<CalendarProviderWriteMutationResult>;
  updateLinkedNote: (
    formData: FormData,
  ) => Promise<CalendarLinkedNoteMutationResult>;
  updateEventReviewStatus: (formData: FormData) => Promise<void>;
}) {
  if (!event) {
    return null;
  }

  return (
    <CalendarEventDetailDrawerContent
      createLinkedNoteFromEvent={createLinkedNoteFromEvent}
      deleteLinkedNote={deleteLinkedNote}
      event={event}
      key={event.id}
      onClose={onClose}
      onReviewStatusChange={onReviewStatusChange}
      publishLinkedNoteToGoogle={publishLinkedNoteToGoogle}
      updateGoogleCalendarEvent={updateGoogleCalendarEvent}
      updateLinkedNote={updateLinkedNote}
      updateEventReviewStatus={updateEventReviewStatus}
    />
  );
}

function CalendarEventDetailDrawerContent({
  createLinkedNoteFromEvent,
  deleteLinkedNote,
  event,
  onClose,
  onReviewStatusChange,
  publishLinkedNoteToGoogle,
  updateGoogleCalendarEvent,
  updateLinkedNote,
  updateEventReviewStatus,
}: {
  createLinkedNoteFromEvent: (
    formData: FormData,
  ) => Promise<CalendarLinkedNoteMutationResult>;
  event: CalendarEventDetail;
  onClose: () => void;
  onReviewStatusChange?: (
    eventId: string,
    reviewStatus: CalendarEventReviewStatus,
  ) => void;
  deleteLinkedNote: (formData: FormData) => Promise<void>;
  publishLinkedNoteToGoogle: (
    formData: FormData,
  ) => Promise<CalendarProviderWriteMutationResult>;
  updateGoogleCalendarEvent: (
    formData: FormData,
  ) => Promise<CalendarProviderWriteMutationResult>;
  updateLinkedNote: (
    formData: FormData,
  ) => Promise<CalendarLinkedNoteMutationResult>;
  updateEventReviewStatus: (formData: FormData) => Promise<void>;
}) {
  const [currentReviewStatus, setCurrentReviewStatus] =
    useState<CalendarEventReviewStatus>(event.localReviewStatus);
  const [linkedNote, setLinkedNote] = useState<CalendarLinkedNoteState | null>(
    getLinkedNoteState(event),
  );

  useEffect(() => {
    function closeOnEscape(keyboardEvent: KeyboardEvent) {
      if (keyboardEvent.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", closeOnEscape);

    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const timeLabel = getEventTimeLabel(event);
  const todayDateKey = getEventTodayDateKey(event);
  const todayHref = todayDateKey
    ? { pathname: "/today", query: { date: todayDateKey } }
    : null;

  async function saveEventReviewStatus(formData: FormData) {
    await updateEventReviewStatus(formData);
    const nextReviewStatus = parseReviewStatus(formData);

    setCurrentReviewStatus(nextReviewStatus);
    onReviewStatusChange?.(event.id, nextReviewStatus);
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-end bg-black/35 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
    >
      <button
        aria-label="Close event details"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <section className="relative flex max-h-[calc(100vh-3rem)] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--panel-strong)] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] p-5">
          <div className="min-w-0">
            <p className="allme-kicker">Event details</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
              {event.title}
            </h2>
          </div>
          <button
            aria-label="Close event details"
            className="allme-control inline-flex h-10 w-10 shrink-0 items-center justify-center p-0"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto p-5">
          <div className="grid gap-3">
            <EventDetailRow label="When" value={timeLabel} />
            <EventDetailRow
              label="Calendar"
              value={
                <span className="inline-flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0 rounded-full border border-[var(--line)]"
                    style={{
                      backgroundColor: event.calendarColor ?? "var(--accent)",
                    }}
                  />
                  <span className="truncate">{event.calendarName}</span>
                </span>
              }
            />
            {event.location ? (
              <EventDetailRow label="Location" value={event.location} />
            ) : null}
            <EventDetailRow label="Status" value={formatStatus(event.status)} />
          </div>

          {event.description ? (
            <div className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--empty)] p-4">
              <p className="allme-kicker">Description</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">
                {event.description}
              </p>
            </div>
          ) : null}

          <ProviderEventEditPanel
            event={event}
            updateGoogleCalendarEvent={updateGoogleCalendarEvent}
          />

          <LinkedNotePanel
            createLinkedNoteFromEvent={createLinkedNoteFromEvent}
            deleteLinkedNote={deleteLinkedNote}
            event={event}
            linkedNote={linkedNote}
            publishLinkedNoteToGoogle={publishLinkedNoteToGoogle}
            setLinkedNote={setLinkedNote}
            updateLinkedNote={updateLinkedNote}
          />

          <div className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--empty)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="allme-kicker">AllMe state</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  Local planning context only. Google Calendar is not changed.
                </p>
              </div>
              <span className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                {getReviewStatusLabel(currentReviewStatus)}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {eventReviewStatusOptions.map((option) => (
                <form action={saveEventReviewStatus} key={option.value}>
                  <input name="eventId" type="hidden" value={event.id} />
                  <input
                    name="reviewStatus"
                    type="hidden"
                    value={option.value}
                  />
                  <EventReviewStatusButton
                    isActive={currentReviewStatus === option.value}
                    label={option.label}
                  />
                </form>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {todayHref ? (
              <Link
                className="inline-flex rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
                href={todayHref}
                onClick={onClose}
              >
                Review day in Today
              </Link>
            ) : null}
            {event.htmlLink ? (
              <a
                className="inline-flex rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
                href={event.htmlLink}
                rel="noreferrer"
                target="_blank"
              >
                Open in Google Calendar
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function LinkedNotePanel({
  createLinkedNoteFromEvent,
  deleteLinkedNote,
  event,
  linkedNote,
  publishLinkedNoteToGoogle,
  setLinkedNote,
  updateLinkedNote,
}: {
  createLinkedNoteFromEvent: (
    formData: FormData,
  ) => Promise<CalendarLinkedNoteMutationResult>;
  deleteLinkedNote: (formData: FormData) => Promise<void>;
  event: CalendarEventDetail;
  linkedNote: CalendarLinkedNoteState | null;
  publishLinkedNoteToGoogle: (
    formData: FormData,
  ) => Promise<CalendarProviderWriteMutationResult>;
  setLinkedNote: (linkedNote: CalendarLinkedNoteState | null) => void;
  updateLinkedNote: (
    formData: FormData,
  ) => Promise<CalendarLinkedNoteMutationResult>;
}) {
  async function createLinkedNote(formData: FormData) {
    const note = await createLinkedNoteFromEvent(formData);

    setLinkedNote(toLinkedNoteState({ note, scope: "event_instance" }));
  }

  async function saveLinkedNote(formData: FormData) {
    const note = await updateLinkedNote(formData);
    const nextLinkedNote = toLinkedNoteState({
      note,
      scope: linkedNote?.scope ?? null,
    });

    setLinkedNote(nextLinkedNote);

    return nextLinkedNote;
  }

  async function deleteEventNote(formData: FormData) {
    await deleteLinkedNote(formData);
    setLinkedNote(null);
  }

  return (
    <div className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--empty)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="allme-kicker">Linked note</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            This is the event description and work plan in AllMe. Saving here is
            local-only until you explicitly publish to Google Calendar.
          </p>
        </div>
        {linkedNote ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
            <StickyNote aria-hidden="true" className="h-3.5 w-3.5" />
            Linked
          </span>
        ) : null}
      </div>

      {linkedNote ? (
        <LinkedNoteEditor
          deleteEventNote={deleteEventNote}
          event={event}
          key={linkedNote.id}
          linkedNote={linkedNote}
          publishLinkedNoteToGoogle={publishLinkedNoteToGoogle}
          saveLinkedNote={saveLinkedNote}
        />
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <form action={createLinkedNote}>
            <input name="eventId" type="hidden" value={event.id} />
            <LinkedNoteActionButton label="Create event note" />
          </form>
        </div>
      )}
    </div>
  );
}

function ProviderEventEditPanel({
  event,
  updateGoogleCalendarEvent,
}: {
  event: CalendarEventDetail;
  updateGoogleCalendarEvent: (
    formData: FormData,
  ) => Promise<CalendarProviderWriteMutationResult>;
}) {
  const [isAllDay, setIsAllDay] = useState(event.isAllDay);
  const [result, setResult] = useState<CalendarProviderWriteMutationResult | null>(
    null,
  );

  async function updateProviderEvent(formData: FormData) {
    formData.set("idempotencyKey", createIdempotencyKey());
    formData.set("isAllDay", isAllDay ? "true" : "false");

    const nextResult = await updateGoogleCalendarEvent(formData);

    setResult(nextResult);
  }

  return (
    <div className="mt-5 rounded-2xl border border-[var(--accent)]/35 bg-[var(--empty)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="allme-kicker text-[var(--accent)]">
            Google Calendar event
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            Editing updates the real Google Calendar event after AllMe checks
            provider freshness. Local review state and notes stay separate.
          </p>
        </div>
        {event.recurringEventId ? (
          <span className="rounded-full border border-[var(--warn)]/35 px-3 py-1 text-xs font-semibold text-[var(--warn)]">
            Recurring blocked
          </span>
        ) : null}
      </div>

      {event.recurringEventId ? (
        <p className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-xs leading-5 text-[var(--muted)]">
          Recurring event edits are not supported in this slice. Open Google
          Calendar for recurrence changes.
        </p>
      ) : (
        <form action={updateProviderEvent} className="mt-4 grid gap-3">
          <input name="eventId" type="hidden" value={event.id} />
          <label className="grid gap-1.5">
            <span className="allme-kicker">Title</span>
            <input
              className="min-h-10 rounded-xl border border-[var(--line)] bg-[var(--input)] px-3 text-sm font-semibold outline-none transition focus:border-[var(--accent)]"
              defaultValue={event.title}
              name="title"
              required
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="allme-kicker">Location</span>
              <input
                className="min-h-10 rounded-xl border border-[var(--line)] bg-[var(--input)] px-3 text-sm font-semibold outline-none transition focus:border-[var(--accent)]"
                defaultValue={event.location ?? ""}
                name="location"
                placeholder="Optional"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="allme-kicker">Type</span>
              <button
                aria-pressed={isAllDay}
                className={[
                  "min-h-10 rounded-xl border px-3 text-left text-sm font-semibold transition",
                  isAllDay
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border-[var(--line)] bg-[var(--input)] text-[var(--foreground)]",
                ].join(" ")}
                onClick={() => setIsAllDay((current) => !current)}
                type="button"
              >
                {isAllDay ? "All-day event" : "Timed event"}
              </button>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="allme-kicker">Start date</span>
              <input
                className="min-h-10 rounded-xl border border-[var(--line)] bg-[var(--input)] px-3 text-sm font-semibold outline-none transition focus:border-[var(--accent)]"
                defaultValue={getProviderEditStartDate(event)}
                name="startDate"
                required
                type="date"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="allme-kicker">End date</span>
              <input
                className="min-h-10 rounded-xl border border-[var(--line)] bg-[var(--input)] px-3 text-sm font-semibold outline-none transition focus:border-[var(--accent)]"
                defaultValue={getProviderEditEndDate(event)}
                name="endDate"
                required
                type="date"
              />
            </label>
          </div>

          {!isAllDay ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="allme-kicker">Start time</span>
                <input
                  className="min-h-10 rounded-xl border border-[var(--line)] bg-[var(--input)] px-3 text-sm font-semibold outline-none transition focus:border-[var(--accent)]"
                  defaultValue={getProviderEditStartTime(event)}
                  name="startTime"
                  required
                  type="time"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="allme-kicker">End time</span>
                <input
                  className="min-h-10 rounded-xl border border-[var(--line)] bg-[var(--input)] px-3 text-sm font-semibold outline-none transition focus:border-[var(--accent)]"
                  defaultValue={getProviderEditEndTime(event)}
                  name="endTime"
                  required
                  type="time"
                />
              </label>
            </div>
          ) : (
            <>
              <input name="startTime" type="hidden" value="" />
              <input name="endTime" type="hidden" value="" />
            </>
          )}

          <label className="grid gap-1.5">
            <span className="allme-kicker">Description</span>
            <textarea
              className="min-h-24 resize-y rounded-xl border border-[var(--line)] bg-[var(--input)] p-3 text-sm leading-6 outline-none transition focus:border-[var(--accent)]"
              defaultValue={event.description ?? ""}
              name="description"
              placeholder="Optional provider description"
            />
          </label>

          <ProviderEventEditButton />
          {result ? (
            <p
              className={[
                "text-xs font-semibold",
                result.status === "succeeded"
                  ? "text-[var(--success)]"
                  : "text-[var(--danger)]",
              ].join(" ")}
            >
              {result.message}
            </p>
          ) : null}
        </form>
      )}
    </div>
  );
}

function ProviderEventEditButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex min-h-9 w-fit items-center rounded-xl border border-[var(--accent)] px-3 text-xs font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)]/10 disabled:cursor-wait disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "Updating..." : "Update Google Calendar event"}
    </button>
  );
}

function LinkedNoteEditor({
  deleteEventNote,
  event,
  linkedNote,
  publishLinkedNoteToGoogle,
  saveLinkedNote,
}: {
  deleteEventNote: (formData: FormData) => Promise<void>;
  event: CalendarEventDetail;
  linkedNote: CalendarLinkedNoteState;
  publishLinkedNoteToGoogle: (
    formData: FormData,
  ) => Promise<CalendarProviderWriteMutationResult>;
  saveLinkedNote: (formData: FormData) => Promise<CalendarLinkedNoteState>;
}) {
  const publishFormRef = useRef<HTMLFormElement>(null);
  const warningAcceptedRef = useRef(false);
  const [draftBody, setDraftBody] = useState(linkedNote.body);
  const [draftTitle, setDraftTitle] = useState(linkedNote.title);
  const [dontShowWarningAgain, setDontShowWarningAgain] = useState(false);
  const [lastPublishedBody, setLastPublishedBody] = useState<string | null>(null);
  const [localSaveMessage, setLocalSaveMessage] = useState<string | null>(null);
  const [publishResult, setPublishResult] =
    useState<CalendarProviderWriteMutationResult | null>(null);
  const [showFirstWriteWarning, setShowFirstWriteWarning] = useState(false);
  const hasUnsavedChanges =
    draftBody !== linkedNote.body || draftTitle !== linkedNote.title;

  async function saveAllMeNote(formData: FormData) {
    const note = await saveLinkedNote(formData);

    setDraftBody(note.body);
    setDraftTitle(note.title);
    setLocalSaveMessage("Saved locally in AllMe. Google Calendar was not changed.");
    setPublishResult(null);
  }

  async function publishEventNote(formData: FormData) {
    formData.set("idempotencyKey", createIdempotencyKey());
    const result = await publishLinkedNoteToGoogle(formData);

    setPublishResult(result);
    setLocalSaveMessage(null);

    if (result.status === "succeeded") {
      setLastPublishedBody(linkedNote.body);
    }
  }

  function handlePublishSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    if (warningAcceptedRef.current) {
      warningAcceptedRef.current = false;
      return;
    }

    if (localStorage.getItem(publishWarningPreferenceKey) === "true") {
      return;
    }

    submitEvent.preventDefault();
    setShowFirstWriteWarning(true);
  }

  function confirmFirstWriteWarning() {
    if (dontShowWarningAgain) {
      localStorage.setItem(publishWarningPreferenceKey, "true");
    }

    warningAcceptedRef.current = true;
    setShowFirstWriteWarning(false);
    publishFormRef.current?.requestSubmit();
  }

  const providerStatus = getProviderPublishStatus({
    hasUnsavedChanges,
    lastPublishedBody,
    linkedNoteBody: linkedNote.body,
    publishResult,
  });

  return (
    <div className="mt-4 grid gap-3">
      <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
        <div>
          <p className="allme-kicker">AllMe note</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            Local workspace. Saving updates the same note shown in Notes and
            does not change Google Calendar.
          </p>
        </div>
        <form action={saveAllMeNote} className="mt-3 grid gap-3">
          <input name="noteId" type="hidden" value={linkedNote.id} />
          <label className="grid gap-1.5">
            <span className="allme-kicker">Title</span>
            <input
              className="min-h-10 rounded-xl border border-[var(--line)] bg-[var(--input)] px-3 text-sm font-semibold outline-none transition focus:border-[var(--accent)]"
              name="title"
              onChange={(event) => setDraftTitle(event.target.value)}
              required
              value={draftTitle}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="allme-kicker">Note</span>
            <textarea
              className="min-h-36 resize-y rounded-xl border border-[var(--line)] bg-[var(--input)] p-3 text-sm leading-6 outline-none transition focus:border-[var(--accent)]"
              name="body"
              onChange={(event) => setDraftBody(event.target.value)}
              placeholder="Add prep notes, context, follow-ups, or decisions..."
              value={draftBody}
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <LinkedNoteActionButton label="Save AllMe note" tone="primary" />
            {hasUnsavedChanges ? (
              <span className="text-xs font-semibold text-[var(--warn)]">
                Unsaved local changes
              </span>
            ) : null}
          </div>
        </form>
        {localSaveMessage ? (
          <p className="mt-2 text-xs font-semibold text-[var(--success)]">
            {localSaveMessage}
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border border-[var(--accent)]/35 bg-[var(--empty)] p-3">
        <p className="allme-kicker text-[var(--accent)]">
          Google Calendar description
        </p>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
          Publishing copies the saved AllMe note body into the real Google
          Calendar event description. Other event fields are not changed.
        </p>
        <form
          action={publishEventNote}
          className="mt-3"
          onSubmit={handlePublishSubmit}
          ref={publishFormRef}
        >
          <input name="eventId" type="hidden" value={event.id} />
          <ProviderPublishButton disabled={hasUnsavedChanges} />
        </form>
        <p
          className={[
            "mt-2 text-xs font-semibold",
            providerStatus.tone === "danger"
              ? "text-[var(--danger)]"
              : providerStatus.tone === "success"
                ? "text-[var(--success)]"
                : "text-[var(--muted)]",
          ].join(" ")}
        >
          {providerStatus.message}
        </p>
      </div>

      <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
        <p className="allme-kicker">Note actions</p>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
          Delete note removes the AllMe note from Calendar and Notes only.
          Google Calendar is not changed.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {linkedNote.href ? (
            <Link
              className="inline-flex min-h-9 items-center rounded-xl border border-[var(--line)] px-3 text-xs font-semibold text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              href={linkedNote.href as Route}
            >
              Open linked note
            </Link>
          ) : null}
          <form
            action={deleteEventNote}
            onSubmit={(submitEvent) => {
              if (
                !window.confirm(
                  "Delete this AllMe note? This removes the note from Notes and Calendar, but does not change Google Calendar.",
                )
              ) {
                submitEvent.preventDefault();
              }
            }}
          >
            <input name="noteId" type="hidden" value={linkedNote.id} />
            <LinkedNoteActionButton label="Delete AllMe note" tone="danger" />
          </form>
        </div>
      </div>

      {showFirstWriteWarning ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-[var(--line)] bg-[var(--panel-strong)] p-5 shadow-2xl">
            <p className="allme-kicker text-[var(--accent)]">
              Google Calendar write
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em]">
              Publish this note to Google Calendar?
            </h3>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              This will update the real Google Calendar event description. AllMe
              will record the attempt and keep local review state separate.
            </p>
            <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-[var(--muted)]">
              <input
                checked={dontShowWarningAgain}
                className="h-4 w-4 accent-[var(--accent)]"
                onChange={(event) =>
                  setDontShowWarningAgain(event.target.checked)
                }
                type="checkbox"
              />
              Don&apos;t show this again
            </label>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                className="inline-flex min-h-9 items-center rounded-xl border border-[var(--line)] px-3 text-xs font-semibold text-[var(--muted)] transition hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
                onClick={() => setShowFirstWriteWarning(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex min-h-9 items-center rounded-xl bg-[var(--accent)] px-3 text-xs font-semibold text-[var(--background)] transition hover:bg-[var(--accent-strong)]"
                onClick={confirmFirstWriteWarning}
                type="button"
              >
                Publish to Google
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getProviderPublishStatus({
  hasUnsavedChanges,
  lastPublishedBody,
  linkedNoteBody,
  publishResult,
}: {
  hasUnsavedChanges: boolean;
  lastPublishedBody: string | null;
  linkedNoteBody: string;
  publishResult: CalendarProviderWriteMutationResult | null;
}) {
  if (hasUnsavedChanges) {
    return {
      message: "Local changes are not published. Save the AllMe note first.",
      tone: "danger" as const,
    };
  }

  if (publishResult) {
    return {
      message: publishResult.message,
      tone: publishResult.status === "succeeded" ? "success" : "danger",
    };
  }

  if (lastPublishedBody === linkedNoteBody) {
    return {
      message: "Published successfully in this session.",
      tone: "success" as const,
    };
  }

  return {
    message: "Local note only. Google Calendar has not been updated from this note.",
    tone: "neutral" as const,
  };
}

function createIdempotencyKey() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

type CalendarLinkedNoteState = {
  body: string;
  href: string | null;
  id: string;
  noteDate: string | null;
  scope: "event_instance" | "recurring_series" | null;
  title: string;
};

function getLinkedNoteState(
  event: CalendarEventDetail,
): CalendarLinkedNoteState | null {
  if (!event.linkedNoteId) {
    return null;
  }

  return {
    body: event.linkedNoteBody ?? "",
    href: event.linkedNoteHref,
    id: event.linkedNoteId,
    noteDate: event.linkedNoteDate,
    scope: event.linkedNoteScope,
    title: event.linkedNoteTitle ?? "Untitled note",
  };
}

function toLinkedNoteState({
  note,
  scope,
}: {
  note: CalendarLinkedNoteMutationResult;
  scope: CalendarLinkedNoteState["scope"];
}): CalendarLinkedNoteState {
  return {
    body: note.body,
    href: note.href,
    id: note.id,
    noteDate: note.noteDate,
    scope,
    title: note.title,
  };
}

function LinkedNoteActionButton({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "danger" | "neutral" | "primary";
}) {
  const { pending } = useFormStatus();
  const toneClassName = {
    danger:
      "border-[var(--danger)]/40 text-[var(--danger)] hover:border-[var(--danger)]",
    neutral:
      "border-[var(--line)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]",
    primary:
      "border-[var(--accent)] bg-[var(--accent)] text-[var(--background)] hover:bg-[var(--accent-strong)]",
  }[tone];

  return (
    <button
      className={[
        "inline-flex min-h-9 items-center rounded-xl border px-3 text-xs font-semibold transition disabled:cursor-wait disabled:opacity-60",
        toneClassName,
      ].join(" ")}
      disabled={pending}
      type="submit"
    >
      {pending ? "Saving..." : label}
    </button>
  );
}

function ProviderPublishButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex min-h-9 items-center rounded-xl border border-[var(--accent)] px-3 text-xs font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)]/10 disabled:cursor-wait disabled:opacity-60"
      disabled={pending || disabled}
      type="submit"
    >
      {pending ? "Publishing..." : "Publish note to Google Calendar"}
    </button>
  );
}

function EventReviewStatusButton({
  isActive,
  label,
}: {
  isActive: boolean;
  label: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-pressed={isActive}
      className={[
        "rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-wait disabled:opacity-60",
        isActive
          ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
          : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]",
      ].join(" ")}
      disabled={pending}
      type="submit"
    >
      {pending ? "Saving..." : label}
    </button>
  );
}

function EventDetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid gap-2 rounded-2xl border border-[var(--line)] bg-[var(--empty)] px-4 py-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
      <p className="allme-kicker">{label}</p>
      <div className="min-w-0 text-sm font-semibold text-[var(--foreground)]">
        {value}
      </div>
    </div>
  );
}

export function getEventTimeLabel(event: CalendarEventDetail) {
  if (event.isAllDay) {
    return event.startDate
      ? `All day · ${formatDateKey(event.startDate)}`
      : "All day";
  }

  if (!event.startsAt) {
    return "Time TBD";
  }

  const startLabel = eventDateTimeFormatter.format(event.startsAt);

  if (!event.endsAt) {
    return startLabel;
  }

  const endLabel = isSameLocalDate(event.startsAt, event.endsAt)
    ? eventTimeFormatter.format(event.endsAt)
    : eventDateTimeFormatter.format(event.endsAt);

  return `${startLabel} - ${endLabel}`;
}

function formatDateKey(dateKey: string) {
  return eventDateFormatter.format(new Date(`${dateKey}T00:00:00`));
}

function getEventTodayDateKey(event: CalendarEventDetail) {
  if (event.startDate) {
    return event.startDate;
  }

  if (!event.startsAt) {
    return null;
  }

  return [
    event.startsAt.getFullYear(),
    String(event.startsAt.getMonth() + 1).padStart(2, "0"),
    String(event.startsAt.getDate()).padStart(2, "0"),
  ].join("-");
}

function getProviderEditStartDate(event: CalendarEventDetail) {
  if (event.startDate) {
    return event.startDate;
  }

  return event.startsAt ? toDateInputValue(event.startsAt) : "";
}

function getProviderEditEndDate(event: CalendarEventDetail) {
  if (event.endDate) {
    return addDaysToDateKey(event.endDate, -1);
  }

  return event.endsAt
    ? toDateInputValue(event.endsAt)
    : getProviderEditStartDate(event);
}

function getProviderEditStartTime(event: CalendarEventDetail) {
  return event.startsAt ? toTimeInputValue(event.startsAt) : "09:00";
}

function getProviderEditEndTime(event: CalendarEventDetail) {
  return event.endsAt ? toTimeInputValue(event.endsAt) : "10:00";
}

function toDateInputValue(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function toTimeInputValue(date: Date) {
  return [
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
  ].join(":");
}

function addDaysToDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function formatStatus(status: string) {
  return status.slice(0, 1).toUpperCase() + status.slice(1);
}

function getReviewStatusLabel(status: CalendarEventReviewStatus) {
  return (
    eventReviewStatusOptions.find((option) => option.value === status)?.label ??
    "None"
  );
}

function parseReviewStatus(formData: FormData): CalendarEventReviewStatus {
  const reviewStatus = String(formData.get("reviewStatus") ?? "");

  if (isReviewStatus(reviewStatus)) {
    return reviewStatus;
  }

  return "none";
}

function isReviewStatus(value: string): value is CalendarEventReviewStatus {
  return eventReviewStatusOptions.some((option) => option.value === value);
}

function isSameLocalDate(left: Date, right: Date) {
  return eventDateFormatter.format(left) === eventDateFormatter.format(right);
}

const eventDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
});

const eventDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  hour: "numeric",
  minute: "2-digit",
  month: "2-digit",
});

const eventTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

const eventReviewStatusOptions: {
  label: string;
  value: CalendarEventReviewStatus;
}[] = [
  { label: "None", value: "none" },
  { label: "Needs prep", value: "needs_prep" },
  { label: "Done", value: "done" },
  { label: "Ignored", value: "ignored" },
];
