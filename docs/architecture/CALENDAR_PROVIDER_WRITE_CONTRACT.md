# Calendar Provider-Write Contract

This document defines what AllMe may write back to Google Calendar and what
must remain local-only. It is intentionally written before implementing provider
writes so Calendar Phase 2 can stay small, auditable, and reversible.

Reference behavior is based on Google Calendar API v3 documentation for
CalendarList access roles, Events resources, event update/patch behavior, ETags,
and recurring events:

- CalendarList access roles:
  <https://developers.google.com/workspace/calendar/api/v3/reference/calendarList>
- Events resource fields:
  <https://developers.google.com/calendar/api/v3/reference/events>
- Events update behavior:
  <https://developers.google.com/calendar/api/v3/reference/events/update>
- Resource versioning and ETags:
  <https://developers.google.com/calendar/api/guides/version-resources>
- Recurring events:
  <https://developers.google.cn/workspace/calendar/api/guides/recurringevents>

## Product Policy

Google Calendar remains the source of truth for provider-backed event fields.
AllMe owns local-only planning fields.

Provider writes must be:

- explicit user actions, never automatic page-load side effects
- scoped to the authorized owner user
- limited to calendars where the connected Google account can write
- guarded by current provider ETag/version checks where possible
- recorded in an audit table before/after provider mutation
- followed by local cache reconciliation from the provider response or a sync
- safe on failure: local-only state must not pretend the provider write succeeded
- powered by shared Calendar-owned provider-write actions and policy helpers,
  even when launched from Today

## Allowed Provider Fields

### Phase 2.5-2.6: Non-recurring Events

Allowed for single, non-recurring provider events:

- `summary`: event title
- `description`: provider event description
- `location`: event location
- `start`: event start date/time or all-day date
- `end`: event end date/time or all-day provider-exclusive date
- `status`: only for cancelling/deleting an event through supported Google
  event delete/cancel behavior

Allowed for AllMe-created non-recurring events:

- `summary`
- `description`
- `location`
- `start`
- `end`

Allowed for existing synced non-recurring events:

- `description` first, because AllMe event notes map naturally to the provider
  description
- `summary`, `location`, `start`, and `end` only after the create/edit/cancel
  slice has ETag conflict handling and audit coverage

### Event Notes To Provider Description

The current local event note body is the future source for Google Calendar
`description`.

Rules:

- Saving an AllMe event note remains local-only until a specific "publish to
  Google Calendar" action exists.
- Provider description writes must update only `description`.
- Provider description writes must not overwrite a newer Google description
  without conflict handling.
- After provider success, AllMe should update the local cached event
  description from the provider response or trigger a sync.

### Publish Note Vs Edit Event Description

AllMe must treat these as separate operations:

- `publish_note_description`: copy the AllMe event note body into Google
  Calendar `description`.
- `update_event`: edit provider event fields from an event edit form.

Both operations may write Google `description`, but they represent different
user intent and must have separate action names, audit `operation` values,
button copy, and tests.

`publish_note_description` must not silently change `summary`, `location`,
`start`, or `end`. `update_event` must not infer note-body changes unless the
event edit form explicitly includes `description`.

## OAuth Write-Readiness Policy

Provider writes require a write-capable Google Calendar OAuth scope.

Current read-only scope:

- `https://www.googleapis.com/auth/calendar.readonly`

Future write-capable scope candidates:

- preferred for Phase 2: `https://www.googleapis.com/auth/calendar.events`
- broader future option: `https://www.googleapis.com/auth/calendar`

`calendar.events` is preferred for Phase 2 because AllMe writes are event-level
only. Phase 2 does not require calendar ACL, sharing, or calendar settings
access.

Policy:

- read-only tokens can sync and render Calendar data
- read-only tokens must not perform provider writes
- write actions must be disabled or return a clear
  `reauthorization_required` state when only read-only Calendar scope exists
