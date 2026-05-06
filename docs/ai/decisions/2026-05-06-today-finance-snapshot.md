# Decision: Today Finance Snapshot

Date: 2026-05-06
Status: Candidate
Role: Architect / UI/UX

UI/UX review: 2026-05-06

## Decision

This slice should proceed now as the next narrow Milestone 3 candidate, provided
it stays a `/today` support module and does not expand Finance capability.

The slice is allowed to read existing app-owned Finance state from PostgreSQL.
It is not allowed to change Finance import behavior, categorization behavior,
provider integrations, sync behavior, schema, or migrations. If implementation
cannot deliver the user value from existing normalized Finance data, stop and
return to Product Manager / Architect instead of widening the slice.

Canonical direction remains in `docs/ROADMAP.md`,
`docs/PROJECT_BLUEPRINT.md`, `docs/DEVELOPMENT_STATUS.md`,
`docs/ALLME_DESIGN_SYSTEM.md`, and `docs/ai/NEXT_SLICES.md`.

## User Value

Opening `/today` should answer one small money question without pulling the user
into Finance: is there recent money activity or review work worth noticing
today?

The module should be a compact snapshot, not a dashboard. It should show a
small set of Finance facts such as selected-date posted activity, category-aware
income/spending totals, uncategorized items needing review, and data freshness.
It should link to `/finance` for deeper work.

## Existing Data And Read Models To Reuse

Use only app-owned PostgreSQL Finance state that already powers the Finance
dashboard:

- `finance_accounts`: active account count and display-safe account metadata
  when needed.
- `finance_balance_snapshots`: latest available balance snapshot dates when a
  freshness signal is useful.
- `finance_transactions`: posted transactions scoped by `user_id` and
  `posted_date`.
- `finance_transaction_category_assignments`: categorized versus uncategorized
  status.
- `finance_user_categories`: existing `include_in_income` and
  `include_in_spending` semantics for category-aware cash-flow totals.
- `finance_import_runs`: latest import status and completion timing, without
  exposing raw error text, provider identifiers, credential paths, or raw
  payload details.

Implementation may add one read-only Today snapshot helper if the existing
Finance dashboard query is too broad. That helper must return only the fields
needed by `/today` and must preserve existing Finance semantics. It must not add
new mutations, new rule behavior, new provider reads, or new user workflows.

Do not read directly from Google Sheets, Fintable, Plaid/provider payloads, or
third-party APIs for this slice.

## Acceptance Criteria

- `/today` includes one compact Finance support card or panel for the selected
  Today date.
- The Finance module stays visually secondary to the daily note, capture,
  agenda, and closeout surfaces.
- The snapshot is scoped to the authorized user and the selected Today date key
  where date-specific activity is shown.
- Money totals use the existing category-aware income/spending flags rather
  than raw sign-only totals when labeled as income or spending.
- Uncategorized review count uses existing category-assignment state only.
- Data freshness uses existing import-run or balance-snapshot state only.
- Empty state is calm and useful, such as no posted activity for the selected
  date plus a link to `/finance`.
- The module never exposes raw provider payloads, raw error summaries,
  credential paths, account source ids, user ids, or transaction ids.
- No sync, import, categorization, rule-management, account editing, or
  transaction editing control appears on `/today`.
- No schema, migration, package, dependency, auth, provider-write, Finance
  import, or Finance categorization behavior changes are made.
- Focused tests cover snapshot calculation or read-model behavior, empty state
  handling, category-aware totals, uncategorized counts, and user/date scoping
  where practical.

## Non-Goals

- No new Finance capability.
- No Finance import, sync, provider, or Google Sheets behavior changes.
- No categorization rule changes, previews, training, manual assignment, tag
  editing, or uncategorized-review workflow changes.
- No account rename/edit controls, transaction detail controls, transaction
  deletion, or Finance dashboard refactor.
- No net-worth, holdings, budgeting, forecasting, bills, recurring expenses,
  money movement, brokerage, or tax feature.
- No schema or migration changes.
- No raw provider-data display.
- No expansion of `/today` into a Finance-first page.

## File Ownership

Owned for implementation:

- `src/app/today/page.tsx`
- `src/features/today/queries.ts`
- `src/features/today/components/today-finance-snapshot-card.tsx` if a new
  component is needed
- `src/features/finance/dashboard/today-snapshot-query.ts` or an equivalently
  narrow new read-only Finance helper
- focused tests under `tests/unit/today/**` and
  `tests/unit/finance/dashboard/**`

Read-only unless a concrete implementation blocker is documented:

