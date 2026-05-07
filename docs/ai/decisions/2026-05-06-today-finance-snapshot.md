# Decision: Today Finance Snapshot

Date: 2026-05-06
Status: Completed
Role: Architect / UI/UX

UI/UX review: 2026-05-06

## Decision

This slice should proceed now as the next narrow Milestone 3 candidate.

The slice is approved only as a small `/today` supporting snapshot that reads
existing app-owned Finance data from PostgreSQL. It must not add Finance
capability, change Finance import behavior, change categorization behavior,
read directly from third-party providers, or require schema/migration work.

If the implementation cannot deliver the snapshot from existing normalized
Finance state, stop and return to Product Manager / Architect instead of
widening the slice.

Canonical direction remains in `docs/ROADMAP.md`,
`docs/PROJECT_BLUEPRINT.md`, `docs/DEVELOPMENT_STATUS.md`,
`docs/ALLME_DESIGN_SYSTEM.md`, and `docs/ai/NEXT_SLICES.md`.

## User Value

Opening `/today` should give the user one small money signal alongside daily
note, capture, agenda, and closeout context.

The exact value: the user can tell whether money activity or Finance review work
needs attention today without leaving the daily operating view. The snapshot
should answer a narrow question such as:

- was there posted money activity for the selected Today date?
- how much category-aware income/spending is visible for that date?
- are there uncategorized transactions needing review?
- is Finance data fresh enough to trust at a glance?

Deep inspection and action stay in `/finance`.

## Existing Finance Data And Read Models

Reuse only app-owned PostgreSQL state that already supports the Finance
dashboard:

- `finance_transactions`: posted dates, amounts, currencies, and user scoping.
- `finance_transaction_category_assignments`: categorized versus uncategorized
  status through existing assignment source semantics.
- `finance_user_categories`: existing `include_in_income` and
  `include_in_spending` flags for category-aware cash-flow totals.
- `finance_import_runs`: latest import status and completion timing for a
  freshness signal, without exposing raw error details.
- `finance_accounts`: active account counts or display-safe account metadata
  only if needed for context.
- `finance_balance_snapshots`: latest snapshot dates only if needed for
  freshness; do not turn this into net-worth or account-list work.

Existing Finance dashboard semantics can be reused, especially category-aware
income/spending and uncategorized counting. The existing full dashboard query is
broader than Today needs, so implementation may add one narrow read-only helper
for the Today snapshot. That helper should not join `finance_raw_records`, read
raw provider payloads, or expose source ids.

Do not read from Google Sheets, Fintable, Plaid/provider APIs, raw provider
payloads, local credential files, or environment secrets.

## File Ownership

Owned for implementation:

- `src/app/today/page.tsx`
- `src/features/today/queries.ts`
- `src/features/today/components/today-finance-snapshot-card.tsx` if UI/UX or
  Principal Engineer chooses a dedicated component
- `src/features/finance/dashboard/today-snapshot-query.ts` or an equivalently
  narrow read-only Finance helper
- focused tests under `tests/unit/today/**` and
  `tests/unit/finance/dashboard/**`

Read-only unless a blocker is documented in the implementation handoff:

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

Forbidden:

- `db/migrations/**`
- `db/migrations/meta/**`
- `src/features/finance/imports/**`
- `src/features/finance/integrations/**`
- `src/features/finance/categorization/**`
- `src/features/finance/dashboard/actions.ts`
- `src/features/finance/dashboard/components/sync-fintable-button.tsx`
- Finance import, seed, sync, categorization, or provider scripts under
  `scripts/**`
- `src/server/auth/**`
- `proxy.ts`
- Calendar provider-write paths
- `package.json`
- lockfiles
- CI, lint, format, typecheck, coverage, or dependency-boundary configuration

## Acceptance Criteria

- `/today` includes one compact Finance support module for the selected Today
  date.
- The Finance module remains secondary to Daily Note, Capture, Agenda, and
  Daily Closeout.
- Reads are scoped to the authorized user.
- Date-specific activity is scoped to the selected Today date key, not always
  wall-clock today.
- Income and spending labels use existing category-aware flags, not raw
  sign-only totals.
- Uncategorized review count uses existing assignment state only.
- Data freshness uses existing import-run or balance-snapshot state only.
- Empty states handle no imports and no selected-date activity without raw
  errors or identifiers.
- The module links to `/finance` for deeper review.
- The module does not expose sync, import, categorization, rule, account-edit,
  transaction-edit, or transaction-delete controls.
