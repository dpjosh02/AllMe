# Decision: First Progress Check-In

Date: 2026-05-06
Status: Proposed
Role: Product Manager / Architect

Data/DB review: 2026-05-06

UI/UX review: 2026-05-06

## Goal

Make `/progress` a real product surface with one small daily completion flow:
the user can create a simple progress item, log whether it was completed for a
selected day, and see a compact read-only summary from Today.

Canonical direction stays in `docs/ROADMAP.md`, `docs/PROJECT_BLUEPRINT.md`,
`docs/DEVELOPMENT_STATUS.md`, and `docs/ai/NEXT_SLICES.md`.

## Non-Goals

- No full habit engine, streak system, scoring algorithm, workouts, chores, or
  analytics.
- No Finance expansion.
- No Calendar provider writes or Calendar sync behavior changes.
- No Notes tagging/backlinking.
- No dependency changes.
- No multi-user product expansion beyond preserving existing owner scoping.

## Current Repo State

- Current branch: `codex/plan-next-slice`.
- Working tree was clean when this packet was created.
- Recent history is Calendar-heavy: recurrence guardrails, this-event-only edit
  support, calendar week navigation, and planning docs.
- `/progress` is still a placeholder route in `src/app/progress/page.tsx`.
- `/today` already has daily notes, quick capture, recent notes, and a cached
  Calendar agenda via `src/features/calendar/agenda-query.ts`.
- `src/server/db/schema.ts` has no Progress tables yet.

## User-Facing Behavior

- `/progress` replaces the placeholder with a focused daily check-in view.
- The first screen shows today's date, a create-item form, active progress
  items, and each item's logged state for the selected day.
- The user can create a short text progress item and mark/unmark it complete for
  the selected local date.
- The user can navigate to a nearby date or open today's check-in without losing
  owner scoping.
- `/today` Daily Closeout changes from planned-only to a compact read-only
  summary such as completed count, total active items, and a link to `/progress`.

## Data/Model Requirements

- Add a minimal Progress-owned model under the app-owned PostgreSQL source of
  truth.
- Preserve `user_id` on every Progress row and scope every query/mutation by the
  authorized user.
- Recommended model:
  - `progress_items`: id, user_id, title, archived_at, created_at, updated_at.
  - `progress_logs`: id, user_id, item_id, log_date, completed_at, created_at,
    updated_at.
- Enforce one log row per `(user_id, item_id, log_date)`.
- Use date keys derived from the user's timezone, matching Today's local-date
  behavior.
- Do not attach Progress logs to Notes or Calendar in this slice.

## Data/DB Evaluation

- Existing schema does not support this slice. `src/server/db/schema.ts` has no
  Progress-owned tables; reusing `notes.completed_at` would mix capture workflow
  state with Progress domain state and should not be done.
- One implementation-branch migration is required. Do not create it in the
  planning branch.
- Minimal schema change for the implementation branch:
  - Add `progress_items` with `id`, `user_id`, `title`, optional
    `archived_at`, `created_at`, and `updated_at`.
  - Add `progress_logs` with `id`, `user_id`, `item_id`, `log_date`,
    nullable `completed_at`, `created_at`, and `updated_at`.
  - Add a foreign key from `progress_items.user_id` to `users.id` with
    `on delete cascade`.
  - Add a foreign key from `progress_logs.user_id` to `users.id` with
    `on delete cascade`.
  - Add a foreign key from `progress_logs.item_id` to `progress_items.id` with
    `on delete cascade`.
  - Add a unique index on `(user_id, item_id, log_date)` for idempotent daily
    logging.
  - Add an index that supports the Progress page item list, such as
    `(user_id, archived_at, created_at)`.
  - Add an index that supports date summaries, such as `(user_id, log_date)`.
- No enum is needed for the first slice. Completion is represented by
  `completed_at is not null`.
- `archived_at` is acceptable as a low-risk hide mechanism for future cleanup,
  but archive/delete UI is deferred unless implementation needs it for local
  test data cleanup.

## Query/Action Requirements

- New Progress feature data helpers are needed under `src/features/progress/**`.
- Required read helpers:
  - Progress page data for `{ userId, requestedDateKey? }`, including timezone,
    selected date key, active items, and each item's log state for that date.
  - Today summary for `{ userId, dateKey }`, returning completed count, active
    item count, and whether there are any Progress items.
