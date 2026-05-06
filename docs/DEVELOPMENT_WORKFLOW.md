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

## Security Reminders

- Keep service account JSON files outside the repo.
- Keep `.env.local` and real provider credentials out of Git.
- Do not commit real financial exports, account names, balances, merchants, or
  transaction details.
- Prefer count/status output for finance import scripts.
- Keep raw financial rows in `finance_raw_records`, not committed fixtures.
- For Fintable details, use `docs/finance/FINTABLE_GOOGLE_SHEETS.md`.
