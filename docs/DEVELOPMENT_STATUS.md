# Development Status

This document records project-facing progress and workflow decisions. It should not contain personal notes, credentials, account names, balances, merchants, or transaction details.

## Current State

AllMe has a working foundation and a first finance read path.

Implemented:

- Next.js app foundation with TypeScript, Tailwind, ESLint, Vitest, Playwright config, Drizzle, and GitHub Actions.
- PostgreSQL schema and migrations for users, notes, finance connections, import runs, raw records, accounts, balance snapshots, holdings snapshots, and transactions.
- Fintable Google Sheets contract for `Accounts` and `Transactions`.
- Private Google Sheets access through a Google service account.
- Fintable dry-run command that reads and parses the private sheet without printing financial details.
- Fintable import command that writes parsed data into PostgreSQL.
- First `/finance` dashboard backed by imported Postgres data.
- Toggleable light/dark theme control in the top-right corner of the app.
- Finance dashboard account filtering for recent transactions.
- Positive monetary values render green and negative monetary values render red.
- Finance categorization analysis documented in `docs/finance/CATEGORIZATION_ANALYSIS.md`.
- Finance categorization database tables, default rules, assignment script, import hook, and `/finance` category badges.
- Recent Transactions calendar date-range filter that composes with account filtering.
- Finance display cleanup for institution labels and category badges.
- Local synthetic finance test-data scripts for stress testing transactions and balance history.
- Persistent account display names that survive future Fintable imports.
- Dashboard metric lookback control for Transactions, Inflows, Outflows, and Categorized cards.
- In-app Fintable sync button on `/finance`.

## Verified Local Import

First real Fintable import succeeded against local Postgres.

Imported counts:

```text
Accounts upserted: 6
Balance snapshots upserted: 6
Transactions upserted: 115
Raw records upserted: 121
Unmatched transactions skipped: 0
```

Database count check:

```text
accounts: 6
transactions: 115
raw_records: 121
import_runs: 1
```

## Current Local Services

- Local Postgres runs in Docker as `allme-postgres`.
- App dev server runs with `npm run dev`.
- Existing dev server may already be on `http://localhost:3000`.
- The `/finance` route reads from the local Postgres database configured by `DATABASE_URL`.

## Key Commands

```bash
npm run verify
npm run build
npm run db:migrate
npm run finance:fintable:dry-run
npm run finance:fintable:import
npm run finance:categorize
npm run finance:test-data:seed
npm run finance:test-data:clear
npm run dev
```

## Current Categorization Status

Local categorization has been applied to the first imported Fintable transaction set.

Assignment counts:

```text
rule: 112
uncategorized: 3
```

Category coverage:

```text
Investing: 34
Transfers: 19
Shopping And Lifestyle: 16
Ordering Out: 15
Credit Card Payments: 8
Transportation: 6
Medical: 5
Entertainment: 4
Groceries: 4
Income: 1
Uncategorized: 3
```

The assignment system currently preserves manual overrides by only allowing automated categorization to update non-manual assignments.

## Recent UI Progress

Recent finance dashboard work:

- Dark/light theme toggle remains global in `src/components/theme/theme-toggle.tsx`.
- Recent Transactions is a client component at `src/features/finance/dashboard/components/recent-transactions.tsx`.
- Account filtering uses an in-component `Set` of selected account names and supports select all/deselect all.
- Date filtering now uses a calendar popover with an inclusive `afterDate` and `beforeDate` range.
- If the same date is selected twice, the filter returns transactions from that day only.
- Account filtering and date filtering are composed in the same transaction filter pass.
- The finance dashboard query now fetches up to 1000 recent rows so date filtering has enough local data to operate on.
- Account institution labels strip Fintable suffixes such as `(Connection-1...)` for display only.
- Recent transaction subtext now shows only the originating account; assigned category appears as a badge without the assignment source label.
- Account cards can be renamed locally. The original Fintable account name is preserved in `finance_accounts.name`; the local alias is stored in `finance_accounts.display_name`.
- Fintable imports continue updating source account names but do not overwrite local display aliases.
- Recent Transactions account filtering uses account ids, not display names, so renaming accounts does not break filters.
- Top dashboard transaction metrics are controlled by a `Lookback` popover with manual days, weeks, months, and years inputs.
- The lookback window applies from the computed past date through today and affects Transactions, Inflows, Outflows, and Categorized counts.
- The finance page includes a `Sync Fintable` button beside import status. It reads the configured Google Sheet, runs the existing Fintable import pipeline, reruns categorization, and refreshes `/finance`.

Verified after this work:

```text
npm run verify
npm run build
Live browser test on http://localhost:3000/finance
```

## Synthetic Test Data

Synthetic finance test data is local-only and should not be written back to Fintable or Google Sheets.

Implemented commands:

```bash
npm run finance:test-data:seed
npm run finance:test-data:clear
```

The seed command uses existing imported accounts as anchors and generates:

- deterministic synthetic transactions tagged with `source_type = synthetic_test_data`
- deterministic synthetic raw records tagged with `provider = synthetic_test_data`
- daily historical balance snapshots for account-growth experiments
- categorization assignments by rerunning the normal finance categorization service

Current local synthetic seed result:

```text
Synthetic transactions: 521
Synthetic balance snapshots: 4380
Synthetic raw records: 4901
Total transaction rows after seed: 636
Distinct balance snapshot dates after seed: 731
Balance snapshot range after seed: 2024-04-25 to 2026-04-25
```

The dashboard account query now reads only each account's latest balance snapshot. This prevents duplicated account rows when historical balance snapshots exist.

## Current Git History

Recent project milestones:

```text
759580d Add transaction date range filter
2acdff8 Add finance categorization system
818acdf Document finance categorization analysis
51ab26e Make recent transactions scrollable
df22f5a Enforce finance amount colors
3e0cfc0 Fix finance theme and amount colors
23963d3 Fix theme toggle hydration
a902316 Add finance filters and theme toggle
a583af2 Document finance import progress
0ab41eb Add finance dashboard page
93eb9c9 Fix Fintable import setup
30673f2 Load local env in Drizzle config
c1bbe50 Add Fintable database import pipeline
649799b Support private Fintable sheet access
a4b31da Add Fintable Google Sheets reader
bc605ba Add Fintable sheet parsing contract
24e7cc2 Scaffold milestone zero foundation
aa4df6f Initial project blueprint
```

## Near-Term Next Steps

1. Add category filtering to Recent Transactions.
2. Add a category review UI for uncategorized transactions.
3. Add a category/rule editor UI.
4. Consider moving transaction filtering server-side once the dataset grows beyond a few hundred rows.
5. Add app navigation so `/`, `/finance`, and future sections share one shell.
6. Add a finance account detail page.
7. Add a visible import status/history page.
8. Move from manual import command to a controlled in-app import trigger.
