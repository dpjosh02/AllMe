# Decision: Notes Capture Detail Follow-Through

Date: 2026-05-06
Status: Completed
Role: Product Manager

UI/UX review: 2026-05-06

Release review: 2026-05-06

## Goal

Make quick captures easier to follow through from Notes and Today by tightening
the existing capture detail workflow: open, edit, complete, restore, and return
navigation should feel consistent, reversible, and production-ready.

Canonical direction remains in `docs/ROADMAP.md`,
`docs/DEVELOPMENT_STATUS.md`, `docs/ALLME_DESIGN_SYSTEM.md`, and
`docs/ai/NEXT_SLICES.md`.

## User Value

Quick captures are already useful, but follow-through still spans multiple
surfaces. This slice makes the existing capture inbox feel dependable: the user
can capture something quickly, revisit the detail, edit it, mark it complete,
restore it later, and understand the same state from Today and Notes.

## Acceptance Criteria

- Capture detail clearly supports edit, complete, restore, and return-to-Notes
  behavior.
- Notes and Today use consistent active/completed capture state language.
- Completed captures remain recoverable from Notes without deleting the note
  row.
- Empty, pending, saved, validation, and not-found states avoid raw identifiers
  and raw errors.
- Linked Calendar event notes keep their existing protected behavior and do not
  imply provider writes.
- Focused tests cover capture title/body updates, complete/restore transitions,
  and touched read-model behavior.
- The implementation does not touch schema, migrations, auth,
  provider-write logic, Finance imports, package files, or dependencies.

## Non-Goals

- No schema or migration changes.
- No tag system, backlinks, rich-text editor, note folders, or full Notes
  knowledge base.
- No Calendar provider writes.
- No Finance import, categorization, or dashboard work.
- No auth boundary changes.
- No package or dependency changes.
- No broad page-scaffold or design-system refactor.

## Current Repo State

- Active slice in `docs/ai/NEXT_SLICES.md`: `Notes Capture Detail Follow-Through`.
- Notes already has `/notes`, `/notes/captures/[captureId]`, active captures,
  completed captures, daily notes, search/filter, density toggle, completion,
  restoration, and detail editing.
- Today already creates quick captures and shows active captures in the Today
  inbox.
- Capture persistence already uses the existing `notes` table with
  `note_date = null` for quick captures and `completed_at` for completion
  state.
- `src/features/notes/actions.ts` scopes mutations through
  `requireCurrentUser()` and `notes.userId`.
- `src/features/notes/queries.ts` scopes reads by `userId`.
- No Notes-specific unit tests are currently present under `tests/unit/notes`.

## File Ownership

Owned for Principal Engineer:

- `src/app/notes/**`
- `src/features/notes/**`
- `src/features/today/components/quick-capture-list.tsx`
- `src/features/today/components/quick-capture-form.tsx` only if copy/state
  consistency requires it
- focused tests under `tests/unit/notes/**` or another existing focused test
  location

Read-only unless a concrete bug is found:

- `src/features/today/queries.ts`
- `src/features/today/actions.ts`
- `src/app/today/page.tsx`
- `src/components/layout/page-scaffold.tsx`
- `src/server/db/schema.ts`

Forbidden for this slice:

- `db/migrations/**`
- `src/server/auth/**`
- `proxy.ts`
- `src/features/calendar/**` provider-write paths
- `src/features/finance/**`
- `package.json`
- lockfiles
- CI or lint configuration

## Explicit Non-Parallelized Files

Only one implementation lane should edit these files:

- `src/features/notes/actions.ts`
- `src/features/notes/queries.ts`
- `src/features/notes/components/notes-dashboard.tsx`
- `src/features/notes/components/capture-list.tsx`
- `src/features/notes/components/capture-detail-form.tsx`
- `src/app/notes/captures/[captureId]/page.tsx`
- `src/features/today/components/quick-capture-list.tsx`

Do not split these across parallel agents because state wording, action
behavior, and pending/error handling need to stay consistent.

## UI/UX Guidance

### Proposed Layout

- Keep `/notes` on the existing `AppPageShell` + `PageHero` + `PageGrid`
  structure. The page should stay a scan-first inbox/archive surface, not a
  long-form notes workspace.
- Keep the Notes hero summary as the right-side status card with active,
  completed, and daily-note counts. Do not add larger marketing-style
  explanation blocks.
