# Auth Boundary

This document defines the current authentication boundary for AllMe without storing credentials, user secrets, or provider identifiers.

## Current Mode: Local Owner

AllMe currently runs as a personal local application. The app resolves the owner from `ALLME_IMPORT_USER_EMAIL`, stores owner preferences in Postgres, and assumes the browser user is the local owner.

This is acceptable for local development and personal use on the owner's machine. It is not acceptable as a public deployment boundary.

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

- `/api/auth/*`
- `/_next/*`
- `/favicon.ico`

## Hosted Mode Decision

Before AllMe is deployed beyond local personal use:

- Configure `AUTH_SECRET`.
- Configure Google OAuth client id and secret.
- Add route middleware or page guards for product routes.
- Map the signed-in Google identity to an app user before reading app data.
- Keep third-party credential values and provider identifiers out of rendered pages and logs.

## Current Implementation

The first implementation slice is intentionally non-blocking:

- `src/server/auth/access-control.ts` defines the route boundary and auth modes.
- `/settings` renders the current boundary status so the owner can see whether the app is in local-owner mode or ready for hosted Google sign-in.
- No middleware enforcement is active yet, because local owner mode remains the correct default for the current personal build.