- Required server actions:
  - Create a progress item from a trimmed title.
  - Complete an item for a selected date.
  - Undo completion for an item/date.
- Complete should be idempotent via the `(user_id, item_id, log_date)` unique
  index and an upsert/update path.
- Undo can either set `completed_at` to null or delete the log row. If it keeps
  the row, all read models must count only rows where `completed_at is not null`.
- Server actions must call `requireCurrentUser()` or `requireOwnerUser()` and
  must not trust `userId` from form data.
- Mutations by `item_id` must first prove the item belongs to the authorized
  user, or perform the write through a scoped query/transaction that includes
  `progress_items.user_id = currentUser.id`.
- Revalidate `/progress`, `/today`, and `/` after Progress mutations.

## User Scoping Requirements

- Every Progress table must carry `user_id`.
- Every read must include `eq(progress*.userId, userId)` from the authorized
  page/action user.
- Every write must use the authorized current user id as the stored `user_id`.
- Hidden form fields may carry `itemId` and `dateKey`; they must not carry
  trusted ownership state.
- Cross-user tests are required because the database foreign key from
  `progress_logs.item_id` to `progress_items.id` does not by itself guarantee
  that `progress_logs.user_id` matches the item's owner.

## Data Test Requirements

- Add focused unit tests under `tests/unit/progress/**` or an equivalent focused
  path.
- Test date-key validation and fallback behavior using the existing Today date
  helper pattern.
- Test Progress read-model behavior for empty state, active items, completed
  logs, undone logs, archived items if implemented, and selected-date filtering.
- Test action/persistence helpers for create, complete, duplicate complete,
  undo, invalid date, missing item, and wrong-user item access.
- Test Today summary counts active items and completed logs for only the
  authorized user and selected date.
- Run at least:
  `npm run test -- tests/unit/progress`,
  `npm run test -- tests/unit/today`,
  `npm run typecheck`, and `npm run lint:minimal`.
- After the implementation branch creates the migration, run `npm run
  db:generate`, inspect the generated SQL and metadata, then run `npm run
  db:migrate` against local Postgres before full verification.

## UI/UX Requirements

- Use the shared page scaffold and existing quiet dashboard style.
- Keep the page dense and operational, not a marketing or gamified surface.
- Include empty, loading/pending, validation, and already-completed states.
- Keep controls obvious: create, complete, undo, previous day, next day, today.
- Do not use large decorative cards, badges, streak celebrations, or score copy
  that implies unbuilt analytics.
- Today's summary must stay small and not compete with the daily note or agenda.

## UI/UX Guidance

### Proposed Layout

- Replace the `/progress` placeholder with `AppPageShell`, `PageHero`,
  `PageGrid`, `PageGridItem`, `AllMeCard`, `PageSection`, `StatusPill`, and
  `MetricGrid`/`KeyValueRow` where useful.
- Hero:
  - Title: `Daily check-in`.
  - Subtitle should frame Progress as a lightweight daily record, not a habit
    engine or score system.
  - Right-side hero panel should show selected date, timezone, and a compact
    completed/total count using tabular numerals.
- Main grid:
  - Primary column: active item list for the selected day.
  - Support column: create-item form, date navigation, and a compact "Today
    state" summary.
- Date navigation should mirror Today's archive controls: `Previous day`,
  `Next day`, and `Today`. Use links for date navigation, not client-only state,
  so the selected day is shareable through `?date=YYYY-MM-DD`.
- On `/today`, replace the Daily Closeout planned-only pill with a small summary
  card: completed count, total active items, and one link to `/progress`.

### Component Boundaries

- Suggested new UI files:
  - `src/features/progress/components/progress-create-form.tsx`
  - `src/features/progress/components/progress-item-list.tsx`
  - `src/features/progress/components/progress-item-row.tsx` if the row logic is
    more than a few lines.
  - `src/features/progress/components/progress-date-controls.tsx` if date links
    are reused between page and support panel.
  - `src/features/progress/components/progress-summary-card.tsx` if Today and
    Progress share summary presentation.