- Keep active captures as the primary grid region and daily notes as support.
  Completed captures should remain below as a full-width recovery/review
  region.
- Keep `/notes/captures/[captureId]` as a two-column detail surface: editor in
  the primary column, metadata/navigation/state actions in the support column.
- If the detail page changes materially, prefer tighter wording and clearer
  state/action grouping over adding more cards.

### Component Boundaries

- `NotesDashboard` owns search, filters, density, and section visibility only.
- `CaptureList` owns reusable active/completed capture rows and should remain
  shared by active and completed sections.
- `CaptureDetailForm` owns title/body editing, save button state, saved
  confirmation, and validation display.
- `CaptureCreateForm` and `QuickCaptureForm` should keep matching capture
  creation copy and pending behavior where practical.
- `QuickCaptureList` should mirror capture row language from Notes for active
  captures, but should stay compact because Today is not the full review
  workspace.
- Do not introduce new cross-domain components for this slice. Extract a small
  Notes-only helper/component only if it reduces duplicated pending/error state
  handling.

### Empty States

- Active captures empty: `No active captures.`
- Completed captures empty: `No completed captures yet.`
- Daily notes empty: `No daily notes yet.`
- Search-filtered empty: keep the current pattern, such as
  `No captures match this search.` or `No daily notes match this search.`
- Empty states should use dashed `var(--line)` borders, `var(--empty)`
  background, and muted text. Do not use illustrations or accent-heavy empty
  cards.

### Loading And Pending States

- Create buttons: `Add capture` -> `Capturing...`
- Save button: `Save capture` -> `Saving...`
- Completion action: `Complete` or `Mark complete` -> `Completing...` if the
  implementation adds a pending state.
- Restore action: `Restore` or `Restore to inbox` -> `Restoring...` if the
  implementation adds a pending state.
- Pending buttons must be disabled, preserve layout width closely enough to
  avoid visible row jumps, and retain focus styling.
- Saved feedback should stay inline, polite, and brief. Use `aria-live="polite"`
  for `Saved!` or any save-result copy.

### Error States

- Do not surface raw thrown errors, note ids, user ids, provider ids, or stack
  traces.
- Empty title validation should be inline near the title input with copy such
  as `Add a title before saving.` Avoid routing the user to a generic error
  page for a correctable form issue.
- Missing or unauthorized capture detail should continue to use the existing
  not-found behavior.
- Linked Calendar note delete errors should remain user-safe and must not imply
  any Google Calendar mutation.

### Button And Action Copy

- Notes list row primary navigation: `Open`.
- Active capture row action: `Complete`.
- Completed capture row action: `Restore`.
- Detail navigation: `Notes overview`.
- Detail active state action: `Mark complete`.
- Detail completed state action: `Restore to inbox`.
- Detail save action: `Save capture`.
- Linked Calendar note destructive action: `Delete note`.
- Keep copy short and verb-led. Do not introduce explanatory text inside
  buttons.

### Accessibility Considerations

- Preserve visible labels or `aria-label` values for all textareas and inputs.
- Search should remain a real input with clear placeholder text and keyboard
  focus styling.
- Filter and density controls should be keyboard reachable buttons with visible
  active state; do not rely on color alone for selected state.
- Icon-only additions need accessible labels or adjacent text. Existing
  icon-plus-text actions are preferred.
- Forms with pending state must not trap focus or remove the submitting control
  from the accessibility tree.
- Long capture titles and bodies must wrap or clamp without overlapping action
  buttons on mobile and desktop.

### Design-System Constraints

- Follow the personal command ledger direction from
  `docs/ALLME_DESIGN_SYSTEM.md`: dark-first, calm, data-first, quick to scan.
- Use existing layout primitives: `AppPageShell`, `PageHero`, `PageGrid`,
  `PageGridItem`, `AllMeCard`, `PageSection`, `StatusPill`, `MetricGrid`, and
  `KeyValueRow`.
- Use existing tokens and utility classes: `var(--panel)`, `var(--empty)`,
  `var(--line)`, `var(--input)`, `var(--accent)`, `var(--success)`,
  `var(--danger)`, and `var(--muted)`.
- Avoid one-off colors, gradients, decorative imagery, nested cards, or large
  hero-style typography inside compact panels.
