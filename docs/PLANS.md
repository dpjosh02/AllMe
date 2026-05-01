# PLANS.md

# AllMe linting and static-analysis execution blueprint

## Objective

Introduce a strong linting and static-analysis system into the AllMe repository safely, incrementally, and in a way that supports long-term human and AI-assisted development.

This document is the execution plan for the rollout.

---

## Current rollout status

- Phase 0: complete. Tooling scaffold, staged lint profiles, coverage, dependency-cruiser, package scripts, CI build, and project guidance docs are in place.
- Phase 1: complete. Core-safe cleanup has been applied to server/auth guard code, finance categorization, finance imports, and script type-import usage without broad refactors or behavior changes.
- Phase 2: complete. Remaining warning policy was stabilized with documented narrow overrides and regression tests were added for categorization and Fintable importer behavior.
- Phase 3: complete. Finance dashboard query/action seams were hardened with small behavior-preserving refactors and regression coverage for raw transaction detail extraction.
- Phase 4A-D: complete. The finance dashboard UI hotspots were decomposed into smaller same-folder components and helpers without intended runtime or UI behavior changes.
- Phase 5A: active. Documentation is being synchronized with the actual repo state.
- Phase 5B: next. Targeted cleanup should focus only on `src/features/settings/queries.ts` and `src/features/today/queries.ts`.

---

## Current steady-state quality baseline

As of the Phase 5A documentation sync:

- `npm run lint:minimal` passes and is the blocking lint gate.
- `npm run typecheck` passes.
- `npm run test` passes with 10 unit test files and 41 tests.
- `npm run build` passes.
- `npm run depcruise` passes with no dependency violations and remains advisory.
- `npm run coverage` passes and reports roughly 72% line coverage; coverage is advisory.
- `npm run lint:balanced` is advisory and currently reports warnings only.
- `npm run lint:strict` is advisory and currently reports warnings only.

Blocking checks:

- `npm run lint:minimal`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Advisory checks:

- `npm run lint:balanced`
- `npm run lint:strict`
- `npm run coverage`
- `npm run depcruise`

Do not promote advisory checks to blocking until their warning output is reviewed and scoped promotion criteria are explicitly approved.

---

## Desired outcomes

By the end of the rollout, the repo should have:

- typed ESLint integrated cleanly with the existing Next.js setup
- stronger TypeScript enforcement where it provides real value
- stable formatting boundaries between Prettier and ESLint
- explicit complexity and size guardrails
- import/module boundary checks
- CI enforcement that prevents regressions
- a phased strategy for legacy cleanup
- clear separation between autofixable work and manual refactors

---

## Architectural alignment with the current repo

The rollout must respect the current structure rather than pretending the repo is greenfield.

### Current architectural reality

The repo has a coherent Next.js App Router structure with shared layout primitives and feature-focused modules. The most mature surface is finance, especially imports, categorization, dashboard queries/actions, and related UI. Settings and Today contain meaningful logic. Some intended surfaces remain thin or placeholder.

### High-value enforcement zones

These are the best starting points because they are logic-heavy and less likely to suffer from JSX/UI noise:

- `src/server/**`
- `src/lib/**`
- `scripts/**`
- `src/features/finance/imports/**`
- `src/features/finance/categorization/**`

### Medium-risk zones

These are valuable but more likely to require manual cleanup:

- `src/features/settings/queries.ts`
- `src/features/today/queries.ts`
- remaining finance dashboard file-size warnings
- `src/features/settings/**`
- `src/features/today/**`

### High-risk legacy hotspots

These should be deferred until config and core enforcement are stable:

- `src/server/db/schema.ts`
- `scripts/finance-seed-test-data.ts`
- defensive script/Auth guards that preserve runtime failure behavior
- remaining advisory dashboard file-size warnings in query/action files
- large pages that mix helpers, view logic, and domain logic
- cross-domain oversized files

---

## Recommended linting/tooling stack

### Core stack

1. **ESLint (flat config)**
   - keep ESLint as the central lint orchestrator
   - extend the existing Next.js config rather than replacing it

2. **typescript-eslint (typed linting)**
   - enable type-aware linting
   - begin with recommended typed rules
   - stage stricter typed configs later

3. **Prettier**
   - keep Prettier responsible for formatting only
   - do not overload ESLint with stylistic rules that Prettier already solves well

