# Development Status

This document records project-facing progress and workflow decisions. It should not contain personal notes, credentials, account names, balances, merchants, or transaction details.

## Current State

AllMe has a working foundation and a first finance read path.

Implemented:

- Next.js app foundation with TypeScript, Tailwind, ESLint, Vitest, Playwright config, Drizzle, and GitHub Actions.
- PostgreSQL schema and migrations for users, notes, finance connections, import runs, raw records, accounts, balance snapshots, holdings snapshots, and transactions.
- Fintable Google Sheets contract for `Accounts` and `Transactions`.
- Private Google Sheets access through a Google service account.
- Fintable dry-run command that reads and parses the private sheet without printing financial details.
- Fintable import command that writes parsed data into PostgreSQL.
- First `/finance` dashboard backed by imported Postgres data.

## Verified Local Import

First real Fintable import succeeded against local Postgres.

Imported counts:

```text
Accounts upserted: 6
Balance snapshots upserted: 6
Transactions upserted: 115
Raw records upserted: 121
Unmatched transactions skipped: 0
```

Database count check:

```text
accounts: 6
transactions: 115
raw_records: 121
import_runs: 1
```

## Current Local Services

- Local Postgres runs in Docker as `allme-postgres`.
- App dev server runs with `npm run dev`.
- Existing dev server may already be on `http://localhost:3000`.
- The `/finance` route reads from the local Postgres database configured by `DATABASE_URL`.

## Key Commands

```bash
npm run verify
npm run build
npm run db:migrate
npm run finance:fintable:dry-run
npm run finance:fintable:import
npm run dev
```

## Current Git History

Recent project milestones:

```text
0ab41eb Add finance dashboard page
93eb9c9 Fix Fintable import setup
30673f2 Load local env in Drizzle config
c1bbe50 Add Fintable database import pipeline
649799b Support private Fintable sheet access
a4b31da Add Fintable Google Sheets reader
bc605ba Add Fintable sheet parsing contract
24e7cc2 Scaffold milestone zero foundation
aa4df6f Initial project blueprint
```

## Near-Term Next Steps

1. Add app navigation so `/`, `/finance`, and future sections share one shell.
2. Add a finance account detail page.
3. Add transaction filtering and search.
4. Add a visible import status/history page.
5. Move from manual import command to a controlled in-app import trigger.
6. Add holdings support if Fintable exposes a holdings sheet or usable raw investment payload.