- The module does not expose raw provider payloads, raw import error summaries,
  provider ids, source account ids, user ids, transaction ids, or credential
  paths.
- No schema, migration, auth, package, dependency, provider, import, sync, or
  categorization behavior changes are made.

## Non-Goals

- No new Finance capability.
- No Finance import, sync, provider, Google Sheets, or raw provider-data work.
- No categorization rule changes, rule previews, rule creation, tag editing,
  manual assignment, or uncategorized-review workflow changes.
- No account rename/edit controls, account lists on Today, transaction ledger,
  transaction details, transaction deletion, or Finance dashboard refactor.
- No net worth, holdings, budgets, forecasts, recurring expenses, bill tracking,
  money movement, brokerage, or tax workflows.
- No new Progress, Calendar, Notes, auth, settings, schema, or migration scope.
- No redesign of `/today`, page scaffold, global styles, or Finance dashboard.

## Required Agents

- Product Manager: activate the candidate and keep `docs/ai/NEXT_SLICES.md`
  current.
- Architect: preserve the cross-domain boundary and stop Finance scope creep.
- UI/UX: define the compact placement, copy, empty states, and visual hierarchy
  before implementation if not already covered in a handoff.
- Principal Engineer: implement the bounded read-only snapshot.
- QA Reviewer: verify acceptance criteria, regression risk, and validation
  evidence.
- Data/DB: consult only if the narrow read helper needs SQL-shape review. This
  slice opens no migration lane.

## UI/UX Guidance

### Proposed Layout

- Keep `/today` on the existing `AppPageShell`, `PageHero`, `PageGrid`,
  `PageGridItem`, `AllMeCard`, `PageSection`, and `StatusPill` structure.
- Add Finance as one compact support-column card, not a primary grid region.
  Preferred placement is below Agenda and above Daily Closeout so the support
  column reads: schedule context, money context, completion context.
- Preserve the current hierarchy: Daily Note and Capture remain the main work;
  Agenda remains the tall contextual panel; Finance and Daily Closeout remain
  compact supporting panels.
- On desktop, the right support stack may become three rows such as
  `minmax(0,1fr) auto auto`; Agenda should remain the only scrollable/tall
  support panel.
- On mobile, preserve Today priority order: Daily Note, Recent Notes, Capture,
  Agenda, Finance, Daily Closeout.
- Keep the Finance card roughly the same visual weight as Daily Closeout. Do
  not add account lists, transaction ledgers, charts, filters, popovers, or
  table-like layouts.
- Show at most three visible facts:
  - posted activity count for the selected date
  - category-aware income/spending for the selected date
  - uncategorized review count or latest import freshness
- Include one low-emphasis link to `/finance` for deeper review. Do not expose
  inline Finance actions.

### Component Boundaries

- `src/app/today/page.tsx` should only compose the Finance card into the
  existing page layout.
- `src/features/today/queries.ts` may add a `financeSnapshot` field to
  `getTodayPageData`, populated by the narrow read-only Finance helper.
- `src/features/today/components/today-finance-snapshot-card.tsx` should own
  all presentation, formatting, empty/error state rendering, and link copy for
  the Today Finance snapshot.
- The Finance read helper should return a small UI-ready summary shape. It
  should not import Today UI components, mutate Finance state, read raw provider
  payloads, or expose source identifiers.
- Do not reuse Finance dashboard components on `/today`; they are sized and
  worded for a dashboard and can imply dashboard-level controls.
- Keep formatting local to the snapshot component unless an existing exported
  helper already fits without widening Finance contracts.

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
  - Copy: `0 need review`
  - Use neutral or ready treatment; do not add celebratory copy or decoration.
- Empty states should use dashed `var(--line)` borders only when the card has no
  useful metrics. Otherwise keep the compact metric layout with zero values.

### Loading And Pending States

- The snapshot should be server-rendered with the rest of `/today`; no normal
  client-side loading state is required.
- Do not add spinners, skeletons, refresh buttons, sync buttons, or import
  pending states.
- If a future implementation introduces a client boundary, preserve the card
  height during pending state and use calm copy such as `Updating...`.
- The `/finance` link is plain navigation and must not trigger sync,
  categorization, import, or refresh work.

### Error States

- Do not surface raw database errors, import error summaries, provider ids,
  account ids, transaction ids, source account ids, raw payload fields,
  credential paths, or stack traces.
- Preferred user-facing fallback:
  - Status pill: `Unavailable`
  - Body copy: `Finance snapshot is unavailable right now.`
  - Link: `Open Finance`
