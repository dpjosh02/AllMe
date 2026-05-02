# Development Status

This document records project-facing progress and workflow decisions. It should not contain personal notes, credentials, account names, balances, merchants, or transaction details.

## Current State

AllMe has a working foundation and a substantial finance-first prototype. The project is now entering an architecture reset to establish the full personal operating-system shell before Finance expands further.

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
- Dashboard metric lookback control for Transactions, Credits, Debits, Income, Spending, and Categorized cards.
- In-app Fintable sync button on `/finance`.
- Transaction search in Recent Transactions.
- Uncategorized review entry point from the Categorized metric card.
- Fidelity core/cash-reserve sweep handling so automatic settlement mechanics do not distort spending, income, or deliberate investment behavior.
- Account detail pages at `/finance/accounts/[accountId]`.
- Transaction detail modal with raw Fintable/Plaid category context.
- First self-serve transaction tagging flow.
- Revised roadmap captured in `docs/ROADMAP.md`.
- First app shell slice with persistent navigation and intentional placeholder routes for Today, Notes, Calendar, Progress, and Settings.
- First Settings foundation slice with owner preferences, timezone/currency persistence, read-only Fintable/Auth integration status, and Fintable sync health visibility.
- First auth-boundary decision slice documented in `docs/architecture/AUTH_BOUNDARY.md` and surfaced in Settings.

## Verified Local Import

The first real Fintable import succeeded against local Postgres and later syncs expanded the local dataset.

Initial import counts:

```text
Accounts upserted: 6
Balance snapshots upserted: 6
Transactions upserted: 115
Raw records upserted: 121
Unmatched transactions skipped: 0
```

Current transaction/categorization snapshot:

