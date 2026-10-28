# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**mccbng** (mCloud Compte and Budget Next Generation) is a personal finance and budgeting application. It is a single **Nuxt 4** package at the repo root:

- Nuxt 4 SPA (`ssr: false`, `compatibilityVersion: 5`, auto-imports disabled) with TypeScript, Pinia and PWA support. Its Nitro server (`server/`) **also hosts the REST API** (MariaDB, JWT authentication), so one process and one Docker image serve both the front and the API.

> The LoopBack 4 API (`back/`, image `mccbng/api`) and the `vue-touch-events/` workspace have been removed. The front depends on the published `vue3-touch-events` package.

See `docs/architecture.md` for the detailed architecture of the application (front and API).

## Development Commands

```bash
pnpm install                        # install dependencies
```

```bash
pnpm dev                # Nuxt dev server (port 8080) — SPA + API
pnpm build              # Production build (.output/, Nitro server)
pnpm build:staging      # Staging build (--envName test)
pnpm preview            # Serve the production build locally
pnpm test               # Vitest (unit + integration, Nuxt environment)
pnpm test:api           # API integration tests on a disposable MariaDB 10.11 (Docker/Testcontainers required)
pnpm test:coverage      # Tests with coverage
pnpm type-check         # TypeScript type checking (nuxt typecheck)
pnpm lint               # ESLint with auto-fix
pnpm lint:check         # ESLint check only (no auto-fix)
pnpm db:migrate         # Apply SQL migrations (add `-- --baseline` on an existing production database)
pnpm hash-code <code>   # bcrypt hash (cost 12) of a login code, to paste into User.secret_key
```

## Architecture Overview

### How It All Connects

```
[Browser / PWA]
      │
      ▼
[Nuxt SPA + Nitro API  (port 8080)] ────►  [MariaDB 10.11]
   app   server/api
```

1. The frontend authenticates via `POST /api/users/login` with `{ email, code }` (a 6-character code compared to the bcrypt-hashed `secret_key`; a non-bcrypt key is refused). After 5 consecutive failures the account is locked (5 min → 30 min → 2 h → 24 h); every attempt is logged as one JSON line (`"event":"login"`).
2. The API sets the session in the `HttpOnly` `mccbngAuth` cookie only: a JWT `{ name, email, IDuser, tv }` (HS256, `iss`/`aud` `mccbng`, signed with `JWT_SECRET`, TTL `JWT_TTL_SECONDS`, default 6 h). The response body is `{ userId }`, without the token.
3. The front only keeps the non-secret `userID` cookie (`app/services/auth.ts`); `app/services/http.ts` sends requests with `credentials: 'same-origin'` and `X-Requested-With: mccbng`. There is no `Authorization` header: a Bearer token is refused.
4. `server/middleware/auth.ts` requires `X-Requested-With: mccbng` (and a same-host `Origin` when present) on every unsafe method (CSRF, 403 otherwise), then verifies the cookie JWT on every `/api/**` route except `GET /api/ping` and `POST /api/users/login`. It re-reads `User.tokenVersion`: `POST /api/users/logout` increments it, which revokes the user's sessions on all devices.
5. Users are always looked up by `IDuser` (primary key). The legacy LoopBack columns (`id`, `realm`, `emailVerified`, `verificationToken`) are dropped by migration `0004_drop_legacy`.
6. `JWT_SECRET` must stay fixed: changing it invalidates every session.
7. There is no signup route: users are created in phpMyAdmin with a `secret_key` produced by `pnpm hash-code <code>` (see `docs/exploitation.md`).
8. The login rate-limit (5 / 15 min / IP) reads the IP from `X-Real-IP`, set by the Synology DSM reverse proxy from Cloudflare's `CF-Connecting-IP` (chain: client → Cloudflare → DSM → container; the NAS must only be reachable through Cloudflare), with the socket address as fallback; IPv6 addresses are counted by their `/64` prefix (`server/plugins/client-ip.ts`, `rateLimitKey`); `X-Forwarded-For` is never trusted.

### Domain Model

