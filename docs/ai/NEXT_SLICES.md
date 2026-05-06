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

No active implementation slice is selected.

## Ready Candidates

No ready candidate is selected.

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
- Calendar-backed Today agenda: `/today` reads selected, non-deleted cached
  Calendar events through the Calendar agenda read model without direct Google
  reads or provider writes.
- Calendar recurrence guardrails: this-event-only UI/action support with smoke
  caveat documented in `docs/DEVELOPMENT_STATUS.md`.
- First Progress Check-In: `/progress` supports one lightweight daily completion
  flow with a read-only Today summary.
- Notes Capture Detail Follow-Through: capture detail edit, complete, restore,
  and return navigation now align across Notes and Today with focused Notes
  tests.
- Today Finance Snapshot: `/today` now embeds a compact read-only Finance
  support card backed by existing app-owned Postgres data.