- the token resolver must never "upgrade" scope silently
- OAuth scope expansion is not part of this contract slice and requires explicit
  approval before implementation
- write-readiness should be implemented as pure, testable policy helpers before
  provider writes ship

Suggested user-safe copy:

`Google Calendar write access is not authorized. Reconnect Google Calendar with write access before publishing changes.`

## Local-Only Fields

These remain AllMe-only and must not be written to Google Calendar:

- review state: `Needs prep`, `Done`, `Ignored`, `Unreviewed`
- linked note identity
- note body until the user explicitly chooses to publish/sync it to the provider
  description
- note title
- Today action queue state
- local filters/source visibility
- local completion/prep tracking
- any future local event-linked task state

## Blocked Provider Fields

AllMe must not write these in Calendar Phase 2:

- attendees or guests
- RSVP/attendee response status
- organizer, creator, or ownership fields
- conference data / Meet links
- reminders
- notifications
- attachments
- recurrence rules, `RRULE`, `EXDATE`, `RDATE`, or recurring-series metadata
  before the recurrence-specific slices
- ACLs, calendar sharing, or access-control rules
- calendar list properties, calendar colors, or calendar settings
- event transparency/visibility/classification unless explicitly approved later
- arbitrary raw provider payload fields

## PATCH-first Mutation Policy

Future provider update actions should prefer Google Calendar PATCH requests with
minimal payloads.

Rules:

- build a patch object from an allowlist, never from raw form data
- validate every provider-bound key against the approved field list
- reject unknown keys before making a provider request
- omit unchanged fields when practical
- use full event replacement only if a later slice explicitly approves it and
  adds tests for preserving provider fields AllMe does not model

Approved patch keys for early non-recurring updates:

- `summary`
- `description`
- `location`
- `start`
- `end`

Blocked from patch helper output:

- every field listed in "Blocked Provider Fields"
- AllMe local-only fields
- raw payload objects
- local note identifiers
- review state

## Blocked Calendars And Access Roles

Provider writes are allowed only when all of the following are true:

- connection status is `active`
- token resolver returns a fresh Google Calendar access token
- token has a write-capable Google Calendar OAuth scope
- calendar row is not deleted
- calendar is selected in AllMe
- calendar access role is `writer` or `owner`
- event belongs to that calendar and the authorized owner user
- event is not locally marked deleted/cancelled unless the action is explicitly a
  cancel/delete action

Provider writes are blocked for:

- `freeBusyReader`
- `reader`
- unknown or missing `access_role`
- deleted calendars
- hidden/unselected calendars
- disabled, revoked, or reauthorization-required connections
- read-only Calendar OAuth tokens
- holiday/subscription calendars unless Google reports `writer` or `owner`
- events without a stable `source_event_id`
- events that only exist locally but have not been created with Google yet,
  except in the explicit provider-create slice

Rationale: Google CalendarList access roles define `writer` as read/write for
events and `owner` as writer plus access-control management. AllMe should never
attempt writes against read-only or free/busy-only surfaces.

## Recurring Event Policy

Recurring event provider writes are deferred and must ship as separate slices.

### Current Policy

- No provider writes to recurring masters.
- No provider writes to recurring instances.
- Event notes may exist locally for an event instance.
- Recurring-series note sharing may remain a local read-model/schema capability,
  but it does not imply provider recurrence writes.

### Future Slice Policy

This-event-only recurrence edits:

- may write only to a specific recurring instance
- must include the instance `source_event_id`
- should retain `recurringEventId` and `originalStartTime` context for audit and
  conflict explanation
- must not mutate the recurring master

This-and-following recurrence edits:

- must be a dedicated slice
- must model the Google split-series behavior explicitly
- must be tested against cached parent/instance identity behavior
- must not be hidden behind the same UI as non-recurring edits

Recurring event creation:

- must be a dedicated slice after non-recurring create/edit/cancel is stable
- must define supported recurrence patterns before exposing UI
- must not accept arbitrary RRULE text from a user in v1

