# AllMe Roadmap

This roadmap reflects the current state after the finance-first prototype work. It supersedes the original linear plan where finance was expected to arrive after shell, notes, and calendar.

## Current Position

AllMe is no longer just in the planning phase. It has:

- a working Next.js/Postgres foundation
- a real Fintable-backed finance import path
- a finance dashboard prototype with categorization, account pages, filters, and tag/rule management
- a documented design direction

The project is not yet a personal operating system because the cross-app shell, Today view, notes, calendar, progress, and settings surfaces are not real product flows yet.

## Immediate Product Rule

Do not keep expanding Finance until the app has a stable shell and domain boundaries.

Finance can receive bug fixes and small cleanup, but new finance capability should wait until:

- the route shell exists
- settings/integration boundaries are defined
- the large finance client components are split
- finance calculations have extracted tests

## Revised Milestones

### Milestone 1: App Shell And Product Boundaries

Goal: make AllMe feel like one app instead of a single finance page.

Ship:

- persistent navigation for Today, Finance, Notes, Calendar, Progress, and Settings
- placeholder pages for unbuilt domains
- updated homepage/dashboard framing
- route and layout conventions for future features
- clear owner-mode assumption for the first personal build

Acceptance criteria:

- navigation is available from every page
- unbuilt product areas have intentional placeholders, not 404s
- the finance page sits inside the same shell as the rest of the app
- project docs identify current and next milestones accurately

### Milestone 2: Settings, Identity, And Integrations

Goal: stop hiding core configuration in local env and scripts.

Ship:

- owner settings page `(first slice shipped)`
- timezone and preferred currency view/edit flow `(first slice shipped)`
- Fintable integration status page `(first slice shipped)`
- Google Sheets/Fintable sync health display `(first slice shipped)`
- route protection/auth decision for local owner mode vs future hosted mode `(enforcement slice shipped)`

Acceptance criteria:

- user settings persist in Postgres
- integration health is understandable without reading terminal output
- finance sync state and failures are visible inside the app
- future Google Calendar setup has a clear settings home

### Milestone 3: Today And Daily Notes

Goal: create the actual personal operating surface.

Ship:

- `/today` daily command view
- daily note auto-created by date
- quick capture inbox
- lightweight review prompts
- finance snapshot embedded as a small supporting module

Acceptance criteria:

- opening `/today` gives a useful daily view even before calendar/progress exist
- notes persist and can be revisited by date
- quick capture has a defined inbox state
- the page does not depend on finance being the primary task

### Milestone 4: Calendar Integration

Goal: make schedule context available to Today.

Ship:

- Google Calendar connection flow
- calendar sync run tracking
- event cache tables
- agenda and week views
- event-linked notes foundation

Acceptance criteria:

- events sync idempotently
- sync failures are visible
- Today shows agenda data from the app database, not directly from Google
- Calendar event-linked notes are local AllMe relationships and do not mutate
  Google Calendar
- event notes are one-note-per-event local workspaces that can be edited from
  Calendar or Notes and deleted to remove the relationship

### Milestone 5: Finance Hardening

Goal: convert the finance prototype into a maintainable module.

Ship:

- split `recent-transactions.tsx` into smaller components/hooks
- extract and test dashboard metric calculations
- server-side full-history tag/rule preview
- import/reconciliation page
- ignore/blocklist support for locally deleted or intentionally excluded rows
- holdings/net-worth modeling pass

Acceptance criteria:

- dashboard totals are covered by unit tests
- tag/rule preview is not limited to the currently loaded transaction list
- deleted/ignored rows do not reappear unexpectedly after sync
- finance pages remain understandable without terminal/database inspection

### Milestone 6: Progress Tracking

Goal: track personal completion and activity.

Ship:

- habits
- tasks/chores
- workout/activity logs
- daily scorecard
- weekly review summary

Acceptance criteria:

- daily completion is fast to log
- weekly review can compare planned vs completed activity
- Today can show progress without becoming cluttered

### Milestone 7: Productization And Backup

Goal: make the system safe to rely on.

Ship:

- export/backup flows
- audit trails for destructive actions
- better onboarding
- deployment plan
- stronger auth/multi-user boundaries if the app expands beyond personal use

Acceptance criteria:

- core data can be exported
- destructive actions are traceable
- the app can be deployed without depending on local-only assumptions

## Engineering Guardrails

- Keep commits focused and verified.
- Prefer vertical slices, but stop when a slice creates cross-domain debt.
- Do not let any single client component grow past a maintainable size without a refactor plan.
- Keep third-party integrations as adapters; app-owned Postgres remains the source of truth.
- Treat Finance as one module of AllMe, not the center of the product.