4. **TypeScript compiler strictness**
   - tighten gradually
   - use compiler flags for correctness that lint alone cannot enforce well

5. **dependency-cruiser**
   - enforce architectural boundaries without forcing a premature directory rewrite

6. **Vitest coverage reporting**
   - surface coverage trends and support CI gating later

7. **CI enforcement**
   - start advisory, then progressively block regressions

### Why this stack fits AllMe

- it matches the current TypeScript/Next.js architecture
- it can be staged safely
- it addresses actual repo pain points: typing drift, async safety, complexity growth, and module sprawl
- it complements AI-assisted coding by making repo seams more explicit

---

## Rule catalog and rollout rationale

## A. Strong typing rules

Purpose: move correctness earlier and reduce stringly typed drift.

### Phase 1 candidates

- `@typescript-eslint/consistent-type-imports`
- `@typescript-eslint/no-floating-promises`
- `@typescript-eslint/no-misused-promises`
- `@typescript-eslint/no-unnecessary-condition`

### Phase 2 candidates

- `@typescript-eslint/switch-exhaustiveness-check`
- `@typescript-eslint/restrict-template-expressions`
- stricter compiler flags where safe

### Possible later TS compiler flags

Evaluate and enable in stages:

- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes`
- `noPropertyAccessFromIndexSignature`
- `noImplicitOverride`

### Success criteria

- fewer promise mistakes
- fewer implicit type/value import problems
- narrower runtime-only errors from nullable or string-path assumptions

---

## B. Complexity and nesting controls

Purpose: slow the growth of unreadable logic before it becomes normal.

### Initial settings

Start as warnings:

- `complexity`
- `max-depth`
- `max-lines-per-function`

### Suggested thresholds to start

These should be advisory first, not blocking:

- `complexity`: 12
- `max-depth`: 4
- `max-lines-per-function`: 80

### Notes

- do not make these hard failures across legacy UI immediately
- use them first in server and domain logic
- treat repeated warnings as decomposition prompts, not instant rewrite mandates

---

## C. File size / module sprawl controls

Purpose: stop already-large files from getting worse.

### Initial settings

Start as warnings:

- `max-lines`

### Suggested threshold

- `max-lines`: 350, excluding comments and blank lines

### Application strategy

- apply to core logic sooner
- apply to legacy UI later
- do not block the build on large legacy files until there is a cleanup path

---

## D. Unused code / cleanup rules

Purpose: reduce noise and token waste.

### Rules / behaviors

- unused imports cleanup
- consistent type imports
- dead helper identification
- safe unused variable handling with underscore conventions if needed

### Guidance

Prefer autofix for imports. Review variable cleanup manually where intent may matter.

---

## E. Import boundary / architecture rules

Purpose: prevent layer leakage and reduce architectural drift.

### Tool

- dependency-cruiser

### Initial forbidden dependency ideas

- app/page layer should not import deep DB internals directly where an approved seam exists
- shared presentational components should not import server internals
- circular dependencies should be surfaced

### Rollout guidance

- start by generating visibility/reporting
- then introduce a small number of high-confidence forbidden rules
- add more only after the graph is understood

---

## F. Naming and convention rules

Purpose: improve readability only after the core rollout is stable.

### Guidance

Do not lead with heavy naming rules. Only add them if they are clearly valuable and low-friction.

This category is lower priority than type safety, async correctness, complexity, and boundaries.

---

## Implementation phases

# Phase 0 — Scaffolding and visibility

## Goal

Set up the infrastructure without turning the codebase red.

## Tasks

1. audit current `eslint.config.*`, Prettier config, tsconfig, scripts, and CI
2. add or update typed ESLint scaffolding
3. add optional lint profiles or phased scripts
4. add dependency-cruiser config file
5. add coverage configuration to Vitest
6. add/update CI workflow
7. create `AGENTS.md` and `PLANS.md`
8. ensure commands are documented and discoverable

## Deliverables

- updated lint config(s)
- updated package scripts
- CI workflow file
- dependency-cruiser config
- coverage config
- repo guidance docs

## Validation

- configs parse correctly
- scripts run
- no large source refactor yet

## Risk level

Low

---

# Phase 1 — Core-safe enforcement

## Status

Complete.

## Goal

Enable high-value linting in the safest areas first.

## Target folders

- `src/server/**`
- `src/lib/**`
- `scripts/**`
- `src/features/finance/imports/**`
- `src/features/finance/categorization/**`

## Rules to emphasize

- `consistent-type-imports`
- `no-floating-promises`
- `no-misused-promises`
- `no-unnecessary-condition`
- advisory complexity / depth / function-size rules

## Workflow

1. run lint on target folders only if possible
2. classify failures by risk
3. apply safe autofixes first
4. patch low-risk manual issues
5. document deferred or high-risk findings

## Success criteria

- target folders are significantly cleaner
- no runtime behavior regressions introduced
- async and typing safety improved measurably

## Risk level

Low to medium

---

## Deferred warnings after Phase 1

The remaining `lint:minimal` warnings were intentionally documented rather than forced through risky cleanup. In Phase 2, these are handled by narrow file-level overrides so `lint:minimal` can act as a clean blocking gate while preserving runtime defenses.

### Defensive script guards

The script warnings were mostly `no-unnecessary-condition` findings around required user/account lookup guards. These checks preserve explicit failure paths for missing environment configuration or missing database rows. Removing them would make runtime failure behavior less clear and is not worth the lint-only benefit. Policy: narrow override.

### Defensive Auth.js callback guards

`src/server/auth/config.ts` has optional-chain/session guard warnings. Auth.js callback payloads are runtime-controlled, and the current checks defensively preserve behavior if a callback receives an incomplete user/session shape. These should remain until hosted-auth behavior is exercised more thoroughly. Policy: narrow override.

### Seed script size and nullable cleanup

`scripts/finance-seed-test-data.ts` has size, function-length, and nullable-condition warnings. This script is development-only, large by nature, and should be decomposed separately if test-data workflows become central. It is intentionally excluded from Phase 1 and Phase 2 semantic cleanup because splitting it would be a larger refactor. Policy: narrow override plus later refactor.

### Deferred schema file-size warning

`src/server/db/schema.ts` remains over the advisory file-size threshold. Schema files naturally accumulate table definitions, and splitting schema modules has migration/import-boundary consequences. Defer this until there is a clear database organization plan. Policy: narrow override plus later schema organization plan.

### Phase 2 regression-test target

Before moving to broader service/query/action hardening, add focused tests around:

- categorization operator behavior after helper extraction
- Fintable importer orchestration order after helper extraction
- conflict-target invariants for account, raw-record, balance, transaction, and import-run writes

---

# Phase 2 — Service/query/action hardening

## Status

Complete.

## Goal

Address seams where architecture and semantics are starting to blur.

## Target folders

- `src/features/finance/dashboard/queries.ts`
- `src/features/finance/dashboard/actions.ts`

Settings and Today query cleanup was intentionally deferred to Phase 5B after the finance dashboard work stabilized.

## Focus areas

- query/action responsibility separation
- surprise side effects in read paths
- stronger domain typing
- reducing fragile string assumptions

## Guardrail

Do not convert this phase into a broad domain rewrite. Prefer small clarifying extractions or wrappers.

## Success criteria

- clearer boundaries
- reduced side-effect confusion
- improved lint signal quality for future work

## Completion notes

- `src/features/finance/dashboard/queries.ts` was decomposed into smaller read helpers while preserving query behavior.
- `src/features/finance/dashboard/actions.ts` received behavior-preserving row guard cleanup.
- Regression tests were added for raw transaction detail extraction and importer/categorization behavior.

## Risk level

Medium

---

# Phase 3 — UI decomposition guided by lint findings

## Status

Complete.

## Goal

Reduce oversized UI surfaces without destabilizing behavior.

## Target zones

- oversized finance dashboard components
- large page files mixing helpers + rendering + logic
- duplicated formatting/helper logic across finance UI

## Strategy

1. choose one hotspot at a time
2. extract the smallest stable helper/component first
3. re-run lint/tests after each extraction
4. avoid combining visual tweaks with architectural extraction

## Typical work items

- extract formatting utilities
- extract filter state helpers
- extract modal-specific subcomponents
- reduce nested render logic

## Success criteria

- smaller prompt scopes for future changes
- clearer reuse paths
- fewer oversized files growing over time

## Completion notes

Phase 3 established the UI decomposition path and Phase 4A-D executed the finance dashboard component cleanup.

## Risk level

Medium to high

---

# Phase 4A-D — Finance dashboard component decomposition

## Status

Complete.

## Goal

Reduce oversized finance dashboard components into smaller, behavior-preserving modules before tightening enforcement.

## Completed slices

- Phase 4A: extracted recent transaction modal/tag-management concerns into same-folder components and shared dashboard types.
- Phase 4B: extracted transaction filter controls and pure filtering/date helpers.
- Phase 4C: extracted recent transaction ledger rendering, review banner, net footer, and row display.
- Phase 4D: extracted summary metric calculations and summary metric view rendering.

## Current dashboard component shape

- `src/features/finance/dashboard/components/recent-transactions.tsx` now primarily owns orchestration, state, effects, and modal coordination.
- `src/features/finance/dashboard/components/summary-metrics.tsx` now primarily owns lookback state, outside-click handling, calculation wiring, and review-event dispatch.
- Larger remaining dashboard files are known advisory cleanup candidates, not blocking failures.

## Deferred dashboard work

- `src/features/finance/dashboard/actions.ts` remains over the advisory file-size threshold.
- `src/features/finance/dashboard/queries.ts` remains over the advisory file-size threshold.
- `src/features/finance/dashboard/components/tag-manager-modal.tsx` and `transaction-filter-controls.tsx` are intentionally larger because they are self-contained UI modules. Do not split them again unless future edits make a concrete pain point obvious.

## Risk level

Medium

---

# Phase 5A — Documentation sync

## Status

Active.

## Goal

Bring project guidance docs in sync with the actual repo state before starting the next source cleanup phase.

## Scope

- `docs/PLANS.md`
- `docs/AGENTS.md`
- lowercase `docs/plan.md` only as a pointer to avoid stale-agent drift

## Success criteria

- Phases 2, 3, and 4A-D are marked complete.
- Current blocking vs advisory checks are explicit.
- Phase 5B target files are explicit.
- Deferred warning categories are documented.

## Risk level

Low

---

# Phase 5B — Targeted Settings and Today query cleanup

## Status

Next.

## Goal

Resolve low-risk advisory lint warnings in Settings and Today query modules without changing runtime behavior.

## Scope

- `src/features/settings/queries.ts`
- `src/features/today/queries.ts`
- related unit tests only if a helper extraction makes behavior less obvious

## Allowed work

- Remove or simplify clearly unnecessary conditions when behavior is unchanged.
- Replace unnecessary optional chains/nullish coalescing where types prove values are non-null.
- Extract tiny pure helpers only if that reduces risk or repeated local logic.

## Explicit non-goals

- Do not touch finance dashboard files in Phase 5B.
- Do not change database schema.
- Do not change Auth.js runtime logic.
- Do not broaden lint enforcement.
- Do not refactor settings or Today UI.

## Validation

- `npm run lint:minimal`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Advisory commands may be run to confirm warning reduction:

- `npm run lint:balanced`
- `npm run lint:strict`

## Risk level

Low to medium

---

# Later phase — Enforcement tightening

## Goal

Move from advisory tooling to durable guardrails.

## Tasks

- raise selected warnings to errors
- enable stronger TS flags if remaining issues are manageable
- enforce dependency rules in CI
- add coverage thresholds where appropriate
- optionally add stricter folder-based gating

## Success criteria

- regressions are blocked early
- developers can still work without constant tooling friction
- the quality system is sustainable, not performative

## Risk level

Medium

---

## Safe auto-fix strategy vs manual refactor strategy

## Safe auto-fix bucket

Use autofix freely when the chance of semantic change is very low.

Examples:

- type-only imports
- formatting
- obvious unused imports
- trivial config normalization

## Manual low-risk bucket

Patch after review.

Examples:

- adding explicit `await`
- adding `void` intentionally where promise fire-and-forget is correct
- narrowing conditions
- removing dead local helpers with obvious lack of usage

## Manual high-risk bucket

Do not batch these into the same patch as tooling setup.

Examples:

- splitting large components
- changing service/query responsibilities
- introducing batching behavior where sequential logic existed
- changing categorization rule field types or evaluation semantics
- rewriting import or state orchestration logic

---

## Codemod opportunities

These are good candidates for automation once the baseline is stable.

### Strong candidates

- convert imports to `import type` where appropriate
- remove unused imports
- normalize common ESLint/Prettier style issues
- optionally codemod repeated helpers into shared modules if usage is simple and isolated

### Possible later codemods

- migration toward shared formatting utilities
- mechanical extraction of duplicated helper names if imports are straightforward

### Avoid as early codemods

- large component decomposition
- service-layer purity refactors
- transformations that alter async execution order

---

## Guardrails for AI-assisted implementation

This section is meant specifically for Codex or similar agents.

### Mandatory behavior

- never begin with a repo-wide refactor
- always classify changes into autofixable / low-risk manual / high-risk manual
- show the patch plan before touching risky files
- prefer one phase at a time
- validate after each grouped change

### Hard stops

Stop and ask before proceeding if any task requires:

- touching large UI hotspots unexpectedly
- changing runtime behavior
- changing data flow across multiple layers
- large-scale file moves or renames
- edits across many modules with unclear blast radius

### Patch sizing rule

Prefer multiple small PR-sized changes over one large “quality sweep.”

---

## CI/CD enforcement plan

## Initial CI behavior

Phase 0 / Phase 1 prioritized visibility and safety.

Current blocking checks:

1. install dependencies
2. run `npm run lint:minimal`
3. run typecheck
4. run unit tests
5. run build

Advisory commands:

- `npm run lint:balanced`
- `npm run lint:strict`
- `npm run coverage`
- `npm run depcruise`

These advisory commands should remain available locally until their warning output is reviewed and the team explicitly decides which checks should become blocking.

## Later CI behavior

Once the repo is stable:

- fail on target lint rules
- fail on forbidden dependency rules
- fail on regression in agreed coverage thresholds
- optionally fail on new warnings in scoped areas

## Important policy

Do not let CI hard-fail on legacy warnings everywhere too early. Scope enforcement or phase it in.

---

## Metrics for success

Track trends, not just raw counts.

### Recommended metrics

- total lint violations by rule
- violations by folder
- count of autofixable vs manual findings
- files exceeding size threshold
- functions exceeding size threshold
- modules exceeding complexity threshold
- dependency boundary violations
- number of circular dependencies
- count of suppressions added (`eslint-disable`, `@ts-expect-error`)
- typecheck failures by folder
- coverage trend over time
- CI pass rate
- median time to resolve lint regressions

### Good signs

- core logic folders stabilize first
- new violations trend toward zero
- large files stop growing
- fewer multi-file AI prompts are needed for routine tasks

---

## Token usage and AI-assisted development impact

Strong linting will not magically reduce token usage by itself, but it will improve the structure that determines token consumption.

### Expected benefits

1. **Smaller edit scopes**
   When files and functions are bounded, AI tools can work on one smaller surface instead of loading a large umbrella component.

2. **Clearer boundaries**
   If queries, actions, helpers, and UI concerns are separated better, fewer adjacent files must be loaded to make safe edits.

3. **Less duplicated logic**
   Shared utilities reduce the need to inspect multiple copies of similar code.

4. **Fewer debug loops**
   Type-aware linting and stricter compiler checks catch issues before they become multi-turn AI debugging sessions.

5. **Better prompt specificity**
   More explicit types and narrower modules make it easier to issue precise instructions to AI tools.

### Practical expectation for AllMe

The biggest token benefits will come later, especially when:

- oversized finance UI files are decomposed
- duplicated format helpers are centralized
- service/query boundaries are clearer
- linting prevents new monoliths from forming

### Important nuance

Config-only linting does not save many tokens immediately. The token savings come from the codebase shape that linting gradually enforces.

---

## First implementation tasks for Codex

When beginning actual implementation, use this exact order:

1. inspect current quality tooling files
2. propose a Phase 0 patch plan
3. add `AGENTS.md` and `PLANS.md`
4. update or add lint config scaffolding
5. add package scripts
6. add dependency-cruiser config
7. add coverage config
8. update/add CI workflow
9. run the smallest relevant validation set
10. report findings grouped by risk
11. begin Phase 1 only after scaffolding is stable

---

## What not to do

- do not enable every strict rule at once
- do not refactor the whole finance dashboard first
- do not mix setup, autofix, and architectural cleanup into one giant patch
- do not silently alter async behavior under the label of lint cleanup
- do not treat every warning as something that must be fixed immediately

---

## Definition of done for the initial rollout

The initial rollout is successful when:

- the repo has a durable lint/static-analysis framework
- the core logic folders have meaningful typed lint enforcement
- CI can surface quality regressions reliably
- risky legacy hotspots are documented and queued rather than impulsively rewritten
- the repo is easier for both humans and AI tools to modify safely
