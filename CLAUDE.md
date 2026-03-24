# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npm run db:push      # Apply Drizzle schema to the database (no migrations, direct push)
npm run db:generate  # Generate Drizzle migration files
```

No test suite is configured.

## Environment Variables

| Variable | Purpose |
|---|---|
| `POSTGRES_URL` | Vercel Postgres connection string (required) |
| `SA_ID_HASH_SALT` | Salt for SHA-256 hashing of SA ID numbers — required for registration to complete |
| `CURRENT_WEEK_ID` | Override the current ISO week (e.g. `2026-W05`) — useful for testing without waiting for a real week boundary |

## Architecture

This is a Next.js 16 app using the App Router. All pages are served from a single catch-all route at `src/app/[...slug]/page.tsx`, which dispatches to page components via a route map in `src/app/routes.ts`. To add a new page, register it in `routes.ts` — do not add new `page.tsx` files under `src/app/`.

### Routing pattern

```
src/app/routes.ts          — maps URL slug → component + routing config
src/app/[...slug]/page.tsx — reads routes.ts and renders the matched component
```

Token-based routes (`/r/:token`, `/register/:token`, `/p/:token`, `/predict/:token`) pass the token as `params: Promise<{ token: string }>` to the page component. Page components that need server-side DB access are async server components; client interactivity lives in separate `"use client"` form components they render.

### Component conventions

```
src/components/pages/    — server components (async, DB access, token validation)
src/components/forms/    — client components ("use client", form state + API calls)
src/components/ui/       — reusable presentational components (Button, FormField, Logo)
src/components/modals/   — modal overlays
```

### Database

Drizzle ORM over Vercel Postgres (`@vercel/postgres`). Schema is the source of truth at `src/db/schema.ts`. Use `npm run db:push` to sync during development — there is no migration workflow.

Key tables: `users`, `links` (REGISTRATION / PREDICTION tokens), `entries`, `entry_picks`, `matches`, `vouchers`, `spaza_sids`, `prize_draws`.

### Core domain concepts

- **Links** are single-use, expiring tokens. Type is `REGISTRATION` or `PREDICTION`. Status transitions: `VALID` → `USED` or `EXPIRED`.
- **Week ID** format is `YYYY-Www` (ISO 8601). `getCurrentWeekId()` in `src/lib/week.ts` respects the `CURRENT_WEEK_ID` env override.
- **SA ID** parsing and age validation live in `src/lib/sa-id.ts` (client-safe). Hashing for storage lives in `src/lib/sa-id-server.ts` (Node.js only — uses `crypto`).
- **Inbound message simulation** (`POST /api/simulate/inbound-message`) mimics the WhatsApp webhook. Sending `new <SID>` triggers registration; sending a voucher code triggers a prediction link.

### User flow

1. User sends `new <spaza_sid>` via WhatsApp → system creates a `REGISTRATION` link and replies with `/register/:token`
2. User visits `/register/:token` → `NewRegistrationPage` validates the token server-side, renders `NewRegistrationForm`
3. Form submits to `POST /api/r/:token/complete` → registers the user, marks link as `USED`, creates a `PREDICTION` link, replies with `/predict/:token`
4. User visits `/predict/:token` → submits match picks via `POST /api/p/:token/submit`