| Entity | Key | Notes |
|--------|-----|-------|
| **User** | `IDuser` (not auto-incremented) | `email` is unique, `secret_key` is the bcrypt-hashed login code. `failedLoginCount`/`lockedUntil` drive the lockout, `tokenVersion` the session revocation. |
| **Banque** | `IDbanque` | Bank — groups accounts. Shared (no user scope): read and create only through the API (no `PATCH`/`PUT`/`DELETE`, 405). |
| **Compte** | `IDcompte` | Bank account. Type flags: `bloque`, `joint`, `children`, `retraite`, `porte_feuille`, `visible`. Optional `Plafond` (e.g. livret A cap, display only): a gauge in `AccountHeader` (`app/utils/plafond.ts`); a `PUT` omitting it keeps it. |
| **Operation** | `IDop` | Single transaction. Belongs to a `Compte`, optionally tied to a `Categorie`, a `Credit` and a `Bien` (`IDbien`: rent when positive, charge when negative, unless `IDcredit` is set). `CheckOp` = pointed/checked status, `amortissement` flag. |
| **OperationRecurrente** | `IDopRecu` | Recurring template. `Frequence`: 3 = monthly, 5 = quarterly, 7 = yearly. Due dates fall on `JourNumOpRecu` (and `MoisOpRecu`, 0-indexed, for yearly; for quarterly, the months aligned on `MoisOpRecu` modulo 3), clamped to the month's last day; `DernierDateOpRecu` is the last generated due date (set by the server on creation). A credit's recurring operation (`IDcredit` set) is read-only (409): it is managed through its `Credit`. Optional `IDbien`, copied onto generated operations. |
| **Categorie** | `IDcat` | `Type` ENUM (`depense` / `revenu` / `transfert`) drives how the category is counted in each graph. `IDuser = 0` marks shared categories (readable by all, not editable). |
| **Credit** | `IDcredit` | Loan / mortgage. Auto-creates a monthly `OperationRecurrente` when created; deleting it removes that recurring operation and sets `IDcredit` to `NULL` on its operations and on the bien it finances. |
| **Bien** | `IDbien` | Real-estate asset. Optionally linked to a `Credit` (mortgage); a credit finances at most one bien (409 otherwise, no bulk PATCH). `LoyerMensuel` = expected monthly rent (forecast only), `AbattementCharges` = % of charges in received rents, `DateMiseEnLocation` = start of the letting. Deleting it unlinks its operations (`IDbien = NULL`). |

User scoping uses two patterns:

- **Direct**: entity carries `IDuser` (`Compte`, `Categorie`, `Credit`, `Bien`). The resource definition's `readScope` / `writeScope` add `IDuser = <JWT user>`.
- **Inherited**: entity has no `IDuser` (`Operation`, `OperationRecurrente`). The scope resolves the user's `IDcompte` list and filters with `IDcompte IN (…)`. A resource owned by another user answers **404**.

### Key Features

