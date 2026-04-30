# AllMe Agent Guide

This file is the working guide for AI-assisted development in AllMe. On macOS,
`docs/AGENTS.md` and `docs/agents.md` resolve to the same file, so treat this as
the lowercase `docs/agents.md` reference requested by the project owner.

## Current Focus

AllMe is in a foundation-hardening phase. The current linting/static-analysis
work must follow `docs/plan.md` and should roll out incrementally.

## Linting Rollout Rules

- Execute only the active phase requested by the user.
- Phase 0 is scaffolding only: configuration, scripts, CI wiring, and docs.
- Do not start broad refactors during Phase 0.
- Do not touch large UI hotspot files unless the user explicitly approves.
- Prefer mechanical/autofixable changes before manual code edits.
- Treat typed linting, dependency boundaries, and coverage as staged gates.
- Do not install new dependencies unless the user explicitly approves the install.

## Risk Boundaries

- Autofixable: formatting, import sorting/removal, type-only import conversion.
- Low-risk manual: config changes, scoped lint suppression with rationale, small
  server/core cleanup.
- High-risk manual: behavior changes, large UI file decomposition, query/action
  architecture changes, database schema changes.

## Validation Expectations

- Run the smallest relevant command after each grouped change.
- For config-only changes, validate config parsing and existing baseline checks.
- Report remaining issues by folder and risk level.
- Keep unrelated worktree changes isolated.

## Reporting Format

When finishing quality-tooling work, report:

- Files changed.
- Validation commands run.
- Remaining blockers or dependency approvals needed.
- Suggested next phase or next review target.