```text
transactions analyzed: 3441
rule-categorized: 3253
uncategorized: 188
investment sweep rows: 161
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

Local categorization has been applied to the current imported Fintable transaction set.

Assignment counts:

```text
rule: 3253
uncategorized: 188
```

Category coverage:

```text
Transfers: 783
Ordering Out: 675
Shopping And Lifestyle: 347
Investing: 309
Credit Card Payments: 307
Transportation: 253
Uncategorized: 188
Investment Sweep: 161
Medical: 153
Entertainment: 144
Groceries: 114
Income: 7
```

The assignment system currently preserves manual overrides by only allowing automated categorization to update non-manual assignments.

Fidelity core-position and money-market settlement rows are classified as `Investment Sweep`. These rows represent automatic cash-reserve mechanics around brokerage settlement, not user spending, income, or deliberate investment allocation. The category is excluded from income and spending metrics.

Cash-flow summary cards now include only categories explicitly marked for income or spending. Transfers, credit-card payments, investing, investment sweeps, and uncategorized transactions are excluded from inflow/outflow totals until they are intentionally categorized into income or spending categories.

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
- The lookback window applies from the computed past date through today and affects Transactions, Credits, Debits, Income, Spending, and Categorized counts.
- Credits and Debits are raw sign-based transaction movement. Income and Spending are category-aware cash-flow totals based on each AllMe tag's behavior.
- The finance page includes a `Sync Fintable` button beside import status. It reads the configured Google Sheet, runs the existing Fintable import pipeline, reruns categorization, and refreshes `/finance`.
- Account imports are keyed by Fintable source account id. If Fintable changes a source account id for an existing account name, the importer merges into the existing account instead of creating a duplicate or failing on account name uniqueness.
- Recent Transactions includes a search input for finding transactions by description/name.
- The Categorized metric card includes a `Review` action when uncategorized transactions exist. Clicking it switches Recent Transactions into an uncategorized-only review mode.
- Recent Transactions filter controls render as a dedicated row under the section header so the header does not collapse awkwardly beside Accounts.
- The Balance Sheet panel owns the active account count in its header; the top dashboard metric strip excludes the former Accounts card.
- The Recent Transactions ledger includes a fixed footer showing net spend/income for the currently filtered transaction set.
- The Manage Tags modal uses inline icon actions for edit and delete on each tag row.
- Recent Transactions rows open a detail modal that shows displayed transaction information plus selected raw response category and description fields.
- The transaction detail modal includes a local database delete action with an in-modal confirmation warning and a browser-local "do not show again" preference.
- Current delete behavior removes the local transaction row only. A future Fintable sync can re-import the row unless a persistent ignore/blocklist table is added.
- Account cards on the finance L1 page navigate to account detail pages instead of exposing inline rename controls.
- Account display-name editing now lives on the account L2 page.
- Calendar, account, and lookback dropdowns close when the user taps outside their border.
- Recent Transactions includes a tag manager entry point from the ellipsis button.
- The tag manager can create user-owned tags with a name, color, and cash-flow behavior: spending, income, or neutral.
- The transaction detail modal's AllMe Category section is interactive and can manually assign an existing tag to that transaction.
- Manual transaction category assignments use source `manual`, which preserves them from automated rule recategorization.
- The tag manager can edit tag name, color, and cash-flow behavior.
- The tag manager can delete tags after an in-modal confirmation. Existing assignments for that tag become uncategorized.
- Recent Transactions can be filtered by assigned category, including Uncategorized.
- The tag manager edit view can preview/apply a tag to loaded transactions by a selected transaction field and match terms.
- The tag manager edit view can create custom text rules from user-entered match terms such as `food, restaurant, beverage, cafe`.
- Custom text rules are saved to `finance_category_rules` and are also applied immediately to matching transactions loaded in the Recent Transactions component.
- Current custom-rule preview/application is scoped to the transactions loaded into the Recent Transactions component. Full-history server-side rule preview is still a future layer.

## App Shell Reset

The architecture reset has started. The app now has a persistent shell around every route:

- desktop sidebar navigation
- mobile horizontal navigation
- routes for `/today`, `/notes`, `/calendar`, `/progress`, and `/settings`
- intentional placeholder pages that define planned scope instead of returning 404s

This establishes the cross-product structure needed before adding more deep finance features.

## Desktop Page Scaffold

The app now has reusable desktop-first page layout primitives in `src/components/layout/page-scaffold.tsx`.

Current scaffold rules:

- `AppPageShell` owns the content canvas, desktop width, background grid participation, and page spacing.
- `PageHero` standardizes compact page headers with optional right-side status or action content.
- `PageGrid` uses a 12-column desktop grid and stretches same-row grid items to equal height by default.
- `PageGridItem` exposes reusable spans for full-width, 7/5, 6/6, 4/8, and 5/7 page compositions.
- `AllMeCard`, `PageSection`, `StatusPill`, `KeyValueRow`, and `MetricGrid` standardize card rhythm, section headers, status badges, and system key-value rows.
- Same-row cards that occupy comparable grid space should share height unless a page intentionally opts out.
- Finance dashboard metrics intentionally cap at three columns on desktop, forcing two rows: Transactions/Credits/Debits first, Income/Spending/Categorized second. This prevents wide-screen metric value clipping and keeps the dashboard window scannable.

Routes currently using the scaffold:

- `/`
- `/finance`
- `/settings`
- `/today`
- `/notes`
- `/calendar`
- `/progress`

Future page work should start from these primitives instead of creating one-off `main`, hero, card, or grid wrappers.

## Settings Foundation

The Settings route has started moving from placeholder to product surface:

- reads the owner user from `ALLME_IMPORT_USER_EMAIL`
- ensures a `user_settings` row exists for the owner user
- lets the owner update timezone and preferred currency
- shows Fintable readiness without exposing spreadsheet id, credential file paths, API keys, or secrets
- shows recent Fintable import-run health without exposing raw error details or provider identifiers
- shows current identity/auth readiness for local owner mode vs future Google OAuth
- treats local owner mode as intentional instead of warning-level auth failure
- enforces hosted-first access boundaries with `proxy.ts`, Auth.js callbacks, and server-side guards
- keeps local-owner mode available for development only

This is the first Milestone 2 implementation slice. It does not yet implement hosted onboarding or editable integration credentials.

## Current Tagging Architecture

The finance tagging system is currently built on the existing categorization tables rather than a separate tag model:

- `finance_user_categories` stores user-owned tags, including display name, slug, color, icon, and cash-flow behavior.
- `finance_transaction_category_assignments` stores the selected tag for each transaction.
- `source = manual` is used for user-chosen transaction tags.
- Automated recategorization intentionally does not overwrite manual assignments.
- The Recent Transactions ellipsis opens tag management.
- The transaction detail modal's AllMe Category widget opens a tag picker for that individual transaction.
- Bulk tagging and rule creation live in the tag manager edit view, not the transaction detail modal.

Current tag creation supports:

- tag name
- tag color
- cash-flow behavior: spending, income, or neutral

The first inference and preview layer exists in the tag manager edit view:

- The user selects a matching field such as provider category, raw category path, merchant, or description.
- The preview count is computed from the currently loaded transaction list.
- Applying to previewed matches writes manual assignments for that previewed set.
- Users can enter custom comma/newline-separated match terms.
- Custom text rules match across normalized descriptions, merchants, stored categories, raw category paths, and Plaid/Fintable personal finance category fields.
- Saving a custom text rule writes a persistent `finance_category_rules` row with `matchLogic = any` and `contains_any` conditions, so future categorization/import runs can reuse the user-defined rule.

The next tagging layer should move this inference and preview workflow server-side for full-history coverage:

- infer candidate rules from the selected transaction's raw fields
- show matching signals such as raw category, personal finance category, merchant, website, and description
- preview matching transaction count before applying
- let the user choose whether the tag applies to only this transaction, past similar transactions, future similar transactions, or both

The most useful raw fields for future rule inference are:

- `personal_finance_category.detailed`
- `personal_finance_category.primary`
- `raw.category`
- `merchant_entity_id`
- `merchant_name`

## Today Vertical Slice

The first real `/today` product slice has shipped.

Implemented behavior:

- `/today` is no longer only a placeholder route.
- The page resolves the authorized user through the existing page guard.
- The page reads the user's timezone from `user_settings`, creating default settings if needed.
- A daily note is auto-created in the existing `notes` table for the user's local date.
- The daily note is scoped by `user_id` and `note_date`.
- The note body can be edited and saved through a server action.
- The daily note form shows temporary `Saved!` feedback after a successful save.
- Saving revalidates `/today` and `/` so future home dashboard summaries can reflect note state.
- The Capture card now supports quick capture into the existing `notes` table by creating undated notes.
- `/today` shows the five most recent active quick captures in the support column.
- Quick captures can now be completed from the Today inbox. Completion preserves the note row and stamps `notes.completed_at` so the capture can support future inbox/archive/progress workflows.
- `/today` supports daily note archive navigation with previous/next day links, a back-to-today link when viewing an archive date, and a recent daily notes list.
- The Today layout now uses a desktop-first two-row structure: Daily Note and Recent Notes share the top row, Inbox sits below Daily Note, and Agenda/Review sit in the right support column.
- Recent Notes fetches roughly one month of daily notes and scrolls internally instead of expanding the full page.
- Today date navigation uses scroll preservation so moving between archive days does not force the user back to the top of the page.
- Opening an archive date creates that date's note on demand if it does not exist yet.
- Supporting cards for Agenda and Daily Closeout remain intentionally marked as planned surfaces.

This is a vertical slice because it crosses the real app layers: auth guard, settings lookup, Postgres persistence, server-rendered page, server action mutation, scaffold UI, and unit-tested timezone date handling.

Next Today layers should stay similarly narrow:

- note autosave or stronger save-state feedback
- small finance snapshot
- calendar-backed agenda

## Notes Vertical Slice

The first real `/notes` product slice has shipped.

Implemented behavior:

- `/notes` is no longer a placeholder route.
- The page resolves the authorized user through the existing page guard.
- Active quick captures are listed as an inbox and can be completed from Notes.
- Completed quick captures are retained and can be restored back into the active inbox.
- Recent daily notes are listed and link back to the date-specific `/today` archive view.
- Summary counts show active captures, completed captures, and recent daily notes in the page hero.
- The page uses the shared desktop scaffold so it remains visually aligned with Today, Finance, and Settings.

This keeps Today lightweight while giving captures a dedicated review surface. The next Notes layer should add editing/detail views for individual captures or lightweight note pages before adding tags/backlinks.

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
5b6ed62 Add self-serve finance tagging
42d620a Refine finance date and lookback filters
bda5974 Clean up finance account rows
382eba1 Add finance account detail and transaction modal
9373315 Refresh finance development status
c760912 Improve transaction review and cash flow categorization
1d888ec Fix Fintable account sync conflicts
e165044 Compact transaction date filter labels
a282cbd Add in-app Fintable sync
036c985 Add account aliases and metric lookback
1c6ff22 Polish transaction filter controls
06d47d3 Add synthetic finance test data scripts
9c7cee1 Document recent finance dashboard progress
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

1. Move category rule preview and apply-to-similar matching server-side for full-history coverage.
2. Add rule editing/deletion UI for user-created custom text rules.
3. Add a dedicated category review workflow for assigning categories to uncategorized transactions.
4. Consider moving transaction filtering server-side once the dataset grows beyond a few hundred rows.
5. Add app navigation so `/`, `/finance`, and future sections share one shell.
6. Add a visible import status/history page.
7. Add a persistent ignored/deleted source-transaction table if transaction deletion should survive future Fintable syncs.