- `src/features/finance/dashboard/queries.ts`
- `src/features/finance/dashboard/components/summary-metrics-calculations.ts`
- `src/features/finance/dashboard/components/summary-metrics.tsx`
- `src/features/finance/dashboard/components/summary-metrics-view.tsx`
- `src/features/finance/dashboard/components/accounts-panel.tsx`
- `src/features/finance/dashboard/components/recent-transactions*.tsx`
- `src/app/finance/page.tsx`
- `src/components/layout/page-scaffold.tsx`
- `src/app/globals.css`
- `src/server/db/schema.ts`

Forbidden for this slice:

- `db/migrations/**`
- `db/migrations/meta/**`
- `src/features/finance/imports/**`
- `src/features/finance/integrations/**`
- `src/features/finance/categorization/**`
- `src/features/finance/dashboard/actions.ts`
- `src/features/finance/dashboard/components/sync-fintable-button.tsx`
- `scripts/**` Finance import, seed, sync, or categorization scripts
- `src/server/auth/**`
- `proxy.ts`
- Calendar provider-write paths
- `package.json`
- lockfiles
- CI, lint, format, typecheck, coverage, or dependency-boundary configuration

## Required Agents

- Product Manager: activate the candidate and keep `docs/ai/NEXT_SLICES.md`
  current.
- Architect: preserve the cross-domain boundary and stop Finance scope creep.
- UI/UX: confirm placement, density, copy, and empty states so `/today` remains
  uncluttered.
- Principal Engineer: implement the bounded read-only snapshot.
- QA Reviewer: verify acceptance criteria, regression risk, and validation
  evidence.
- Data/DB: consult only if the read helper needs non-trivial SQL review; no
  schema or migration lane is opened for this slice.

## UI/UX Guidance

### Proposed Layout

- Keep `/today` on the existing `AppPageShell`, `PageHero`, `PageGrid`,
  `PageGridItem`, `AllMeCard`, `PageSection`, and `StatusPill` structure.
- Add Finance as one compact support-column card, not a primary grid region.
  Preferred placement is below Agenda and above Daily Closeout so the right
  rail reads: schedule context, money context, completion context.
- Keep Daily Note and Capture visually dominant. Finance should not compete
  with the note editor, Today inbox, or Agenda list.
- Desktop support stack may become three rows such as
  `minmax(0,1fr) auto auto`; keep Agenda as the only scrollable/tall support
  panel.
- Mobile order should preserve Today priorities: Daily Note, Recent Notes,
  Capture, Agenda, Finance, Daily Closeout.
- Finance card target height should be compact, roughly similar to Daily
  Closeout. Avoid account lists, transaction ledgers, tables, charts, or filter
  controls.
- Use at most three visible facts:
  - posted activity count for the selected date
  - category-aware income/spending for the selected date
  - uncategorized review count or latest import freshness
- Include one low-emphasis link to `/finance` for deeper review. Do not expose
  inline Finance actions.

### Component Boundaries

- `src/app/today/page.tsx` should only compose the card into the existing page
  layout.
- `src/features/today/queries.ts` may add a `financeSnapshot` field to
  `getTodayPageData`, populated from a narrow read-only Finance helper.
- `src/features/today/components/today-finance-snapshot-card.tsx` should own
  all Finance snapshot presentation, empty-state rendering, formatting, and
  link copy.
- The new Finance read helper should return a UI-ready summary shape. It should
  not import Today UI components and should not mutate Finance state.
- Do not reuse full Finance dashboard UI components on `/today`; they are
  dashboard-scale and carry heavier interaction expectations.
- Shared formatting can be local to the Today snapshot component unless an
  existing exported helper already fits without widening Finance contracts.

### Empty States

- No Finance data imported:
  - Status pill: `No data`
  - Body copy: `No Finance data has been imported yet.`
  - Link: `Open Finance`
- Finance data exists but no selected-date posted activity:
  - Status pill: `Quiet`
  - Body copy: `No posted money activity for this day.`
  - Keep freshness visible if available, such as `Last import May 6`.
- Uncategorized count is zero:
  - Use neutral or ready copy such as `0 need review`; do not celebrate or add
    decorative treatment.
- Empty states should use dashed `var(--line)` borders only if the whole card
  has no useful metrics. Otherwise keep the same compact metric layout with
  zero values.

### Loading And Pending States

- This should be server-rendered with the rest of `/today`, so no normal
  client-side loading state is required.
- Do not add spinners, skeletons, refresh buttons, or sync pending states.
- If implementation adds a small client boundary later, preserve card height
  while pending and use calm copy such as `Updating...`.
- The Finance link should remain a normal navigation link and must not trigger
  sync, categorization, or import work.

### Error States

- Query failures should not expose raw database errors, import error summaries,
  provider ids, account ids, transaction ids, source account ids, raw payloads,
  credential paths, or stack traces.
- Preferred user-facing fallback:
  - Status pill: `Unavailable`
  - Body copy: `Finance snapshot is unavailable right now.`
  - Link: `Open Finance`
