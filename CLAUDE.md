# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**mccbng** (mCloud Compte and Budget Next Generation) is a personal finance and budgeting application. It is a single **Nuxt 4** package at the repo root:

- Nuxt 4 SPA (`ssr: false`, `compatibilityVersion: 5`, auto-imports disabled) with TypeScript, Pinia and PWA support. Its Nitro server (`server/`) **also hosts the REST API** (MySQL, JWT authentication), so one process and one Docker image serve both the front and the API.

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
pnpm test:api           # API integration tests on a disposable MySQL (Docker/Testcontainers required)
pnpm test:coverage      # Tests with coverage
pnpm type-check         # TypeScript type checking (nuxt typecheck)
pnpm lint               # ESLint with auto-fix
pnpm lint:check         # ESLint check only (no auto-fix)
pnpm db:migrate         # Apply SQL migrations (add `-- --baseline` on an existing production database)
```

## Architecture Overview

### How It All Connects

```
[Browser / PWA]
      │
      ▼
[Nuxt SPA + Nitro API  (port 8080)] ────►  [MySQL / MariaDB]
   app   server/api
```

1. The frontend authenticates via `POST /api/users/login` with `{ email, code }` (a 6-character code compared to the bcrypt-hashed `secret_key`).
2. The API returns a JWT (`{ id, name, email, IDuser }`, signed with `JWT_SECRET`, TTL `JWT_TTL_SECONDS`, default 1 h) and sets an `HttpOnly` `mccbngAuth` cookie.
3. The token is stored in the cookies `userToken` / `userID` via `document.cookie` (`app/services/auth.ts`). All subsequent API calls include `Authorization: Bearer <token>`.
4. `server/middleware/auth.ts` verifies the JWT on every `/api/**` route except `GET /api/ping` and `POST /api/users/login`.
5. Users are always looked up by `IDuser` (primary key), **never by the `id` column**, which is not unique in production.
6. `JWT_SECRET` must stay fixed: changing it invalidates every session.

### Domain Model

| Entity | Key | Notes |
|--------|-----|-------|
| **User** | `IDuser` (not auto-incremented) | `id` is an application identifier and is **not unique**. `email` is unique, `secret_key` is the bcrypt-hashed login code. |
| **Banque** | `IDbanque` | Bank — groups accounts. Shared (no user scope). |
| **Compte** | `IDcompte` | Bank account. Type flags: `bloque`, `joint`, `children`, `retraite`, `porte_feuille`, `visible`. |
| **Operation** | `IDop` | Single transaction. Belongs to a `Compte`, optionally tied to a `Categorie` and a `Credit`. `CheckOp` = pointed/checked status, `amortissement` flag. |
| **OperationRecurrente** | `IDopRecu` | Recurring template. `Frequence`: 3 = monthly, 7 = yearly. `DernierDateOpRecu` tracks last generation. |
| **Categorie** | `IDcat` | `Type` ENUM (`depense` / `revenu` / `transfert`) drives how the category is counted in each graph. `IDuser = 0` marks shared categories (readable by all, not editable). |
| **Credit** | `IDcredit` | Loan / mortgage. Auto-creates a monthly `OperationRecurrente` when created. |
| **Bien** | `IDbien` | Real-estate asset. Optionally linked to a `Credit` (mortgage). |
| **Stats** | `userID` | Legacy table, unused by the API. |

User scoping uses two patterns:

- **Direct**: entity carries `IDuser` (`Compte`, `Categorie`, `Credit`, `Bien`). The resource definition's `readScope` / `writeScope` add `IDuser = <JWT user>`.
- **Inherited**: entity has no `IDuser` (`Operation`, `OperationRecurrente`). The scope resolves the user's `IDcompte` list and filters with `IDcompte IN (…)`. A resource owned by another user answers **404**.

### Key Features

- Multi-bank, multi-account management with type flags and pointed/unpointed balance tracking.
- Transaction CRUD with pointed status, infinite scroll pagination (35/page), swipe-to-delete on mobile.
- Recurring operations with monthly / yearly auto-generation (at most one occurrence per recurring operation per call).
- Account-to-account transfers (debit + credit pair created in one shot by the front).
- Cross-account search by operation name.
- Smart category suggestion based on past operation name patterns.
- Loan tracking (`Credit`) with monthly auto-debit, remaining-balance (interest first, then principal) and payment-history endpoints.
- Real-estate tracking (`Bien`) with optional link to a `Credit` for mortgages.
- Amortization view filtering operations flagged `amortissement = 1`.
- Monthly and yearly statistics: total spent, pie chart by category, income vs expense, top categories / operations, heatmap, time series of balance evolution (global / retraite / dispo).
- Light / dark / system theme with persistence.
- Mobile-responsive PWA with swipeable account panel and optional Eruda debug console.

## Development Setup

- **Node.js**: ≥ 26 (see `.nvmrc`). Node 26 no longer ships `corepack` or `yarn`.
- **Package Manager**: `pnpm@12.9.1` (see `packageManager` in root `package.json`).
- **App**: Nuxt/Nitro on port 8080 (dev and Docker image). API mounted at `/api`.
- **Database**: MySQL / MariaDB. The production schema mixes MyISAM (no transactions) and InnoDB tables, see `docs/db-migrations.md`.

### Environment Configuration (read at runtime, from `process.env`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | yes | MySQL connection |
| `JWT_SECRET` | yes in production | JWT signing secret (an ephemeral one is generated in dev, with a warning) |
| `JWT_TTL_SECONDS` | no | JWT lifetime, default 3600 |

In development they can live in `.env`. Nothing is baked into the Docker image, and the server refuses to start in production when a required variable is missing.

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
- Frontend uses Vue 3 Composition API with `<script setup lang="ts">`.
- Auto-imports are disabled in the front: import `ref`/`computed` from `vue`, `useRoute`/`useRouter`/`definePageMeta` from `#imports`, stores from `@/stores/*`, and Nuxt components such as `NuxtPage` from `#components`.
- SCSS variables (`app/assets/styles/variables.scss`) are globally injected via Vite's `additionalData` (set in `nuxt.config.ts`).
- CSS custom properties drive light/dark theming (`app/assets/styles/theme.css`).
- Domain naming is in French (Banque, Compte, Operation, Categorie, Credit, Bien) — keep field/property names consistent with existing models when adding endpoints.
- All financial amounts use the SQL `FLOAT` type with manual rounding to 2 decimal places.
- Overlay (modal-style) flows are child pages under `app/pages/` that render `RouteOverTheContent`; the form is selected by `componentName` declared in `definePageMeta`. Route names are part of the contract (`route.name` is read by the code) and are checked by `tests/integration/routes.spec.ts`.

## Repository Layout

```
mccbng/
├── app/                 # Nuxt SPA (pages, components, stores, services…)
├── server/              # Nitro API (api/, middleware/, plugins/, db/, utils/)
├── scripts/             # db-migrate.mjs (SQL migration runner)
├── public/              # icons, favicon
├── tests/               # unit, integration, api
├── nuxt.config.ts, vitest*.config.ts, eslint.config.mjs, tsconfig.json
├── Dockerfile, docker-entrypoint.sh
├── docs/                # architecture.md (detailed architecture), recette-non-regression-multiuser.md, db-migrations.md, security-roadmap.md)
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
