# Calendar Foundation

This document defines the first-pass Calendar architecture before OAuth, provider
sync, or interactive calendar views are implemented.

## Goals

- Keep Today reads local and cached in Postgres.
- Optimize for a single-owner personal OS while preserving `user_id` ownership on
  every private row.
- Sync Google Calendar into durable AllMe-owned tables before rendering agenda
  data in Today.
- Prefer simple v1 choices over attendee management, event editing, or
  bidirectional sync.
- Preserve raw provider payloads for debugging and future backfills without
  making UI queries depend on provider-shaped JSON.

## Proposed Schema

### `calendar_connections`

One row per user/provider account connection.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid primary key default random` | Internal connection id. |
| `user_id` | `uuid not null references users(id) on delete cascade` | Owner boundary. |
| `provider` | `text not null` | v1 value: `google_calendar`. |
| `provider_account_id` | `text` | Stable Google account id when available. |
| `account_email` | `text` | Display-only account identity. |
| `display_name` | `text not null` | Human label such as `Google Calendar`. |
| `status` | `text not null default 'active'` | `active`, `reauthorization_required`, `disabled`, `revoked`. |
| `scopes` | `text[] or jsonb not null default []` | Granted calendar scopes. |
| `sync_token` | `text` | Latest provider incremental token for all calendars if using a connection-wide sync. If sync token proves calendar-scoped, keep this null and use `calendar_calendars.sync_token`. |
| `settings` | `jsonb not null default {}` | Non-secret provider configuration. |
| `last_synced_at` | `timestamp with time zone` | Last successful sync completion. |
| `created_at` | `timestamp with time zone not null default now()` | Creation timestamp. |
| `updated_at` | `timestamp with time zone not null default now()` | Update timestamp. |

Indexes:

- Unique: `(user_id, provider, provider_account_id)` where `provider_account_id`
  is not null.
- Index: `(user_id, status)`.

Secret handling:

- Do not store OAuth access or refresh tokens in raw JSON payload columns.
- Token storage should either remain inside the Auth.js account layer if that
  becomes the chosen integration boundary, or be stored encrypted in a dedicated
  secret-bearing table/service. Calendar UI/status pages should only expose
  configuration presence, never token values.

### `calendar_calendars`

One row per synced provider calendar.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid primary key default random` | Internal calendar id. |
| `user_id` | `uuid not null references users(id) on delete cascade` | Owner boundary. |
| `connection_id` | `uuid not null references calendar_connections(id) on delete cascade` | Provider connection. |
| `source_calendar_id` | `text not null` | Google calendar id. |
| `name` | `text not null` | Provider calendar summary. |
| `description` | `text` | Provider description when available. |
| `timezone` | `text` | Provider calendar timezone. |
| `color` | `text` | Provider color id or hex when available. |
| `access_role` | `text` | Owner/reader/writer/freebusy role. |
| `is_primary` | `boolean not null default false` | Provider primary calendar marker. |
| `is_selected` | `boolean not null default true` | Whether AllMe should show/sync this calendar in agenda views. |
| `is_deleted` | `boolean not null default false` | Tombstone for removed calendars. |
| `sync_token` | `text` | Calendar-scoped incremental token if needed. |
| `raw_payload` | `jsonb not null default {}` | Last provider calendar payload. |
| `created_at` | `timestamp with time zone not null default now()` | Creation timestamp. |
| `updated_at` | `timestamp with time zone not null default now()` | Update timestamp. |

Indexes:

- Unique: `(user_id, connection_id, source_calendar_id)`.
- Index: `(user_id, is_selected, is_deleted)`.

### `calendar_events`

