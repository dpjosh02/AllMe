# AllMe Project Blueprint

## Product Definition

AllMe is a personal operating system for:

- daily notes and reflection
- calendar and schedule visibility
- finance tracking, planning, and reporting
- progress tracking across health, habits, tasks, and routines

The first release is a personal dashboard for one user. The architecture should stay ready for future multi-user support, but not at the expense of speed or simplicity in the first build.

## Product Goals

### Primary Goals

1. Give one clear place to see the current state of life: today, money, plans, and progress.
2. Reduce friction for daily capture and weekly review.
3. Make finance data trustworthy by importing and normalizing it into an app-owned database.
4. Keep the system modular so integrations can change without rewriting the app.

### Non-Goals For The First Release

- advanced budgeting automation
- bill pay or money movement
- tax tooling
- brokerage trading
- social features
- shared household workflows

## Guiding Principles

1. The app database is the source of truth.
2. Third-party integrations are adapters, not core state.
3. Financial imports must be idempotent and auditable.
4. Build in vertical slices that can ship independently.
5. Prefer simple infrastructure until the product proves it needs more.
6. Design for future multi-user support without introducing multi-tenant complexity everywhere on day one.

## Recommended Stack

### Application

- `Next.js` with the App Router
- `TypeScript` in strict mode
- `React`
- `Tailwind CSS` with local design tokens
- `Radix UI` primitives where accessible headless components are useful

### Data And Auth

- `PostgreSQL`
- `Drizzle ORM`
- `Auth.js` with Google sign-in

### Background Work

- scheduled sync jobs triggered by the deployment platform
- database-backed job run tracking for visibility and retries

### Quality Tooling

- `ESLint`
- `Prettier` or `Biome`
- `Vitest`
- `Playwright`
- `GitHub Actions`

## Architecture Overview

```text
Fintable -> Google Sheets -> AllMe import worker -> PostgreSQL -> AllMe dashboards
Google Calendar -> Calendar sync worker -> PostgreSQL -> Today / Calendar views
Manual CSV import -> Import pipeline -> PostgreSQL -> Finance views
User input -> Next.js app -> PostgreSQL -> Notes / Progress / Tasks views
```

## Core Domains

### 1. Identity And Settings

Owns:

- user profile
- timezone
- preferred currency
- connected integrations
- import settings
- dashboard layout preferences

### 2. Notes

Owns:

- daily notes
- freeform pages
- quick capture
- backlinks or lightweight references
- weekly and monthly review pages

### 3. Calendar

Owns:

- Google Calendar connection
- synced event cache
- daily agenda
- weekly calendar view
- event-linked notes

### 4. Finance

Owns:

- financial accounts
- balance history
- transactions
- categories and category rules
- holdings snapshots
- recurring expenses
- monthly summaries
- import history and reconciliation

### 5. Progress

Owns:

- habits
- workouts
- health metrics
- completed tasks
- streaks
- custom metrics

## Finance Strategy

### Chosen Direction

Use `Fintable` as the finance ingestion layer and keep `PostgreSQL` as the source of truth for the app.

### Why

- Fintable reduces the operational and compliance burden of direct aggregator integration.
- The website stays in control of reporting, organization, and future product logic.
- Manual imports remain available as a fallback for institutions or data types that need extra detail.

### Initial Finance Ingestion Path

1. Fintable syncs connected accounts into `Google Sheets`.
2. AllMe reads the configured spreadsheet tabs on a schedule.
3. Raw rows are stored unchanged in `finance_raw_records`.
4. A normalization pipeline maps rows into internal finance tables.
5. Derived reports and dashboard cards read from normalized tables only.

### Finance Source Rules

- Never use spreadsheet rows directly in user-facing pages.
- Preserve the provider payload for every imported record.
- Every import must be safe to rerun without creating duplicates.
- Every normalized transaction and holding should carry a source fingerprint.
- Manual CSV imports should flow through the same normalization pipeline.

### Investment Coverage Plan

Because investment support may differ by account provider, the finance system should support both:

- automated holdings and transaction imports from Fintable-fed sources
- manual CSV import for brokerage detail, correction, or backfill

## Proposed Data Model

### Identity

- `users`
- `user_settings`
- `integration_connections`

### Notes

- `notes`
- `daily_notes`
- `note_links`
- `note_tags`

### Calendar

- `calendar_connections`
- `calendar_calendars`
- `calendar_events`
- `calendar_sync_runs`

### Finance

- `finance_connections`
- `finance_accounts`
- `finance_balance_snapshots`
- `finance_transactions`
- `finance_transaction_categories`
- `finance_transaction_rules`
- `finance_holdings_snapshots`
- `finance_import_runs`
- `finance_raw_records`
- `finance_reconciliation_issues`

### Progress

- `habits`
- `habit_logs`
- `workouts`
- `health_metrics`
- `tasks`
- `task_completions`
- `daily_scorecards`

## Key Finance Table Notes

### `finance_raw_records`

