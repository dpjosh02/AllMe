# AI Workstreams

Use this file to choose the right role for a Codex session and to keep file
ownership clear.

## Role Selection

| Role               | Use when                                                                                                   | Typical output                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Product Manager    | A new slice needs selection, backlog ordering, acceptance criteria, non-goals, or specialist-role routing. | PM brief, updated next-slice queue, role/file routing.                     |
| Architect          | The task changes domain boundaries, sequencing, contracts, or roadmap interpretation.                      | Decision packet, architecture doc update, scoped implementation plan.      |
| UI/UX              | The task changes product surfaces, interaction flows, layout, visual hierarchy, or design-system usage.    | UI plan, component-level guidance, copy/state inventory, focused UI patch. |
| Data/DB            | The task changes schema, migrations, queries, imports, audit trails, or persistence contracts.             | Migration plan, schema patch, data invariants, focused tests.              |
| Principal Engineer | The task needs implementation strategy, decomposition, refactoring judgment, or cross-module code changes. | Narrow implementation plan or patch with validation.                       |
| QA Reviewer        | The task needs review, regression analysis, acceptance criteria, or test planning.                         | Findings, test gaps, verification plan, review packet.                     |
| Release Integrator | Multiple workstreams need merge, validation, release notes, or PR preparation.                             | Integrated branch, validation report, release/PR summary.                  |

## Recommended Boundaries

Product Manager work:

- owns `docs/ai/NEXT_SLICES.md` and PM briefs in task packets
- may edit planning docs when assigned
- does not edit product source code
- routes work to Architect for boundary/contract questions, UI/UX for product
  surfaces, Data/DB for persistence, Principal Engineer for implementation, QA
  Reviewer for acceptance/regression review, and Release Integrator for merge
  and release coordination

Architecture work:

- owns `docs/architecture/**`, `docs/ROADMAP.md`, `docs/PROJECT_BLUEPRINT.md`,
  and relevant decision records
- reads all touched implementation areas
- avoids source edits unless explicitly requested

UI/UX work:

- owns assigned route/page presentation files under `src/app/**`,
  `src/components/**`, UI-specific files under `src/features/**`, and
  `docs/ALLME_DESIGN_SYSTEM.md` when assigned
- avoids route handlers, server actions, guarded data access, schema, auth,
  imports, and provider-write policy changes unless the task packet assigns
  that scope

Data/DB work:

- owns `src/server/db/schema.ts`, `db/migrations/**`, data access helpers, import
  persistence code, and database tests when assigned
- coordinates before touching UI flows or package scripts

Principal engineering work:

- owns implementation slices that cross feature/server boundaries after a
  packet defines scope
- avoids changing product scope or schema semantics without architect/data input

QA/review work:

- owns tests and review reports when assigned
- should not silently rewrite implementation while reviewing unless the user
  explicitly asks for fixes

Release integration work:

- owns merge order, conflict resolution, final validation, PR notes, and
  changelog/release summaries
- coordinates shared files such as `package.json`, generated migrations, and
  lockfiles

## Shared Files

Treat these as shared files by default:

- `package.json`
- `package-lock.json`
- `proxy.ts`
- `src/app/api/**`
- `src/server/db/schema.ts`
- `db/migrations/**`
- `db/migrations/meta/**`
- `src/server/auth/**`
- `src/features/calendar/actions.ts`
- `src/features/calendar/provider-write-policy.ts`
- `src/features/calendar/provider-write/**`
- `src/features/calendar/integrations/**`
- `src/features/calendar/sync/**`
- `src/features/finance/imports/**`
- `src/app/globals.css`
- layout primitives under `src/components/layout/**`
- CI, lint, format, typecheck, coverage, and dependency-boundary configuration

Shared files need an owner for the current workstream. Parallel sessions should
not edit them independently.

## Product Manager Routing

The PM should keep `docs/ai/NEXT_SLICES.md` current and recommend the next slice
after reviewing roadmap, development status, recent commits, and unfinished
acceptance criteria. Candidate slices should be scored by roadmap alignment,
user value, dependency unlock, implementation risk, testability, and
cross-domain debt risk.

PM output is planning input, not permission to cross high-risk boundaries. If a
candidate changes architecture, schema, auth, provider writes, finance imports,
or validation policy, PM routes to the relevant specialist before
implementation starts.

## Workstream Packet Checklist

Every workstream should state:

- role
- PM brief when the slice is newly selected
- goal
- owned files
- read-only files
- high-risk files
- acceptance criteria
- validation commands
- handoff target