- If category-aware totals cannot be computed, do not relabel raw sign totals as
  income or spending. Omit those totals or show the unavailable fallback.
- Do not add retry, sync, recategorize, or repair actions inside Today.

### Button And Action Copy

- Card eyebrow: `Finance`
- Card title: `Money context`
- Primary link: `Open Finance`
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
- Avoid copy that implies budgeting, forecasting, account management, sync,
  import, categorization, or rule editing from Today.

### Accessibility Considerations

- Every metric needs semantic text; color must not be the only indicator for
  positive, negative, quiet, or review-needed states.
- Money values should include visible direction/sign where relevant and use
  tabular numerals.
- The `/finance` link must have a clear accessible name. If an icon is used,
  mark it `aria-hidden="true"`.
- Keep the card keyboard-simple: one link, no nested interactive rows, no
  hidden menus, and no hover-only details.
- Long labels, large currency values, and four-digit review counts must wrap or
  truncate without overlapping on mobile.
- Do not place raw ids, provider details, or diagnostic text in visible copy,
  `title`, `aria-label`, or visually hidden text.

### Design-System Constraints

- Follow the personal command-ledger direction: dark-first, calm, data-first,
  quick to scan.
- Use existing tokens and classes: `var(--panel)`, `var(--empty)`,
  `var(--line)`, `var(--accent)`, `var(--success)`, `var(--danger)`,
  `var(--warn)`, `var(--muted)`, `allme-control`, and `allme-kicker`.
- Use semantic money color sparingly: green for income/inflow, red for
  spending/outflow, amber only for review-needed state.
- Avoid one-off colors, gradients, decorative icons, chart palettes, nested
  cards, tables, and dashboard-scale metric tiles.
- Keep typography compact. Do not use hero-scale numbers or Finance dashboard
  card sizing inside Today.
- Use `lucide-react` icons only when they clarify the section; icon use should
  stay secondary to the data.
- Progressive disclosure means Today shows the snapshot and links out. Deeper
  transaction, account, import, rule, and category details remain in Finance.

### Files Principal Engineer Should Touch

- `src/app/today/page.tsx`
- `src/features/today/queries.ts`
- `src/features/today/components/today-finance-snapshot-card.tsx`
- `src/features/finance/dashboard/today-snapshot-query.ts` or the chosen narrow
  read-only helper path
- focused snapshot tests under `tests/unit/today/**` and
  `tests/unit/finance/dashboard/**`

### UI Risks And Deferrals

- Risk: placing Finance too high or making the card too large can make `/today`
  feel like a money dashboard. Keep it in the support column below Agenda.
- Risk: reusing Finance dashboard components can pull in controls, sizing, and
  interaction expectations that do not belong on Today. Build a small
  Today-owned presentation component.
- Risk: raw sign totals can conflict with existing category-aware income and
  spending semantics. Use the existing category flags or omit those labels.
- Risk: freshness copy can imply the user should sync from Today. Keep it
  read-only, such as `Last import May 6`, with no sync affordance.
- Defer account lists, transaction rows, transaction detail, sync controls,
  categorization review, rule creation, budget status, net worth, holdings,
  charts, filters, and custom lookbacks.

## Work Not To Parallelize

Only one implementation lane should edit the Today data contract and snapshot
composition:

- `src/features/today/queries.ts`
- `src/app/today/page.tsx`
- the Today Finance snapshot component
- the narrow Finance snapshot read helper
- focused snapshot tests

Do not parallelize work that changes Finance dashboard metric semantics,
category-aware cash-flow semantics, Today page layout, or shared scaffold
components. Do not start parallel lanes for schema/migrations, Finance imports,
categorization, sync, provider integrations, auth, package files, or lockfiles.

## Validation

Documentation-only planning validation:

- Manual Markdown review is sufficient for this packet.

Required implementation validation:

- Focused tests for the new snapshot helper and Today integration, such as
  `npm run test -- tests/unit/today tests/unit/finance/dashboard`.
- `npm run typecheck`.
- `npm run lint:minimal`.
- Browser check `/today` at desktop and mobile widths, verifying the snapshot is
  readable, compact, non-overlapping, and visually secondary.
- If local Postgres is available, smoke `/today` with no Finance imports and
  with imported Finance data.

Explicitly not required for this slice:

- `npm run db:generate`
- `npm run db:migrate`
- `npm run finance:fintable:import`
- `npm run finance:categorize`
- any third-party provider sync or smoke

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