- If the read helper cannot compute category-aware totals, do not silently
  relabel raw sign totals as income or spending. Either omit those totals or
  show an unavailable fallback.
- Do not add an error retry action inside Today for Finance.

### Button And Action Copy

- Card eyebrow: `Finance`
- Card title: `Money context`
- Link copy: `Open Finance`
- Status labels:
  - `Quiet`
  - `Activity`
  - `Needs review`
  - `No data`
  - `Unavailable`
- Metric labels:
  - `Posted`
  - `Income`
  - `Spending`
  - `Review`
  - `Freshness`
- Avoid copy that implies forecasting, budgeting, account management, sync, or
  categorization work from Today.

### Accessibility Considerations

- Use semantic text for every metric; color must not be the only signifier for
  positive or negative money.
- Money values should include visible signs where relevant and use tabular
  numerals.
- The `/finance` link must have a clear accessible name. If an icon is used,
  mark it `aria-hidden="true"`.
- Keep the card keyboard-simple: one link, no nested interactive rows, no
  hidden menus, no hover-only details.
- Long labels and currency values must wrap or truncate without overlapping on
  mobile. Test unusually large values and four-digit review counts.
- Do not place raw ids, hidden diagnostic text, or provider details in
  accessible labels.

### Design-System Constraints

- Follow the personal command-ledger direction: dark-first, calm, data-first,
  quick to scan.
- Use existing tokens and classes: `var(--panel)`, `var(--empty)`,
  `var(--line)`, `var(--accent)`, `var(--success)`, `var(--danger)`,
  `var(--warn)`, `var(--muted)`, `allme-control`, and `allme-kicker`.
- Use semantic money color sparingly: green for income/inflow, red for
  spending/outflow, amber only for review-needed state.
- Avoid one-off colors, gradients, decorative icons, chart colors, nested cards,
  tables, and dashboard-style metric tiles.
- Keep typography compact. Do not use hero-scale numbers or Finance dashboard
  card sizing inside Today.
- Use `lucide-react` icons only if they clarify the section; icon use should be
  secondary to the data.
- Progressive disclosure means Today shows the snapshot and links out. Deeper
  transaction, account, rule, and import details remain in Finance.

### Files Principal Engineer Should Touch

- `src/app/today/page.tsx`
- `src/features/today/queries.ts`
- `src/features/today/components/today-finance-snapshot-card.tsx`
- `src/features/finance/dashboard/today-snapshot-query.ts` or the chosen narrow
  read-only helper path
- focused snapshot tests under `tests/unit/today/**` and
  `tests/unit/finance/dashboard/**`

### UI Risks And Deferrals

- Risk: placing Finance too high or too large can make `/today` feel like a
  money dashboard. Keep it in the support column and below Agenda.
- Risk: reusing Finance dashboard components can pull in controls, sizing, or
  interaction expectations that do not belong on Today. Build a small Today
  presentation component instead.
- Risk: raw sign totals can conflict with the existing category-aware income
  and spending semantics. Use the existing category flags or omit those labels.
- Risk: import freshness copy can imply a manual sync action. Keep it
  read-only, such as `Last import May 6`, with no Today sync affordance.
- Defer account lists, transaction rows, transaction detail, sync controls,
  categorization review, rule creation, budget status, net worth, holdings,
  charts, filters, and custom lookbacks.

## Work Not To Parallelize

Only one implementation lane should edit the `/today` data shape and rendering:

- `src/features/today/queries.ts`
- `src/app/today/page.tsx`
- the new Today Finance snapshot component
- the new Finance snapshot read helper
- focused snapshot tests

Do not parallelize any work that touches Finance dashboard query semantics,
category-aware metric semantics, or the Today page layout. Do not start a
parallel Data/DB migration lane, Finance import lane, categorization lane, sync
lane, or provider-integration lane.

## Validation

Documentation-only planning validation:

- Manual Markdown review is sufficient for this packet.

Required implementation validation:

- Run focused tests for the new snapshot helper and Today integration, such as
  `npm run test -- tests/unit/today tests/unit/finance/dashboard`.
- Run `npm run typecheck`.
- Run `npm run lint:minimal`.
- Run a local `/today` browser check in desktop and mobile widths, verifying the
  Finance module is small, readable, non-overlapping, and not visually dominant.
- If local Postgres is available, smoke `/today` with empty Finance data and
  with imported Finance data.

Explicitly not required for this slice:

- `npm run db:generate`
- `npm run db:migrate`
- `npm run finance:fintable:import`
- `npm run finance:categorize`
- any direct third-party sync or provider smoke

## Stop Conditions

Stop and return to Product Manager / Architect if implementation appears to
require:

- schema or migration changes
- new Finance mutation paths
- import, sync, provider, or categorization changes
- raw provider data display
- new dependencies
- broad Finance dashboard refactoring
- a `/today` layout that makes Finance the primary task