- Keep `src/app/progress/page.tsx` server-rendered. It should resolve the page
  user, read page data, and compose the page from feature components.
- Keep form pending behavior in small client components using `useFormStatus`,
  matching existing Today/Notes form patterns.
- Do not create a generic task/habit component library in this slice.

### Empty States

- No progress items:
  - Show a dashed `var(--line)` / `var(--empty)` panel in the primary list.
  - Copy: `No progress items yet. Add one small daily check-in to start.`
  - Keep the create form visible and primary.
- Progress items exist, none completed for selected day:
  - Show rows normally with neutral unchecked state.
  - Summary copy can read `0 of N complete`.
- Today summary when no items exist:
  - Use `StatusPill` tone `neutral` with label `Not started`.
  - Link copy: `Open Progress`.
- Today summary when items exist but none are complete:
  - Show `0/N complete` and a neutral link to `/progress`.

### Loading/Pending States

- Create button:
  - Default copy: `Add item`.
  - Pending copy: `Adding...`.
  - Disable while pending.
- Complete button:
  - Default copy: `Complete`.
  - Pending copy: `Saving...`.
  - Disable while pending.
- Undo button:
  - Default copy: `Undo`.
  - Pending copy: `Saving...`.
  - Disable while pending.
- Avoid skeletons for the first server-rendered slice unless the Principal
  Engineer adds client-side refresh behavior later.
- Keep row height stable when pending text changes; buttons should have enough
  width for the longest label.

### Error States

- Validation errors should be inline and calm:
  - Empty create title: `Enter a progress item.`
  - Invalid date key: fall back to the user's local today and avoid rendering a
    blocking error page.
  - Missing or unauthorized item on mutation: server action should fail safely;
    UI can surface `Unable to update this item.` if action state is added.
- Do not expose raw database errors, ids, stack traces, provider identifiers, or
  auth details in UI copy.
- If action-state error handling is too large for this slice, leave errors to
  the route error boundary and keep focused tests around server-side guards.

### Button/Action Copy

- Primary create action: `Add item`.
- Row completion action: `Complete`.
- Completed row action: `Undo`.
- Date actions: `Previous day`, `Next day`, `Today`.
- Progress page link from Today: `Open Progress`.
- Avoid copy such as `streak`, `score`, `perfect day`, `habit`, `routine`, or
  `goal` unless a later slice explicitly introduces that product model.

### Accessibility Considerations

- Every form input needs a visible label or an `aria-label`; prefer a visible
  compact label for the create field.
- Completion state cannot depend on color alone. Use text and icons together:
  e.g. `Complete`/`Completed` plus a check icon.
- Date navigation links must have discernible text and preserve keyboard focus
  behavior.
- Pending buttons must use real `disabled` state.
- Use `aria-live="polite"` only for save/error feedback that changes without a
  full navigation.
- Ensure row titles truncate without hiding the action button on mobile.

### Design-System Constraints

- Follow `docs/ALLME_DESIGN_SYSTEM.md`: dark-first, calm, data-first, quick to
  scan, and progressive disclosure.
- Use existing tokens only: `var(--background)`, `var(--panel)`,
  `var(--panel-strong)`, `var(--empty)`, `var(--line)`, `var(--accent)`,
  `var(--success)`, `var(--warn)`, and `var(--danger)`.
- Use `var(--success)` only for completed status, not decorative emphasis.
- Keep rows denser than cards: roughly 12px vertical row padding and compact
  text.
- Do not add new colors, gradients, charts, confetti, decorative illustrations,
  or large celebratory status treatments.
- Keep Progress secondary to Today on `/today`; the daily note and agenda remain
  higher-priority surfaces.

### Files Principal Engineer Should Touch

- `src/app/progress/page.tsx`
- `src/features/progress/**` for new Progress queries, actions, and components
- `src/app/today/page.tsx` for the Daily Closeout summary composition
- `src/features/today/queries.ts` for the Today summary read model
- Focused tests under `tests/unit/progress/**` and `tests/unit/today/**`

### UI Risks And Deferrals

- Risk: the Progress page can accidentally feel like a full habit product. Keep
  copy and controls limited to item plus selected-day completion.
- Risk: Today can get crowded. Render only one compact summary block with one
  link.