One row per provider event instance or single event. This table is the source of
truth for Today agenda reads.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid primary key default random` | Internal event id. |
| `user_id` | `uuid not null references users(id) on delete cascade` | Owner boundary. |
| `connection_id` | `uuid not null references calendar_connections(id) on delete cascade` | Provider connection. |
| `calendar_id` | `uuid not null references calendar_calendars(id) on delete cascade` | Owning synced calendar. |
| `source_event_id` | `text not null` | Google event id. |
| `source_ical_uid` | `text` | Google iCalUID for cross-calendar/event identity. |
| `recurring_event_id` | `text` | Provider recurring parent id for instances. |
| `original_start_at` | `timestamp with time zone` | Provider original start for recurring instances. |
| `title` | `text not null` | Provider summary or fallback `(No title)`. |
| `description` | `text` | Provider description. |
| `location` | `text` | Provider location. |
| `status` | `text not null default 'confirmed'` | `confirmed`, `tentative`, `cancelled`. |
| `visibility` | `text` | Provider visibility. |
| `transparency` | `text` | `opaque`/`transparent`; useful for focus/busy semantics. |
| `start_at` | `timestamp with time zone` | Timed start. Null for all-day rows if using date-only fields. |
| `end_at` | `timestamp with time zone` | Timed end. |
| `start_date` | `date` | All-day start date. |
| `end_date` | `date` | All-day exclusive end date from Google. |
| `is_all_day` | `boolean not null default false` | Derived from provider start/end shape. |
| `timezone` | `text` | Event timezone when provided. |
| `html_link` | `text` | Provider web link. |
| `etag` | `text` | Provider ETag for change detection. |
| `provider_updated_at` | `timestamp with time zone` | Provider `updated` timestamp. |
| `cancelled_at` | `timestamp with time zone` | Set when provider reports cancellation/deletion. |
| `raw_payload` | `jsonb not null default {}` | Last provider event payload. |
| `created_at` | `timestamp with time zone not null default now()` | Creation timestamp. |
| `updated_at` | `timestamp with time zone not null default now()` | Update timestamp. |

Indexes:

- Unique: `(user_id, calendar_id, source_event_id)`.
- Index: `(user_id, start_at)`.
- Index: `(user_id, start_date)`.
- Index: `(user_id, status)`.
- Optional: `(user_id, source_ical_uid)`.

V1 date rule:

- Timed events use `start_at` and `end_at`.
- All-day events use `start_date`, `end_date`, and `is_all_day = true`.
- Today queries must handle both timed and all-day rows.

### `calendar_sync_runs`

One row per sync attempt.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid primary key default random` | Internal run id. |
| `user_id` | `uuid not null references users(id) on delete cascade` | Owner boundary. |
| `connection_id` | `uuid references calendar_connections(id) on delete set null` | Connection synced. |
| `calendar_id` | `uuid references calendar_calendars(id) on delete set null` | Optional calendar-specific run. |
| `source_type` | `text not null default 'google_calendar'` | Provider/source label. |
| `status` | `import_status not null default 'pending'` | Reuse existing `pending/running/succeeded/failed` enum. |
| `sync_kind` | `text not null` | `full`, `incremental`, `recovery_full`. |
| `started_at` | `timestamp with time zone` | Start timestamp. |
| `finished_at` | `timestamp with time zone` | Finish timestamp. |
| `events_scanned` | `integer not null default 0` | Provider items read. |
| `events_inserted` | `integer not null default 0` | New local rows. |
| `events_updated` | `integer not null default 0` | Existing local rows updated. |
| `events_cancelled` | `integer not null default 0` | Rows marked cancelled/tombstoned. |
| `events_skipped` | `integer not null default 0` | Ignored rows. |
| `next_sync_token_written` | `boolean not null default false` | Whether a new token was persisted. |
| `error_summary` | `text` | Sanitized failure summary. |
| `created_at` | `timestamp with time zone not null default now()` | Creation timestamp. |

Indexes:

- Index: `(user_id, status)`.
- Index: `(user_id, connection_id, created_at)`.
- Index: `(user_id, calendar_id, created_at)`.

## Normalized Fields vs Raw Payloads

Normalize fields used by product queries:

- identity: `source_event_id`, `source_ical_uid`, `recurring_event_id`
- ownership: `user_id`, `connection_id`, `calendar_id`
- agenda display: `title`, `description`, `location`
- time filtering: `start_at`, `end_at`, `start_date`, `end_date`,
  `is_all_day`, `timezone`
- lifecycle: `status`, `cancelled_at`, `provider_updated_at`, `etag`
- provider links: `html_link`

Keep raw provider payloads for:

- debugging provider edge cases
- future backfills
- recurrence metadata not modeled in v1
- provider-specific fields that should not drive initial UI

Do not query Today directly from raw JSON. Raw JSON is an audit/debugging
support layer, not the application read model.

## Key Invariants

- Every calendar table row is scoped by `user_id`.
- Today reads only from `calendar_events`, never from Google live APIs.
- Sync is idempotent by `(user_id, calendar_id, source_event_id)`.
- Provider secrets are never stored in `raw_payload`.
- `calendar_sync_runs.error_summary` is sanitized before display.
- Incremental sync tokens are written only after the relevant provider page/set is
  fully processed successfully.
- Failed syncs do not advance the sync token.
- Cancelled/deleted provider events are tombstoned locally instead of hard
  deleted.
- All-day `end_date` remains provider-exclusive; display/query helpers handle
  inclusive user-facing ranges.

## Incremental Sync Contract

### Initial full sync

1. Require an authorized owner user.
2. Ensure an active `calendar_connections` row exists.
3. Fetch calendar list from Google.
4. Upsert `calendar_calendars` by `(user_id, connection_id, source_calendar_id)`.
5. For each selected calendar, start a `calendar_sync_runs` row with
   `sync_kind = 'full'`.
6. Fetch events in a bounded window, for example `past 90 days` through
   `future 365 days`.
7. Normalize each event and upsert `calendar_events`.
8. Mark cancellations as `status = 'cancelled'` and set `cancelled_at`.
9. Persist the provider `nextSyncToken` only after all pages for that calendar
   succeed.
10. Mark the sync run succeeded with counts.

### Incremental sync

1. Read the stored sync token for the calendar or connection.
2. Start a sync run with `sync_kind = 'incremental'`.
3. Fetch changed events using the token.
4. Upsert changed confirmed/tentative events.
5. Tombstone cancelled/deleted events.
6. Write the new sync token only after successful processing.
7. Mark the sync run succeeded.

### Token invalidation/recovery

