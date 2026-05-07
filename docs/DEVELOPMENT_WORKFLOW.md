# Development Workflow

This is a short command and security index for local development. It should
link to canonical docs instead of restating project status, AI workflow,
lint/static-analysis rollout, or finance import contracts.

## Canonical References

- Global Codex workflow: `AGENTS.md`
- AI role workflow: `docs/ai/WORKFLOW.md`
- Current project status: `docs/DEVELOPMENT_STATUS.md`
- Active roadmap: `docs/ROADMAP.md`
- Lint/static-analysis guidance: `docs/AGENTS.md` and `docs/PLANS.md`
- Fintable import contract: `docs/finance/FINTABLE_GOOGLE_SHEETS.md`

## Local Setup

Run from the repo root:

```bash
cd ~/Documents/AllMe
npm install
```

Local environment lives in `.env.local`, which is ignored by Git.

## Common Commands

```bash
npm run dev
npm run verify
npm run build
npm run db:migrate
npm run db:generate
npm run finance:fintable:dry-run
npm run finance:fintable:import
npm run finance:categorize
```

Use `npm run verify` before committing meaningful code changes. It runs the
blocking lint, typecheck, and unit-test checks.

## Slice Coordinator CLI

Use the local slice coordinator for role-based AI work that needs separate plan
and implementation worktrees. Run it from a clean `main` worktree unless the
command explicitly targets the plan or implementation worktree.

### Guided Slice Coordinator

The guided coordinator automates the repetitive branch/worktree steps while
leaving role work in separate Codex sessions. It prints the next prompt and the
folder to open; it does not spawn independent conversations.

Normal guided sequence:

```bash
npm run slice:guide -- start <slice-slug> --description "<slice description>"
npm run slice:guide -- plan-ready <slice-slug>
npm run slice:guide -- specialist-ready <slice-slug>
npm run slice:guide -- impl-ready <slice-slug>
npm run slice:guide -- qa-ready <slice-slug>
npm run slice:guide -- cleanup <slice-slug>
```

Use `npm run slice:guide -- status <slice-slug>` to inspect main, plan, and
implementation worktrees, branch merge state, changed files, and the next
recommended command.

Mental model:

- `../allme-<slice-slug>-plan` is the docs-only planning worktree on
  `codex/plan-<slice-slug>`.
- `../allme-<slice-slug>-impl` is the product-code implementation worktree on
  `codex/impl-<slice-slug>`.
- `main` receives only the finalized integrated slice.

Approval gates:

- Planning and implementation commits ask before committing.
- Plan-to-implementation merges ask before merging.
- Implementation-to-main merge asks before merging and never pushes by default.
- Cleanup asks before removing worktrees or deleting branches.
- Force cleanup requires explicit `--force`; remote branch deletion requires
  explicit `--delete-remote`.

The plan worktree may contain only `docs/ai/**`,
`docs/DEVELOPMENT_STATUS.md`, and `AGENTS.md` when workflow docs changed. Product
source belongs in the implementation worktree after the plan is approved and
merged forward. Role-specific behavior remains documented in
`docs/ai/roles/`.

Manual fallback sequence:

```bash
npm run slice:start -- notes-capture-detail --link-env
cd ../allme-notes-capture-detail-plan
npm run slice:commit-plan -- notes-capture-detail
cd ../allme-notes-capture-detail-impl
npm run slice:merge-plan -- notes-capture-detail
npm run slice:commit-impl -- notes-capture-detail --all --message "type(scope): summary"
npm run slice:verify -- notes-capture-detail
cd ../AllMe
npm run slice:close -- notes-capture-detail
npm run slice:cleanup -- notes-capture-detail
```

Use `npm run slice:status -- <slice-slug>` to inspect worktrees and branch merge
state. `slice:close` does not push; it prints the `git push origin main`
command after a successful local merge.

## Security Reminders

- Keep service account JSON files outside the repo.
- Keep `.env.local` and real provider credentials out of Git.
- Do not commit real financial exports, account names, balances, merchants, or
  transaction details.
- Prefer count/status output for finance import scripts.
- Keep raw financial rows in `finance_raw_records`, not committed fixtures.
- For Fintable details, use `docs/finance/FINTABLE_GOOGLE_SHEETS.md`.
