# AllMe Linting Plan

This is the lowercase entry point for the linting and static-analysis rollout.
The full background plan lives in `docs/PLANS.md`; use this file as the compact
execution checklist.

## Rollout Order

1. Phase 0: scaffolding and visibility only.
2. Phase 1: core/server-safe enforcement.
3. Phase 2: service/query/action hardening.
4. Phase 3: UI decomposition guided by lint findings.
5. Phase 4: stricter enforcement after cleanup.

## Phase 0 Scope

- Audit existing quality tooling.
- Add staged ESLint profile scaffolding.
- Add Prettier ignore coverage for generated files.
- Add dependency-cruiser configuration.
- Add Vitest coverage configuration.
- Add package scripts for staged commands.
- Update CI without making advisory tools block unexpectedly.
- Create repo guidance docs for future agents.

## Phase 0 Constraints

- Do not refactor runtime source.
- Do not touch large UI hotspot files.
- Do not make architecture changes.
- Do not install new dependencies without explicit user approval.
- Keep current baseline checks green.

## Later Phases

- Phase 1 targets `src/server/**`, `src/lib/**`, `scripts/**`,
  `src/features/finance/imports/**`, and
  `src/features/finance/categorization/**`.
- Phase 2 targets finance dashboard query/action seams, settings, and Today.
- Phase 3 targets oversized UI files one at a time.