## Conflict Policy

All provider writes must compare the cached local event state with the current
provider state before mutation.

Minimum policy:

- use Google ETag/version checks where possible
- do not blindly overwrite if the provider event changed since the last cache
  sync
- if conflict is detected, do not write provider data
- surface a user-safe conflict message:
  `This Google Calendar event changed since AllMe last synced. Sync Calendar and try again.`
- keep the local AllMe note/state unchanged unless the user explicitly discards
  it

Conflict triggers:

- cached `etag` no longer matches provider `etag`
- event no longer exists
- event was cancelled externally
- calendar access role no longer allows writes
- provider event is now recurring and the current action does not support
  recurrence
- provider response rejects the update with auth, permission, precondition, or
  validation errors

Fetch-before-write is mandatory:

- fetch the current provider event before update/delete/publish
- compare current provider `etag` with cached local `etag`
- abort before mutation if the ETags differ
- record the aborted attempt as `conflict`
- do not blindly overwrite provider data

Conflict resolution v1:

- user runs sync
- AllMe refreshes local cache
- user retries the explicit write

No automatic merge is allowed in v1.

## Local Update Policy

Provider writes must not create a split-brain state.

On provider success:

- write an audit row as `succeeded`
- update the local event cache from the provider response when the response
  contains the changed fields
- update local `provider_updated_at`, `etag`, `raw_payload`, and relevant
  normalized fields
- if provider response is incomplete for the local read model, trigger or prompt
  a manual sync rather than guessing

On provider failure:

- write an audit row as `failed`
- do not update provider-backed normalized fields
- do not update `etag`
- keep local-only note/review state as-is
- show sanitized error copy; never expose tokens or raw provider error bodies

On conflict:

- write an audit row as `conflict`
- do not update provider-backed normalized fields
- keep local note/review state as-is
- prompt user to sync before retrying

### Delete Event Semantics

The user-facing label is `Delete event`.

Provider behavior:

- for non-recurring provider events, use Google Calendar's supported delete
  endpoint/behavior where appropriate
- do not locally mark a provider-backed event deleted before provider success
- do not remove or tombstone local cache rows before provider success
- after provider success, update local cache from provider confirmation or wait
  for sync confirmation
- if provider delete/cancel fails, leave the local cached event unchanged and
  record the audit row as `failed`
- recurring event deletion remains deferred unless a later recurrence-specific
  slice explicitly supports it

Local cache behavior:

- local cached event state changes only after provider success or sync
  confirmation
- cancellation/deletion should preserve enough local audit context to explain
  what happened

### Stale-cache Write Guard

Writes must not proceed from stale local provider data without an explicit
freshness check.

Current stale threshold for writes:

- 1 hour from the last successful Calendar sync

Policy:

- if the last successful sync is older than the threshold and no provider
  freshness check is performed, block the write
- if local cache is stale but the action fetches the current provider event and
  passes ETag/freshness validation before mutation, the write may proceed
- no auto-sync is allowed in this slice
- stale-cache policy must not force auto-sync in the provider-write contract
  slice
- no writes should occur during page render
- stale-cache checks should be pure and testable

Suggested user-safe copy:

`Calendar data is too stale to write safely. Sync Calendar and try again.`

### First-write Warning Preference

The first Google Calendar write should warn the user that AllMe is about to
change provider data.

Policy:

- v1 preference may be browser-local through `localStorage`
- this warning preference is UX-only
- it must not affect server authorization, policy enforcement, or audit logging
- server actions must be safe even if the browser warning is bypassed
- warning UI is deferred to the create/edit/delete slice unless it is introduced
  as a tiny local-only component

Suggested warning copy:

`This will update Google Calendar. AllMe will record the attempt and keep local notes/review state separate.`

### Delete Confirmation Preference

The user-facing destructive action label is `Delete event`.

Policy:

- deleting a provider event requires confirmation by default
- the confirmation appears every time unless the user disables it
- the "do not show again" preference may be browser-local through
  `localStorage` in v1
