# Auth Boundary

This document defines the current authentication boundary for AllMe without storing credentials, user secrets, or provider identifiers.

## Current Mode: Hosted-First With Local Development Escape Hatch

AllMe uses `ALLME_AUTH_MODE` to decide how private product routes are guarded.

- `hosted`: requires Google sign-in and allows only `ALLME_IMPORT_USER_EMAIL`.
- `local-owner`: resolves the owner from `ALLME_IMPORT_USER_EMAIL` without browser sign-in.

Production defaults to `hosted`, and `local-owner` is rejected in production. Development and test default to `local-owner` so the personal local workflow remains usable.

## Product Routes

These routes contain or will contain private personal data and should be considered protected product routes:

- `/`
- `/today`
- `/finance`
- `/notes`
- `/calendar`
- `/progress`
- `/settings`

Nested product routes inherit the same boundary. For example, `/finance/accounts/[accountId]` is part of the Finance product boundary.

## Public Routes

The intended public surface is limited to framework assets and auth endpoints:

- `/signin`
- `/unauthorized`
- `/api/auth/*`
- `/_next/*`
- `/favicon.ico`
- `/robots.txt`
- `/sitemap.xml`

## Hosted Mode Requirements

Hosted mode requires:

- Configure `AUTH_SECRET`.
- Configure Google OAuth client id and secret.
- Keep `ALLME_IMPORT_USER_EMAIL` set to the only allowed Google account.
- Keep a matching `users.email` row in Postgres.
- Keep third-party credential values and provider identifiers out of rendered pages and logs.

## Current Implementation

The implementation uses multiple layers:

- `proxy.ts` performs an early request gate for protected product routes.
- Auth.js callbacks reject non-owner Google sign-ins.
- `src/server/auth/guards.ts` protects server-rendered pages and server actions before private data is read or mutated.
- Finance and Settings data paths scope database reads/writes by the authorized `userId`.
- `/settings` renders the current boundary status without exposing secrets.

Proxy protection is not treated as sufficient by itself. Server-side guards are required for every private page and mutation path.
