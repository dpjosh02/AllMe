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

Normal sequence:

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