If Google rejects an incremental token:

1. Mark the incremental run failed with a sanitized summary.
2. Do not clear local events immediately.
3. Start a `recovery_full` sync.
4. Rebuild the bounded event window.
5. Mark rows missing from the recovery window as cancelled only if the provider
   contract makes that safe. Otherwise leave old rows outside the active window
   untouched.

## Deletion and Cancellation Handling

V1 should not hard-delete events during sync.

- Provider `cancelled` events update the local row to `status = 'cancelled'`.
- Set `cancelled_at` when the cancellation is first observed.
- Keep `raw_payload` so the cancellation can be audited.
- Today excludes cancelled events by default.
- Future event detail/history views can optionally show cancelled events.

Calendar removal:

- Mark `calendar_calendars.is_deleted = true`.
- Stop showing events for deleted calendars.
- Do not immediately hard-delete historical event rows.

Manual local deletion is deferred. If later added, it should use an ignore or
visibility table rather than deleting provider-backed rows that sync can
recreate.

## Recurrence Strategy For V1

Use provider-expanded instances for product reads.

- Request single events/instances from Google so recurring occurrences are stored
  as concrete `calendar_events` rows.
- Store recurrence identity fields:
  - `recurring_event_id`
  - `original_start_at`
  - `source_ical_uid`
- Do not implement local RRULE expansion in v1.
- Do not edit recurring series or individual occurrences in v1.
- Treat each expanded instance as its own agenda row keyed by
  `(user_id, calendar_id, source_event_id)`.

This keeps Today and agenda queries simple and avoids calendar math bugs early.

## Today Agenda Query Contract

Today should consume a small, stable read model from `calendar_events`.

Input:

```ts
type GetTodayAgendaInput = {
  userId: string;
  dateKey: string; // YYYY-MM-DD in user's configured timezone
  timezone: string;
};
```

Output:

```ts
type TodayAgendaItem = {
  id: string;
  calendarId: string;
  title: string;
  location: string | null;
  isAllDay: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  startDate: string | null;
  endDate: string | null;
  status: "confirmed" | "tentative";
  source: "google_calendar";
  htmlLink: string | null;
};
```

Query behavior:

- Scope by `user_id`.
- Join selected, non-deleted calendars.
- Exclude `calendar_events.status = 'cancelled'`.
- Include timed events whose time range intersects the local day.
- Include all-day events where `dateKey >= start_date` and
  `dateKey < end_date`.
- Sort all-day events first, then timed events by `start_at`.
- Limit defensively for Today, for example `100`.
- Return an empty list if no calendar connection exists.

Today should display:

- connected agenda items if rows exist
- an empty state if connected but no events match the date
- a setup/not-connected state if no active calendar connection exists
- sync health copied from latest `calendar_sync_runs`, not provider live status

## Rollout Order

### 1. Foundation schema

- Add Drizzle tables and migration.
- Add read-only settings status for Calendar connection/sync health.
- Add unit tests for Today agenda date filtering helpers.

### 2. Sync contract implementation

- Add Google Calendar OAuth scope and token handling.
- Add connection bootstrap.
- Add full sync for calendar list and bounded event window.
- Add sync run lifecycle and sanitized error reporting.

### 3. Incremental sync

- Store sync tokens.
- Add incremental sync command/action.
- Add token invalidation recovery.
- Add settings visibility for latest run.

### 4. Today integration

- Replace Today's planned Agenda card with `getTodayAgenda`.
- Keep Today reading only local Postgres rows.
- Add empty, not-connected, failed-sync, and loaded states.

### 5. Calendar UI

- Build agenda and week views from `calendar_events`.
- Add calendar selection toggles.
- Add event detail read-only page/modal.

Current v1 behavior:

- `/calendar` is a read-only planning surface over local Postgres calendar rows.
- Sync is user-triggered with `Sync Google Calendar`; the page does not read live
  provider data during normal rendering.
- The page shows connection/sync readiness, selected calendar counts, last sync
  freshness, next-seven-day planning, next events, day agenda drawer, and
  read-only event detail drawer.
- Calendar source filters control local visibility only; Google Calendar is not
  modified.
- Event review states are local AllMe annotations: `Needs prep`, `Done`,
  `Ignored`, and `Unreviewed`.
- Default `All` focus hides ignored events; `Ignored` remains explicitly
  selectable.
- Empty states cover not connected, no cached calendars, no selected calendars,
  no cached events, and no matching focus-filter results.

### 6. Event-linked notes

- Add a note-link table or polymorphic note relationship after event identity is
  stable.
- Allow creating/opening notes from an event.

## Deferred Enhancements

- Bidirectional event creation/editing.
- Attendee management and RSVP state.
- Meeting conferencing metadata beyond raw payload preservation.
- Local recurrence expansion.
- Multi-user sharing, roles, organizations, or delegated calendars.
- Push/webhook-based Google Calendar notifications.
- Provider-agnostic calendar abstraction beyond Google Calendar.
- Calendar conflict detection and scheduling recommendations.
- Event-linked note creation and note backlinks.
- Background sync jobs and stale-cache notifications beyond the current last-sync
  status surface.
