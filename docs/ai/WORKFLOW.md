# AI Development Workflow

This workflow bootstraps lightweight role-based Codex sessions for AllMe. It is
documentation and coordination scaffolding only. It does not define, imply, or
require a runtime agent system.

## Principles

- One Codex session has one role, one task, and one owned file set.
- The Product Manager role starts each new slice by choosing or confirming the
  slice, writing the PM brief, and naming required specialist roles.
- Handoffs happen through decision packets, not autonomous agent chat.
- App-owned PostgreSQL is the source of truth.
- Third-party integrations are adapters.
- Finance imports remain idempotent and auditable.
- Calendar provider writes remain explicit, guarded, audited, and reconciled.
- Finance does not expand beyond the active roadmap.

## Session Start

1. Read `AGENTS.md`.
2. Read the role guide from `docs/ai/roles/`.
3. For a new slice, start with the Product Manager role and
   `docs/ai/NEXT_SLICES.md`; for assigned implementation/review work, read the
   task packet or create one from `docs/ai/TASK_TEMPLATE.md`.
4. Confirm the owned files and forbidden files.
5. Check the working tree before editing.
6. Choose the smallest validation set before implementation starts.

## Context Hygiene

- Each doc should have one job.
- Do not duplicate canonical roadmap, design, auth, provider-write, or
  quality-tooling guidance.
- Role docs should link to canonical docs instead of restating them at length.
- Read only the docs relevant to the current task, plus required safety docs for
  touched areas.
- For small UI tasks, do not load every architecture document.
- For schema, auth, finance import, or Calendar provider-write tasks, read the
  relevant architecture/domain docs before coding.
- Keep `docs/ai/NEXT_SLICES.md` limited to active work and near-term
  candidates.
- Keep decision packets specific to one slice.
- Docs should reduce future prompt length, not increase it.

## What To Read By Task Type

| Task type                          | Read first                                                                                                                                                     |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New slice planning                 | `AGENTS.md`, `docs/ai/roles/PRODUCT_MANAGER.md`, `docs/ai/NEXT_SLICES.md`, `docs/ROADMAP.md`, `docs/DEVELOPMENT_STATUS.md`                                     |
| Architecture decision              | `AGENTS.md`, `docs/ai/roles/ARCHITECT.md`, `docs/ROADMAP.md`, `docs/PROJECT_BLUEPRINT.md`, relevant `docs/architecture/**`                                     |
| UI/UX work                         | `AGENTS.md`, `docs/ai/roles/UI_UX.md`, `docs/ALLME_DESIGN_SYSTEM.md`, relevant page/component files, active decision packet                                    |
| Data/database work                 | `AGENTS.md`, `docs/ai/roles/DATA_DB.md`, `docs/PROJECT_BLUEPRINT.md`, `src/server/db/schema.ts`, relevant migrations, active decision packet                   |
| Principal engineering              | `AGENTS.md`, `docs/ai/roles/PRINCIPAL_ENGINEER.md`, active decision packet, relevant source files, relevant domain docs                                        |
| QA/review                          | `AGENTS.md`, `docs/ai/roles/QA_REVIEWER.md`, active decision packet, current git diff, relevant canonical docs                                                 |
| Release/integration                | `AGENTS.md`, `docs/ai/roles/RELEASE_INTEGRATOR.md`, active decision packet, `docs/DEVELOPMENT_STATUS.md`, validation results                                   |
| Calendar provider-write work       | `AGENTS.md`, `docs/architecture/CALENDAR_PROVIDER_WRITE_CONTRACT.md`, `docs/ai/roles/ARCHITECT.md`, `docs/ai/roles/DATA_DB.md`, relevant Calendar source/tests |
| Finance import/categorization work | `AGENTS.md`, `docs/ROADMAP.md`, relevant finance docs, relevant finance import/categorization source/tests                                                     |
| Quality/lint/static-analysis work  | `docs/AGENTS.md`, `docs/PLANS.md`                                                                                                                              |

## Decision Packets

A decision packet is the durable handoff format between role sessions. It can
live in the task description, a PR comment, or `docs/ai/decisions/` when the
decision should persist.

Use packets for:

- architecture decisions
- schema or migration plans
- auth boundary changes
- provider-write changes
- finance import behavior changes
- release integration notes
- QA findings that require product or architecture judgment

Do not rely on hidden context from another Codex session. If a future session
needs the context, put it in the packet.

PM-created candidate slices live in `docs/ai/NEXT_SLICES.md`. Architect-created
decision packets live in task packets or `docs/ai/decisions/` when they change
durable architecture, policy, or ownership.

## Slice Lifecycle

1. Product Manager selects or updates a candidate in `docs/ai/NEXT_SLICES.md`.
2. Product Manager writes a PM brief with milestone, why now, user value,
   acceptance criteria, non-goals, required roles, and protected files.
3. Specialist roles implement, review, or integrate within the assigned file
   ownership.
4. Release Integrator reports what shipped.
5. Product Manager updates `docs/ai/NEXT_SLICES.md` after release or
   retrospective: move completed work, refresh blocked/deferred items, and pick
   the next candidate when appropriate.

## Worktree Workflow

Use worktrees when two or more sessions may run in parallel:

```bash
git worktree add ../AllMe-ui-shell -b codex/ui-shell
git worktree add ../AllMe-calendar-policy -b codex/calendar-policy
```

Safe parallelism rules:

- Split work by stable ownership boundaries, not by arbitrary file count.
- Keep one integration lane for shared config, migrations, generated metadata,
  and lockfiles.
- Do not let two sessions generate migrations independently for the same base.
- Do not let two sessions edit `package.json` independently.
- Do not let two sessions edit quality-tooling config or CI gates
  independently.
- Release integration owns final merge order and conflict resolution.

## Conflict Boundaries

Before editing, classify the files:

- `Owned`: files this session may edit.
- `Read-only`: files this session may inspect but not edit.
- `Shared`: files that require coordination before edit.
- `Forbidden`: files outside task scope.

Escalate with a decision packet when a needed change crosses from owned into
shared or forbidden files.

## Validation

Run validation proportional to risk:

- Documentation-only: format check if practical; otherwise manual Markdown
  review is acceptable.
- Quality-tooling docs/config: follow `docs/AGENTS.md` and `docs/PLANS.md`;
  keep `lint:minimal` blocking and `lint:balanced`, `lint:strict`, coverage,
  and dependency-cruiser advisory unless explicitly promoted.
- Small UI copy/layout: `npm run lint:minimal` and targeted browser/screenshot
  checks when UI behavior changes.
- TypeScript logic: `npm run lint:minimal`, `npm run typecheck`, and focused
  tests.
- Database/auth/import/provider-write: focused tests plus relevant blocking
  checks; run `npm run verify` before integration when feasible.

Report:

- commands run
- commands skipped and why
- residual risk
- files changed

## Stop Conditions

Stop and write a decision packet instead of continuing when:

- the task requires new dependencies
- product scope expands beyond the roadmap
- finance capability expands without roadmap approval
- calendar writes would bypass the provider-write contract
- auth changes weaken the hosted-first boundary
- migrations conflict with another workstream
- source refactoring becomes broad enough to obscure behavior review