- Risk: completion rows can become visually noisy if every row uses high-contrast
  success styling. Prefer neutral rows with a small completed indicator.
- Defer search, filters, categories, recurrence/cadence, streaks, weekly charts,
  scorecards, item editing, item deletion, and archive management UI.
- Defer mobile-specific optimization beyond responsive wrapping and non-overlap
  checks.

## Implementation Plan

1. Data/DB: add Progress schema and one migration generated through the existing
   Drizzle workflow. This should run before Principal Engineer implementation so
   query/action code can import stable table definitions.
2. Principal Engineer: add Progress date helpers, queries, and server actions
   for create, complete, and undo.
3. Principal Engineer + UI/UX: replace the Progress placeholder with the daily
   check-in surface.
4. Principal Engineer: add a read-only Today progress summary query and render it
   in the existing Daily Closeout card.
5. QA: add focused unit tests for date scoping, query read models, and mutation
   invariants; run the validation commands below.
6. Release Integrator: check migration order/metadata and run final validation
   before PR/release if this is merged alongside other work.

## Test Plan

- Unit-test local-date behavior around Today/Progress date keys.
- Unit-test progress read-model behavior for empty state, active items, completed
  logs, and cross-user isolation.
- Unit-test server action or persistence helper behavior for create, complete,
  undo, duplicate complete, and wrong-user access.
- Manually verify `/progress` and `/today` against local dev data after
  migration.

## Acceptance Criteria

- `/progress` is no longer a placeholder.
- A signed-in owner can create one simple progress item.
- The item can be marked complete and undone for a selected local date.
- Duplicate completion attempts do not create duplicate effective logs.
- A different user cannot read or mutate another user's Progress rows.
- `/today` shows a compact read-only Progress summary for the selected date and
  links to `/progress`.
- No Finance files, Calendar provider-write files, auth boundary files, package
  files, or unrelated migrations are changed.

## Validation Commands

```bash
npm run db:generate
npm run db:migrate
npm run lint:minimal
npm run typecheck
npm run test -- tests/unit/progress
npm run test -- tests/unit/today
npm run verify
```

If focused Progress tests are colocated differently, replace
`tests/unit/progress` with the actual focused test path.

## Risks

- Schema scope can expand into a habit/task engine; keep only item plus daily log.
- Today can become cluttered; keep the integration read-only and summary-sized.
- Migration metadata conflicts are possible if another DB lane is active.
- Timezone mistakes can log a completion to the wrong local day.
- Server actions must enforce owner scoping, not rely on hidden form fields.
- A `progress_logs.item_id` foreign key alone is not enough to prove same-user
  ownership; mutation queries must join or pre-check `progress_items.user_id`.
- Keeping undone rows with `completed_at = null` is simple but can skew counts if
  a future query forgets the `completed_at is not null` predicate.
- Hand-editing Drizzle migration metadata would create release risk; generate
  the migration from schema changes in the implementation branch.

## Deferrals

- Recurring habits, cadence rules, reminders, streaks, scorecards, workouts,
  tasks/chores, weekly review analytics, and Notes/Calendar linking.
- Archival or deletion workflows beyond an optional `archived_at` field if the
  implementation needs a low-risk way to hide seed/test items.
- Home dashboard Progress summary.

## Required Agents

- Data/DB: required for schema and migration ownership.
- UI/UX: required for the first real `/progress` interaction design and Today
  summary fit.
- Principal Engineer: required for implementation.
- QA Reviewer: required before merge because this adds a new persisted domain.
- Release Integrator: lightweight pass recommended if the migration is merged
  near other branches; otherwise not a separate workstream.

## Protected Files

- `src/features/finance/**`
- `src/app/finance/**`
- `src/features/calendar/provider-write/**`
- `src/features/calendar/integrations/**`
- `src/features/calendar/sync/**`
- `src/server/auth/**`
- `proxy.ts`
- `package.json`
- `package-lock.json`
- `eslint*.config.*`
- Existing unrelated migrations and `db/migrations/meta/**` except the metadata
  produced by the single assigned Progress migration.
- During Data/DB implementation, protect `src/server/db/schema.ts`,
  `db/migrations/**`, and `db/migrations/meta/**` from parallel edits by other
  roles until the Progress migration lands.