Stores original provider rows plus:

- provider name
- source sheet or file name
- imported at timestamp
- row hash
- payload json

### `finance_import_runs`

Tracks:

- import trigger
- start and finish time
- status
- rows scanned
- rows inserted
- rows updated
- rows skipped
- error summary

### `finance_transactions`

Fields should include:

- account id
- source fingerprint
- posted date
- effective date
- amount
- currency
- description
- merchant
- category
- status
- source type
- raw record id

### `finance_holdings_snapshots`

Fields should include:

- account id
- symbol or instrument name
- quantity
- unit price
- market value
- cost basis when available
- snapshot date
- raw record id

## Application Surfaces

### `/`

Home dashboard with:

- today summary
- upcoming calendar items
- quick note entry
- account balance snapshot
- recent spending
- habit completion summary

### `/today`

Single-page daily operating view:

- daily note
- today agenda
- task list
- quick finance snapshot
- progress check-in

### `/notes`

- daily notes archive
- linked notes
- weekly and monthly review pages

### `/calendar`

- agenda view
- weekly view
- event details
- note links

### `/finance`

- overview
- accounts
- transactions
- categories
- recurring spend
- investments
- monthly reports
- imports and reconciliation

### `/progress`

- habits
- workouts
- metrics
- streaks
- scorecards

### `/settings`

- profile
- integrations
- Google Calendar connection
- Fintable sheet mapping
- import controls

## Repository Structure

```text
AllMe/
├── README.md
├── .gitignore
├── docs/
│   └── PROJECT_BLUEPRINT.md
├── src/
│   ├── app/
│   ├── components/
│   ├── features/
│   ├── lib/
│   ├── server/
│   └── styles/
├── db/
│   ├── schema/
│   ├── migrations/
│   └── seeds/
├── jobs/
├── public/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── scripts/
```

## Delivery Plan

### Milestone 0: Repo Foundation

Ship:

- Next.js app scaffold
- TypeScript config
- lint and format config
- test setup
- Postgres and Drizzle wiring
- auth scaffold
- GitHub Actions pipeline

Acceptance criteria:

- local app boots
- CI runs lint, typecheck, and tests
- database migration flow works end to end

### Milestone 1: App Shell And Identity

Ship:

- app layout
- navigation
- home dashboard shell
- Google sign-in
- user settings

Acceptance criteria:

- user can sign in
- protected routes work
- timezone and profile settings persist

### Milestone 2: Notes And Daily Flow

Ship:

- daily notes
- quick capture
- notes index
- today page scaffold

Acceptance criteria:

- daily note auto-creates by date
- user can edit and revisit prior entries
- quick capture lands in inbox state

### Milestone 3: Calendar Integration

Ship:

- Google Calendar connection
- event sync worker
- agenda and week views
- event-linked note references

Acceptance criteria:

- events sync reliably
- sync run history is visible
- today page shows agenda correctly

### Milestone 4: Finance Ingestion

Ship:

- Fintable settings
- Google Sheets import worker
- raw record storage
- normalized accounts and transactions
- manual CSV import fallback

Acceptance criteria:

- imports are idempotent
- failed imports are diagnosable
- account and transaction data appears in the app

### Milestone 5: Finance Dashboards

Ship:

- finance overview
- accounts page
- transaction list and filters
- category management
- recurring spend detection
- holdings snapshot page

Acceptance criteria:

- balances and transactions reconcile to imported data
- dashboard totals are test-covered
- category rules can be applied safely

### Milestone 6: Progress Tracking

Ship:

- habits
- workouts
- metric tracking
- daily scorecard

Acceptance criteria:

- daily completion is easy to log
- weekly progress can be reviewed quickly

### Milestone 7: Hardening And Productization

Ship:

- audit trails
- backup/export flows
- improved onboarding
- role and ownership boundaries for future multi-user support

Acceptance criteria:

- core data can be exported cleanly
- user-facing failures are understandable
- row ownership assumptions are explicit in the schema

## Testing Strategy

### Unit Tests

Cover:

- finance normalization
- transaction categorization
- date and timezone logic
- dashboard summary calculations

### Integration Tests

Cover:

- auth flows
- Google Calendar sync
- Fintable sheet import parsing
- CSV import parsing
- database writes for import reruns

### End-To-End Tests

Cover:

- sign in
- create and edit daily note
- view synced events
- run a finance import
- review finance dashboard output

## Security And Privacy Baseline

- store all secrets in environment variables or the deployment platform secret store
- do not store bank credentials in the app
- keep finance import payloads restricted to authenticated owner access
- add row ownership fields from the start
- log import actions and failures for auditability

## Git And Release Workflow

- one GitHub repository for the app
- `main` as the default branch
- short-lived feature branches
- pull requests for meaningful milestones
- GitHub Actions required before merge
- small, reviewable commits over large dumps of work

## Immediate Next Step

Build `Milestone 0` and get the repo into a runnable state before adding product features.
