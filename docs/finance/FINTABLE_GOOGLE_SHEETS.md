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
