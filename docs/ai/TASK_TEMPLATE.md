# AI Task And Decision Packet Template

Copy this template into a task, PR comment, or `docs/ai/decisions/` when a
role-based Codex session needs durable context.

## Task Packet

```md
# <Short Task Name>

## Role

<Product Manager | Architect | UI/UX | Data/DB | Principal Engineer | QA Reviewer | Release Integrator>

## Goal

<One or two sentences describing the intended outcome.>

## Context

- Product invariant:
- Current roadmap milestone:
- Relevant docs:
- Related prior decision:

## PM Brief

- Milestone:
- Why now:
- User value:
- Acceptance criteria:
- Non-goals:
- Required roles:
- Protected files:

## Owned Files

- <files this session may edit>

## Read-Only Files

- <files this session should inspect but not edit>

## Forbidden Or Requires Approval

- <files or behaviors outside scope>

## High-Risk Areas

- <db/migrations/\*, schema, auth, proxy/app API routes, provider writes, calendar sync/integrations, finance imports, package.json/package-lock.json, quality-tooling config, etc.>

## Proposed Decision

<What should be true after this work?>

## Rationale

<Why this is the right narrow change now?>

## Acceptance Criteria

- <observable outcome>
- <observable outcome>

## Validation Plan

- <command or manual check>
- <command or manual check>

## Handoff Notes

- Next role:
- Open questions:
- Residual risk:
```

## Decision Packet

```md
# Decision: <Short Name>

Date: <YYYY-MM-DD>
Status: <Proposed | Accepted | Superseded>
Role: <Role that authored the decision>

## Decision

<The decision in clear, direct language.>

## Scope

- In scope:
- Out of scope:

## Invariants

- App-owned PostgreSQL remains the source of truth.
- Third-party integrations remain adapters.
- Finance imports remain idempotent and auditable.
- Calendar provider writes remain explicit, guarded, audited, and reconciled.

## Consequences

- Positive:
- Tradeoffs:
- Follow-up:

## Files Affected

- <file or directory>

## Validation

- <command or check>

## Handoff

- Next role:
- Integration notes:
```