- Keep progressive disclosure: detail editing belongs on the capture detail
  page, not expanded inline across every Notes row.

### Files Principal Engineer Should Touch

- `src/app/notes/captures/[captureId]/page.tsx`
- `src/features/notes/components/capture-detail-form.tsx`
- `src/features/notes/components/capture-list.tsx`
- `src/features/notes/components/notes-dashboard.tsx`
- `src/features/notes/components/capture-create-form.tsx` only for copy or
  pending-state consistency
- `src/features/today/components/quick-capture-list.tsx` only for active
  capture copy/state consistency
- focused Notes tests under `tests/unit/notes/**` or the nearest existing
  focused unit-test location

### UI Risks And Deferrals

- Risk: adding pending state to server-action row buttons may require small
  client component boundaries. Keep that extraction Notes-owned and avoid broad
  refactors.
- Risk: copy drift between Today and Notes can make completion feel like two
  workflows. Use the action-copy list above as the source for this slice.
- Risk: validation fixes can accidentally cross into server-action contract
  changes. Keep validation UI-focused unless Principal Engineer identifies a
  concrete product-code bug.
- Defer bulk actions, keyboard shortcuts, rich text, backlinks, tags, inline
  detail expansion, and capture-to-progress promotion.

## Required Agents

- Product Manager: packet ownership and acceptance criteria.
- UI/UX: confirm layout/copy/state guidance before implementation if the detail
  page changes materially.
- Principal Engineer: implement the bounded slice.
- QA Reviewer: verify state transitions, scoped behavior, and no forbidden
  files changed.

Not required:

- Data/DB, unless implementation discovers that existing `notes` fields cannot
  support the slice.
- Release Integrator, unless branch merging or validation coordination becomes
  non-trivial.

## Validation Plan

Implementation branch should run:

- `npm run lint:minimal`
- `npm run typecheck`
- focused unit tests for Notes capture behavior
- targeted manual check of `/notes`, `/notes/captures/[captureId]`, and
  `/today`

Manual scenarios:

- Create a capture from Notes.
- Create a capture from Today.
- Open a capture detail page from Notes.
- Edit title/body and see saved feedback.
- Complete a capture from detail and from list.
- Restore a completed capture from detail and from completed list.
- Confirm Today no longer shows completed captures and does show restored
  captures.
- Confirm linked Calendar event-note delete behavior remains unchanged and does
  not mutate Google Calendar.

## Risks

- Capture state copy may drift between Today and Notes.
- Detail save currently throws on missing title; implementation should avoid
  exposing raw errors.
- Pending states may be inconsistent because list actions are server-action
  forms.
- Linked Calendar event notes share the Notes table, so delete/protection
  behavior must not regress.
- Tests may require small pure helper extraction to avoid over-mocking server
  actions.

## Deferrals

- Rich text.
- Tags.
- Backlinks.
- Capture-to-progress conversion.
- Calendar event-note expansion.
- Bulk completion or bulk restore.
- Capture archive beyond the existing completed list.
- Any schema/model changes.

## Release Review

Shipped in commits `7f51400` and `98b5aa9`, then merged to `main` by
`71cf633`.

Validation completed:

```bash
npm run lint:minimal
npm run typecheck
npm run test -- tests/unit/notes
npm run verify
npm run build
```

Results:

- Focused Notes tests passed: 2 files, 10 tests.
- `npm run verify` passed: 33 files, 181 tests.
- `npm run build` passed and included `/notes` and
  `/notes/captures/[captureId]` as dynamic routes.

Acceptance review:

- Capture detail supports edit, complete, restore, and Notes overview
  navigation.
- Notes and Today use consistent active/completed capture language.
- Completed captures remain recoverable from Notes without deleting the note
  row.
- Empty, pending, saved, validation, and not-found states avoid raw identifiers
  and raw errors.
- Linked Calendar event-note behavior remains local and does not imply provider
  writes.
- Focused Notes tests cover title/body updates, complete/restore transitions,
  and touched read-model behavior.
- Final merged diff did not touch schema, migrations, auth, provider-write
  logic, Finance imports, package files, or dependencies.

Residual validation gap:

- A targeted manual browser check of `/notes`, `/notes/captures/[captureId]`,
  and `/today` was not run during this release review.