- Home recap (`app/pages/index.vue`, `GET /api/stats/recap`): global total of the account list (`compteStore.totalGlobal`, the only place it is shown) with the annual objective (`User.warningTotal`; its bar measures the progress since January 1st: (total − total on January 1st) / (objective − total on January 1st), the January 1st total being derived from the per-account sums of the year's operations returned as `depuisJanvier`), real estate (`ValeurActuelle`, else `PrixBienNu`), remaining principal of active credits (same `amortize` as `remaining-balance`), and savings rate `(revenus + dépenses) / revenus` over the last 6 / 12 / 24 / 60 full months (current month excluded). The active account operation list lives on `/operations`.
- Multi-bank, multi-account management with type flags and pointed/unpointed balance tracking.
- Transaction CRUD with pointed status, infinite scroll pagination (35/page), swipe-to-delete on mobile.
- Recurring operations with monthly / quarterly / yearly auto-generation (`server/utils/schedule.ts`): every due occurrence up to 15 days (monthly), 20 days (quarterly) or 30 days (yearly) ahead is generated in one call (at most 24 per recurring operation), each reserved by an optimistic lock on `DernierDateOpRecu` so concurrent calls never duplicate it. Credits stop generating after `DateFin` or when not `actif`.
- Account-to-account transfers: `POST /api/operations/transfert` creates the debit + credit pair server-side (mandatory `IDcat`, the debit is removed if the credit fails).
- Cross-account search by operation name.
- Smart category suggestion based on past operation name patterns.
- Loan tracking (`Credit`) with monthly auto-debit (changes to the credit are propagated to its recurring operation), remaining-balance (past outflows only, interest once per calendar month, then principal) and payment-history endpoints.
- Real-estate tracking (`Bien`) with optional link to a `Credit` for mortgages.
- Rental income: operations linked to a `Bien` feed `GET /api/biens/:id/rentabilite` (average rent, summary since purchase) and `GET /api/credits/:id/rentabilite` (rents and payments only, without the bien's charges: average rent and payment, coverage, monthly effort = payment − rent excluding charges) over the whole letting (from `Bien.DateMiseEnLocation`, else the first rent, to the last full month), with forecast values from `LoyerMensuel` (`server/utils/rentabilite.ts`). The bien route also returns a `bilan` since purchase: plus-value + net rents − loan interest (same `amortize` as `remaining-balance`) = total gain, and the share of the payments covered by rents. `Bien.AbattementCharges` (%, rents being recorded charges included) is removed from rents for the average rent, the coverage ratios and the credit effort, never for net rents or gain. Rents never change `remaining-balance` nor the statistics.
- Amortization view filtering operations flagged `amortissement = 1`.
- Monthly and yearly statistics: total spent, pie chart by category, income vs expense, top categories / operations, heatmap, time series of balance evolution (global = neither retraite nor children / retraite / dispo = global and not bloque). Every chart uses the same expense rule (`EXPENSE_JOIN` / `EXPENSE_WHERE`): the category `Type`, inflows and outflows alike; there is no uncategorized operation, `IDcat = 0` is the shared default category « Aucune » (`depense`) and counts like any other; `NULL` account flags read as their default; operations dated in the future (generated ahead) still count in balances.
- Light / dark / system theme with persistence.
- Mobile-responsive PWA with swipeable account panel and optional Eruda debug console.

## Development Setup

- **Node.js**: ≥ 26 (see `.nvmrc`). Node 26 no longer ships `corepack` or `yarn`.
- **Package Manager**: `pnpm@12.9.1` (see `packageManager` in root `package.json`).
- **App**: Nuxt/Nitro on port 8080 (dev and Docker image). API mounted at `/api`.
- **Database**: MariaDB (production 10.11; tests run on `mariadb:10.11`). Since migration `0002` every table is InnoDB (real transactions) in `utf8mb4_unicode_ci`; migrations are replayable (`IF [NOT] EXISTS`) and run with `NO_AUTO_VALUE_ON_ZERO` (`IDcat = 0` / `IDbanque = 0` rows), see `docs/db-migrations.md`.

### Environment Configuration (read at runtime, from `process.env`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | yes | MariaDB connection |
| `JWT_SECRET` | yes in production | JWT signing secret (an ephemeral one is generated in dev, with a warning) |
| `JWT_TTL_SECONDS` | no | JWT lifetime, default 21600 (6 h) |

In development they can live in `.env`. The scripts that access the database (`scripts/db-migrate.mjs`, `scripts/hash-legacy-secrets.mjs`, `scripts/diagnose-recurrentes.mjs`, `scripts/check-amounts.mjs`) also load the root `.env` through `scripts/load-env.mjs` (or the file named by `ENV_FILE`); variables already set in the environment take precedence. Nothing is baked into the Docker image, and the server refuses to start in production when a required variable is missing.

## Docker Deployment

A single image runs the whole application (`Dockerfile`):

- Multi-stage `node:26-slim` (pnpm installed with `npm install -g pnpm@12.9.1`) → `node:26-slim` running the Nitro output (`.output/server/index.mjs`) on port 8080. The build context is the **repo root** (`docker build .`) (`Dockerfile` is at the root).
- `docker-entrypoint.sh` exits with an explicit message when `DB_*` or `JWT_SECRET` is missing.
- SQL migrations are **not** run by the image: run `scripts/db-migrate.mjs` from a workstation or CI before deploying a version that adds one.

Registry: `dockregistry.xju.fr/mccbng/front` with `staging` and `latest` tags. The scripts `docker:staging:build`, `docker:staging:push`, `docker:latest:build`, `docker:latest:push` live in `package.json`. A root-level `build-and-push.sh` and `docker-compose.build.yml` orchestrate builds (the build container is pinned to `docker:24-cli`, compatible with the NAS Docker API).

## Code Conventions

- API routes live in `server/api/` (Nitro file-based routing) and are wrapped in `defineApiHandler` so every error uses the uniform `{ error: { statusCode, name, message } }` format.
- Every protected route resolves the user with `getCurrentUserId(event)` (`server/utils/scope.ts`) and applies a scope (`readScope`/`writeScope`, `compteScope`, `assertCompteOwned`) before reading or writing.
- Request bodies and query parameters are validated with Zod; defaults are applied in code (production SQL defaults differ from the models).
- Raw SQL must be parameterised (`rawQuery(sql, params)` in `server/utils/sql.ts`).
- Multi-row writes run in `getDb().transaction(…)` (transfer, credit creation, cascades); there is no manual compensation any more.
- Frontend uses Vue 3 Composition API with `<script setup lang="ts">`.
- Auto-imports are disabled in the front: import `ref`/`computed` from `vue`, `useRoute`/`useRouter`/`definePageMeta` from `#imports`, stores from `@/stores/*`, and Nuxt components such as `NuxtPage` from `#components`.
- SCSS variables (`app/assets/styles/variables.scss`) are globally injected via Vite's `additionalData` (set in `nuxt.config.ts`).
- CSS custom properties drive light/dark theming (`app/assets/styles/theme.css`).
- Domain naming is in French (Banque, Compte, Operation, Categorie, Credit, Bien) — keep field/property names consistent with existing models when adding endpoints.
- Financial amounts are SQL `DECIMAL(12,2)` (since migration `0003`; `TauxInteret` `DECIMAL(6,3)`, `Surface` `DECIMAL(8,2)`), read as JSON numbers (`decimalNumbers` in the pool, Drizzle `decimal` with `mode: 'number'`); sums computed in JS are still rounded with `round2`. No `FLOAT` column remains.
- Overlay (modal-style) flows are child pages under `app/pages/` that render `RouteOverTheContent`; the form is selected by `componentName` declared in `definePageMeta`. Route names are part of the contract (`route.name` is read by the code) and are checked by `tests/integration/routes.spec.ts`.

## Repository Layout

```
mccbng/
├── app/                 # Nuxt SPA (pages, components, stores, services…)
├── server/              # Nitro API (api/, middleware/, plugins/, db/, utils/)
├── scripts/             # db-migrate.mjs (SQL migration runner), hash-code.mjs, hash-legacy-secrets.mjs (one-shot), diagnose-recurrentes.mjs (recurring operations / credits diagnostic and fixes), check-amounts.mjs (aggregated amounts snapshot / comparison around a migration)
├── public/              # icons, favicon
├── tests/               # unit, integration, api
├── nuxt.config.ts, vitest*.config.ts, eslint.config.mjs, tsconfig.json
├── Dockerfile, docker-entrypoint.sh
├── docs/                # architecture.md (detailed architecture), exploitation.md (phpMyAdmin and script procedures), recette-non-regression-multiuser.md, db-migrations.md, security-roadmap.md)
├── mockups/             # Standalone HTML UI mockups
├── openspec/            # OpenSpec specs and changes
├── package.json         # Scripts, dependencies, packageManager
├── pnpm-workspace.yaml  # pnpm settings (overrides, allowBuilds, shamefullyHoist)
├── pnpm-lock.yaml
├── docker-compose.build.yml
├── build-and-push.sh
├── README.md            # Functional + architectural docs (français)
└── CLAUDE.md            # this file
```