- this preference is UX-only
- it must not bypass server-side authorization, audit logging, access-role
  checks, write-scope checks, stale-cache checks, ETag conflict checks, or
  provider mutation safety
- server actions must remain safe if the browser confirmation is bypassed

## Shared Calendar/Today Write Path

Today may expose provider-write actions later, but Calendar owns provider-write
policy and server actions.

Policy:

- Today must reuse Calendar-owned provider-write actions and policy helpers
- Today must not create a separate Google provider-write path
- Today can invoke shared actions once Calendar write flows are stable
- shared actions must enforce the same authorization, write-scope, access-role,
  stale-cache, ETag, audit, and idempotency policies regardless of entry point

## Audit Table Proposal

Proposed table: `calendar_provider_write_audit`

Purpose:

- record every attempted Google Calendar write
- support rollback reasoning and debugging without logging OAuth secrets
- prove whether local state came from provider success or remained local-only

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid primary key` | AllMe audit id. |
| `user_id` | `uuid not null` | Owner scope. |
| `connection_id` | `uuid` | Google Calendar connection at write time. |
| `calendar_id` | `uuid` | Local calendar row. |
| `event_id` | `uuid` | Local event row if known. |
| `source_calendar_id` | `text not null` | Provider calendar id. |
| `source_event_id` | `text` | Provider event id if known. |
| `operation` | `text not null` | `create_event`, `update_event`, `delete_event`, `publish_note_description`. Keep note publishing distinct from event-form description edits. |
| `status` | `text not null` | `pending`, `running`, `succeeded`, `failed`, `conflict`, `skipped`. |
| `idempotency_key` | `text not null` | Prevent duplicate form/action retries. |
| `request_patch` | `jsonb not null default {}` | Sanitized intended provider fields only. |
| `previous_etag` | `text` | Cached provider ETag before write. |
| `provider_etag` | `text` | Provider ETag returned after success. |
| `provider_updated_at` | `timestamp with time zone` | Provider `updated` value after success. |
| `error_code` | `text` | Sanitized category, not raw token/provider body. |
| `error_summary` | `text` | User-safe summary. |
| `started_at` | `timestamp with time zone not null` | Attempt start. |
| `finished_at` | `timestamp with time zone` | Attempt end. |
| `created_at` | `timestamp with time zone not null default now()` | Audit row creation. |
| `updated_at` | `timestamp with time zone not null default now()` | Audit row state-transition tracking. |

Audit statuses:

- `pending`: row created before the provider attempt is started
- `running`: provider mutation or provider freshness check is actively in
  progress
- `succeeded`: provider mutation succeeded and local reconciliation completed or
  was safely queued
- `failed`: provider mutation failed without conflict semantics
- `conflict`: ETag/provider freshness mismatch or stale provider state blocked
  the write
- `skipped`: server intentionally skipped the write, usually due to policy or
  idempotency behavior

`updated_at` helps trace audit row state transitions such as
`pending`/`running` to `succeeded`, `failed`, or `conflict`.

Indexes:

- `(user_id, created_at)`
- `(user_id, event_id, created_at)`
- unique `(user_id, idempotency_key)`
- `(user_id, status, created_at)`

Raw provider responses should not be stored in this table by default. If needed
later, store a sanitized response subset, never OAuth tokens, authorization
headers, or full provider error bodies.

### Idempotency Key Behavior

Provider-write actions must use idempotency keys.

Policy:

- generate one idempotency key per explicit user action/form submission
- retrying the exact same submission may reuse the same key
- changing form content should produce a new idempotency key
- the unique `(user_id, idempotency_key)` constraint prevents duplicate writes
  from double submissions or action retries
- idempotency behavior must not hide failed or conflict states from the user
- duplicate submissions should return the existing audit/result state when safe
  rather than issuing a second provider write

## Tests Needed

Provider-write contract tests:

- write-capable Calendar OAuth scope is required
- read-only Calendar OAuth scope returns `reauthorization_required`
- writer/owner calendars are allowed
- reader/freeBusyReader calendars are blocked
- deleted calendars are blocked
- unselected calendars are blocked
- missing source event id is blocked for updates
- local-only review state never appears in provider patch
- event note publish maps only to provider `description`
- provider patch excludes blocked fields
- PATCH helper rejects unknown provider fields
- `publish_note_description` and `update_event` remain separate operations
- stale local cache blocks or requires provider freshness check before write
- stale local cache may proceed only when fetch-before-write freshness/ETag
  validation passes

Conflict tests:

- matching ETag allows write
- mismatched ETag blocks write and records `conflict`
- provider event is fetched before mutation
- provider 404 records `conflict` or `failed` and does not mutate local event
- provider 403 records `failed` and marks actionable reconnect/permission state
- provider success updates local normalized event fields and ETag

Audit tests:

- audit row is created before provider call
- audit row can transition from `pending` to `running`
- audit row is marked `succeeded` only after provider success
- audit row is marked `failed` on provider failure
- audit row is marked `conflict` on ETag mismatch
- idempotency key prevents duplicate writes
- idempotency does not hide failed/conflict states
- no token or authorization value appears in audit payloads

Recurrence tests:

- non-recurring update rejects recurring events
- this-event-only slice rejects master-series mutation
- this-and-following slice is unavailable until explicitly implemented

Shared entry-point tests:

- Today-launched write actions reuse Calendar provider-write actions/helpers
- no Today-owned provider write path exists
- first-write warning preference does not bypass server authorization

## Implementation Slices

### Slice 2.5: Provider Write Contract And Audit Table

- add audit table and migration
- add pure write-policy helpers
- add write OAuth readiness helpers
- add stale-cache guard helpers
- add PATCH allowlist validation
- add idempotency policy helpers/tests
- add tests for access-role gating, write OAuth scope readiness, stale-cache
  guard, PATCH allowlist validation, idempotency behavior, and blocked fields
- no provider calls yet

### Slice 2.6: Publish Event Note To Google Description

- add explicit action: `Publish note to Google Calendar`
- require writable calendar and non-recurring event
- require write-capable Google Calendar OAuth scope
- require fresh-enough cache or fetch-before-write ETag validation
- fetch current provider event
- compare ETag
- PATCH `description` only
- audit `pending`, `running`, `succeeded`, `failed`, and `conflict` states
- reconcile local cache from provider response or prompt sync
- add optional first-write warning UI if still useful at this slice

### Slice 2.7: Non-recurring Event Create/Edit/Cancel

- add create/edit/cancel provider actions
- allow `summary`, `description`, `location`, `start`, `end`, and cancel/delete
- prefer PATCH for edits
- label destructive provider action as `Delete event`
- keep recurrence blocked
- audit every attempt

### Slice 2.8: Recurrence-aware UI Guardrails

- detect recurring events in edit surfaces
- show explicit recurrence warnings
- block unsupported recurrence writes with clear copy

### Slice 2.9: This-event-only Recurrence Edit

- support editing one recurring instance
- audit `recurringEventId` and `originalStartTime`
- keep recurring master untouched

### Slice 2.10: This-and-following Recurrence Edit

- implement only after split-series behavior is designed and tested

### Slice 2.11: Recurring Event Creation

- define supported recurrence patterns
- create provider recurrence only from structured UI

### Slice 2.12: Two-way Conflict Handling

- add richer conflict review UI
- let user choose provider version, AllMe version, or manual merge

## Non-goals

- no background writes
- no writes during page render
- no automatic note-to-description sync
- no OAuth scope expansion without explicit approval
- no full event replacement without explicit approval
- no separate Today-owned Google write path
- no attendee management
- no bidirectional recurrence editing until explicit recurrence slices
- no calendar ACL/sharing writes
- no provider writes from hidden/unselected calendars
