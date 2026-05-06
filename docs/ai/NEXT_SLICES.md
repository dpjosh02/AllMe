# AI Next Slices

This is the PM-owned queue for candidate work. Keep it short and link to
canonical docs instead of copying roadmap, design, auth, provider-write, or
quality-tooling guidance.

Each candidate should stay compact: milestone, why now, user value, risk,
required roles, likely files, acceptance criteria, and non-goals. Do not copy
the canonical roadmap or safety contracts here.

Protected files are inherited from `AGENTS.md` and `docs/ai/WORKSTREAMS.md`.
Call out additional protected files only when a candidate has a special
boundary.

## Active Slice

None selected. The Product Manager should choose the next slice before opening a
new implementation workstream.

## Ready Candidates

### Calendar-Backed Today Agenda

- Milestone: 3/4, Today and Calendar Integration.
- Why now: Today already has daily notes and an agenda placeholder; Calendar
  has cached events and local review state.
- User value: `/today` becomes a daily command view with real schedule context.
- Risk: medium; must read cached Calendar data only and avoid provider writes.
- Required roles: Product Manager, UI/UX, Principal Engineer, QA Reviewer.
- Likely files: `src/app/today/**`, `src/features/today/**`,
  `src/features/calendar/agenda-*`, focused tests.
- Special boundary: no provider-write, migration, auth, or finance-import edits.
- Acceptance criteria: Today shows a small agenda from app-owned cached data,
  handles empty/loading/error states, and does not call Google directly.
- Non-goals: provider writes, new Calendar schema, recurrence editing, Finance
  expansion.

### Notes Capture Detail Follow-Through

- Milestone: 3, Today and Daily Notes.
- Why now: Captures have L2 pages; the next note layer should stay narrow before
  tags/backlinks.
- User value: quick captures become easier to review, edit, complete, and
  restore across Today and Notes.
- Risk: low to medium; mostly UI and existing note persistence.
- Required roles: Product Manager, UI/UX, Principal Engineer, QA Reviewer.
- Likely files: `src/app/notes/**`, `src/features/notes/**`,
  `src/features/today/**`, focused tests.
- Special boundary: no schema, migration, auth, provider-write, or finance-import edits.
- Acceptance criteria: capture detail workflows are clear, reversible, and
  consistent between Notes and Today.
- Non-goals: backlinks, tag system, rich-text editor, new dependencies.

### First Progress Logging Slice

- Milestone: 6, Progress Tracking.
- Why now: Progress remains the thinnest product surface and should become a
  real flow before deeper Finance work resumes.
- User value: the app can record a small daily completion signal and later feed
  Today.
- Risk: medium to high; likely needs schema and a narrow domain model.
- Required roles: Product Manager, Architect, Data/DB, UI/UX, Principal
  Engineer, QA Reviewer.
- Likely files: `docs/architecture/**`, `src/app/progress/**`,
  `src/features/progress/**`, `src/server/db/schema.ts`, `db/migrations/**`.
- Special boundary: one Data/DB-owned migration lane; no finance-dashboard,
  finance-import, calendar-provider-write, auth, or unrelated migration edits.
- Acceptance criteria: one simple progress item can be created, logged for a
  day, and shown without cluttering Today.
- Non-goals: full habit engine, scoring system, workouts, analytics.

## Deferred

### Finance Full-History Rule Preview

- Milestone: 5, Finance Hardening.
- Why now: valuable, but defer unless user explicitly prioritizes Finance.
- User value: tag/rule previews stop being limited to loaded transactions.
- Risk: medium; server-side finance behavior and tests required.
- Required roles: Product Manager, Data/DB, Principal Engineer, QA Reviewer.
- Likely files: `src/features/finance/**`, focused finance tests.
- Special boundary: requires explicit user prioritization before activation.
- Acceptance criteria: preview uses full app-owned history and remains safe to
  rerun.
- Non-goals: new finance capability beyond hardening, new data providers.

### Finance Import Reconciliation And Ignore List

- Milestone: 5, Finance Hardening.
- Why now: local transaction deletion can be undone by future Fintable syncs
  unless ignored/deleted source rows are tracked persistently.
- User value: import results become easier to audit and intentionally excluded
  rows do not reappear unexpectedly.
- Risk: medium to high; import idempotency, auditability, and database behavior
  are safety-critical.
- Required roles: Product Manager, Data/DB, Principal Engineer, QA Reviewer.
- Likely files: `docs/finance/**`, `src/features/finance/imports/**`,
  `src/server/db/schema.ts`, `db/migrations/**`, focused finance tests.
- Special boundary: requires explicit user prioritization before activation and
  one Data/DB-owned migration lane.
- Acceptance criteria: ignored/deleted source rows are auditable, safe to rerun
  through imports, and visible enough to diagnose without raw provider output.
- Non-goals: new finance providers, budgeting automation, money movement,
  brokerage trading.

### Finance Rule Management Follow-Through

- Milestone: 5, Finance Hardening.
- Why now: custom text rules can be created, but deeper rule editing and a
  dedicated category review workflow remain hardening work.
- User value: finance cleanup becomes more understandable without terminal or
  database inspection.
- Risk: medium; server-side preview and existing manual overrides must remain
  safe.
- Required roles: Product Manager, UI/UX, Principal Engineer, QA Reviewer.
- Likely files: `src/features/finance/**`, focused finance tests.
- Special boundary: requires explicit user prioritization before activation; no
  finance import or schema changes unless routed to Data/DB.
- Acceptance criteria: user-created rules can be reviewed and maintained without
  overwriting manual assignments.
- Non-goals: new finance capability beyond hardening, new dependencies, new
  data providers.

## Blocked

### Real This-Event-Only Recurrence Smoke

- Milestone: 4, Calendar Integration.
- Why now: should happen before expanding recurrence writes.
- User value: validates that the guarded recurrence write path works against a
  safe real occurrence.
- Risk: high; real provider mutation and user-owned data.
- Required roles: Product Manager, QA Reviewer, Release Integrator.
- Likely files: smoke notes only unless a bug is found.
- Special boundary: provider-write implementation remains read-only unless the
  smoke exposes a concrete defect.
- Acceptance criteria: a real upcoming writable recurring occurrence with
  `original_start_at` is used and results are documented without secrets.
- Non-goals: this-and-following edits, entire-series edits, recurrence creation.

## Recently Completed

- Today vertical slice: daily note, quick capture, archive navigation, and
  recent notes support.
- Notes vertical slice: capture inbox, detail pages, search/filter/density, and
  restore flow.
- Calendar recurrence guardrails: this-event-only UI/action support with smoke
  caveat documented in `docs/DEVELOPMENT_STATUS.md`.
