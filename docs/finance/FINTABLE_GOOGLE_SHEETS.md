# Fintable Google Sheets Contract

This document records the current Fintable output shape used by AllMe. It intentionally contains column names only, not personal account or transaction data.

## Source

- Provider: Fintable
- Destination: Google Sheets
- Current account coverage: Fidelity investment accounts, Chase checking, Chase credit card
- Current history depth: 30 months

## Accounts Sheet

Expected headers:

```text
⚡ Account Name
⚡ Balance
⚡ Currency
Notes
⚡ Last Update
⚡ Institution
⚡ Account ID
⚡ Raw Data
```

Initial mapping:

- `⚡ Account Name` -> account display name
- `⚡ Balance` -> balance snapshot amount
- `⚡ Currency` -> account currency
- `Notes` -> optional local note from the sheet
- `⚡ Last Update` -> Fintable's last account update timestamp/date
- `⚡ Institution` -> financial institution name
- `⚡ Account ID` -> stable source account identifier
- `⚡ Raw Data` -> original provider payload when present

## Transactions Sheet

Expected headers:

```text
⚡ Date
⚡ Amount
⚡ Description
⚡ Category
⚡ Account
Attachment
⚡ Transaction ID
⚡ Raw Data
```

Initial mapping:

- `⚡ Date` -> posted transaction date
- `⚡ Amount` -> signed transaction amount
- `⚡ Description` -> transaction description
- `⚡ Category` -> Fintable category
- `⚡ Account` -> source account display name
- `Attachment` -> optional attachment reference
- `⚡ Transaction ID` -> stable source transaction identifier
- `⚡ Raw Data` -> original provider payload when present

## Import Rules

- Store every imported source row as a raw record before normalizing.
- Use `⚡ Account ID` as the source account key for accounts.
- Use `⚡ Transaction ID` as the source transaction key when present.
- Generate deterministic fingerprints for idempotent transaction imports.
- Keep the Google Sheet as an input source only; user-facing finance pages should read normalized database tables.
- Use fake rows in tests. Do not commit real account names, balances, or transactions.

## Implemented In Code

Current implementation:

- `src/features/finance/integrations/fintable/headers.ts` stores exact expected Fintable headers.
- `src/features/finance/integrations/fintable/parser.ts` validates headers and parses row objects into normalized account and transaction shapes.
- `src/features/finance/integrations/fintable/google-sheets.ts` reads Google Sheets values, converts them into row objects, validates the header contract, and feeds rows into the Fintable parser.
- `scripts/fintable-dry-run.ts` can test the configured sheet connection and print only counts, never account or transaction details.
- `tests/unit/finance/fintable-parser.test.ts` covers parser behavior with fake rows.
- `tests/unit/finance/fintable-google-sheets.test.ts` covers Google Sheets value conversion and parsing with fake rows.

Current limitations:

- The Google Sheets reader only fetches and parses rows.
- It does not write to PostgreSQL yet.
- It does not perform OAuth yet. The current reader expects an API key and a sheet that can be read by that key.
- Holdings are not mapped yet because the current confirmed sheet headers only cover `Accounts` and `Transactions`.

## Environment Variables

Expected local configuration:

```text
GOOGLE_SHEETS_API_KEY=""
FINTABLE_SPREADSHEET_ID=""
FINTABLE_ACCOUNTS_RANGE="Accounts!A:H"
FINTABLE_TRANSACTIONS_RANGE="Transactions!A:H"
```

The range names should match the actual Google Sheets tab names. If Fintable uses different tab names, only the range values need to change.

## Dry Run

After local environment variables are configured, run:

```bash
npm run finance:fintable:dry-run
```

Expected output is limited to counts:

```text
Fintable dry run succeeded.
Accounts parsed: 3
Transactions parsed: 1200
```

The command intentionally does not print account names, balances, merchants, or transaction amounts.
