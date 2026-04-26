# Development Workflow

## Version Control

- Main branch: `main`
- Remote: `git@github.com:dpjosh02/AllMe.git`
- Keep commits focused and push after verified increments.
- Do not commit personal working journals, agent files, service account JSON, `.env`, `.env.local`, or real financial exports.

## Local Setup

Run from the repo root:

```bash
cd ~/Documents/AllMe
npm install
```

Required local environment file:

```text
.env.local
```

This file is ignored by Git.

## Verification

Run before committing meaningful code changes:

```bash
npm run verify
npm run build
```

`npm run verify` runs:

- ESLint
- TypeScript typecheck
- Vitest unit tests

## Database Workflow

Local Postgres is expected at:

```text
postgres://postgres:postgres@localhost:5432/allme
```

Apply migrations:

```bash
npm run db:migrate
```

Generate migrations after schema changes:

```bash
npm run db:generate
```

## Finance Import Workflow

Check private Fintable sheet access without writing to the database:

```bash
npm run finance:fintable:dry-run
```

Write parsed Fintable data to PostgreSQL:

```bash
npm run finance:fintable:import
```

The importer should remain idempotent. Re-running it should update existing rows rather than duplicate accounts, transactions, balances, or raw records.

## Security Rules

- Keep service account JSON files outside the repo.
- Keep `.env.local` out of Git.
- Do not print transaction details in scripts unless explicitly building a local debugging tool.
- Prefer count/status output for import scripts.
- Keep raw financial rows in `finance_raw_records`, not in committed test fixtures.
