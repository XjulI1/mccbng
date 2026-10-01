# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**mccbng** (mCloud Compte and Budget Next Generation) is a personal finance and budgeting application. It is structured as a **pnpm workspaces** monorepo with two packages:

- `back/` — LoopBack 4 REST API with JWT authentication and MySQL database.
- `front/` — Nuxt 4 SPA (`ssr: false`, `compatibilityVersion: 5`, auto-imports disabled) with TypeScript, Pinia, and PWA support.

> The `vue-touch-events/` workspace mentioned in older docs has been removed: the front-end now depends on the published `vue3-touch-events` npm package.

See `back/CLAUDE.md` and `front/CLAUDE.md` for detailed architecture documentation of each package.

## Development Commands

### Root Level

```bash
pnpm install                        # install all workspace dependencies
pnpm --filter @mccbng/back <cmd>    # run a script in back/
pnpm --filter @mccbng/front <cmd>   # run a script in front/
```

### Backend (`back/`)

```bash
cd back
pnpm build              # Compile TypeScript (lb-tsc)
pnpm build:watch        # Watch mode compilation
pnpm start              # Rebuild + run production server (node -r source-map-support/register .)
pnpm lint               # Run ESLint and Prettier checks
pnpm lint:fix           # Fix linting issues
pnpm test               # Run tests with Mocha (rebuild + run)
pnpm clean              # Clean build artifacts (lb-clean dist *.tsbuildinfo .eslintcache)
pnpm migrate            # Run database migrations (auto-builds via premigrate hook)
pnpm openapi-spec       # Generate OpenAPI spec
```

### Frontend (`front/`)

```bash
cd front
pnpm dev                # Nuxt dev server (port 8080, /api proxied by Nitro)
pnpm build              # Production build (.output/, Nitro server)
pnpm build:staging      # Staging build (--envName test)
pnpm preview            # Serve the production build locally
pnpm test               # Run Vitest (unit + integration)
pnpm test:coverage      # Tests with coverage
pnpm type-check         # TypeScript type checking (nuxt typecheck)
pnpm lint               # ESLint with auto-fix
pnpm lint:check         # ESLint check only (no auto-fix)
```

## Architecture Overview

### How It All Connects

```
[Browser / PWA]
      │
      ▼
[Nuxt SPA + Nitro] ─── proxy ───►  [LoopBack 4 API]  ────►  [MySQL Database]
  (port 8080)          /api            (port 3000)
```

1. The frontend authenticates via `POST /api/users/login` with a 6-character `code` (the user's `secret_key`).
2. The API returns a JWT token issued by the custom `JwtService` (which preserves the numeric `IDuser` field through the token round-trip).
3. The token is stored in cookies (`userToken`, `userID`) via `useCookie`. All subsequent API calls include `Authorization: Bearer <token>`.
4. The Nitro server (`front/server/api/[...path].ts`) proxies `/api/**` to the backend (`API_URL`), in dev and in production. This handler goes away when the API moves into Nuxt's `./server`.
5. The JWT secret is regenerated on every backend restart (`generateUniqueId()` bound to `TokenServiceBindings.TOKEN_SECRET`) — tokens are invalidated when the API restarts.

### Domain Model

| Entity | Key | Notes |
|--------|-----|-------|
| **User** | `id` (UUID) + `IDuser` (numeric, used in JWT) | hasOne `UserCredentials`. `secret_key` is the 6-char login code. |
| **Banque** | `IDbanque` | Bank — groups accounts. |
| **Compte** | `IDcompte` | Bank account. Type flags: `bloque`, `joint`, `children`, `retraite`, `porte_feuille`, `visible`. belongsTo `Banque`. |
| **Operation** | `IDop` | Single transaction. Belongs to a `Compte`, optionally tied to a `Categorie` and a `Credit`. `CheckOp` = pointed/checked status, `amortissement` flag. |
| **OperationRecurrente** | `IDopRecu` | Recurring template. `Frequence`: 3 = monthly, 7 = yearly. `DernierDateOpRecu` tracks last generation. |
| **Categorie** | `IDcat` | User-defined classification. `Type` ENUM (`depense` / `revenu` / `transfert`) drives how the category is counted in each graph. |
| **Credit** | `IDcredit` | Loan / mortgage. Auto-creates a monthly `OperationRecurrente` when created. |
| **Bien** | `IDbien` | Real-estate asset. Optionally linked to a `Credit` (mortgage). |
| **Stats** | `userID` | Support entity used by the analytics endpoints. |

User scoping uses two patterns:

- **Direct**: entity carries `IDuser` (`Compte`, `Categorie`, `Credit`, `Bien`). Controllers add `where: { IDuser }` via a private `scope()` helper.
- **Inherited**: entity has no `IDuser` (`Operation`, `OperationRecurrente`). Controllers first resolve the user's `IDcompte` list, then filter with `{ IDcompte: { inq: ids } }`.

### Key Features

- Multi-bank, multi-account management with type flags and pointed/unpointed balance tracking.
- Transaction CRUD with pointed status, infinite scroll pagination (35/page), swipe-to-delete on mobile.
- Recurring operations with monthly / yearly auto-generation.
- Account-to-account transfers (debit + credit pair created in one shot).
- Cross-account search by operation name.
- Smart category suggestion based on past operation name patterns.
- Loan tracking (`Credit`) with monthly auto-debit, remaining-balance and payment-history endpoints.
- Real-estate tracking (`Bien`) with optional link to a `Credit` for mortgages.
- Amortization view filtering operations flagged `amortissement = 1`.
- Monthly statistics: total spent, pie chart by category, time series of balance evolution (global / retraite / dispo).
- Light / dark / system theme with persistence.
- Mobile-responsive PWA with swipeable account panel and optional Eruda debug console.

## Development Setup

- **Node.js**: ≥ 20 (see `.nvmrc`)
- **Package Manager**: `pnpm@10.33.0` (see `packageManager` in root `package.json`); workspace config in `pnpm-workspace.yaml`.
- **Backend**: port 3000 (configurable via `HOST` / `PORT` env vars). API mounted at `/api`. Swagger UI at `/explorer`.
- **Frontend**: Nuxt/Nitro on port 8080 (dev and Docker image) with `/api` proxy to `API_URL` (default `http://localhost:3000`).

### Environment Configuration

- **Frontend**: `API_URL` — Backend base URL, read at runtime by the Nitro proxy (`.env` in dev, container env var in production). The browser always calls `/api` relatively.
- **Backend**: `back/src/datasources/mccb-mysql.datasource.config.json` — MySQL connection config (host, port, user, password, database).

## Docker Deployments

Both packages have Dockerfiles for containerized deployment:

- **Backend**: `node:22-slim` base, builds TypeScript, removes `dist/datasources/*config.json` and `src/` from the image for security, runs on port 3000.
- **Frontend**: Multi-stage `node:22-slim` (pnpm) → `node:22-slim` running the Nitro output (`.output/server/index.mjs`) on port 8080. The build context is the **repo root** (`docker build -f front/Dockerfile .`) because the pnpm lockfile lives there.

Registry: `dockregistry.xju.fr/mccbng/{api,front}` with `staging` and `latest` tags.

Each package exposes the scripts `docker:staging:build`, `docker:staging:push`, `docker:latest:build`, `docker:latest:push`. A root-level `build-and-push.sh` and `docker-compose.build.yml` are available for orchestration.

## Code Conventions

- Backend uses LoopBack 4 decorators (`@model`, `@property`, `@repository`, `@authenticate('jwt')`).
- Every protected endpoint resolves the current user via `getCurrentUserId(profile)` from `src/services/current-user.ts`, then either `scope(...)` or `assertOwned(...)` to enforce ownership before reading or writing.
- Frontend uses Vue 3 Composition API with `<script setup lang="ts">`.
- Auto-imports are disabled in the front: import `ref`/`computed` from `vue`, `useRoute`/`useRouter`/`definePageMeta`/`useCookie` from `#imports`, stores from `@/stores/*`, and Nuxt components such as `NuxtPage` from `#components`.
- SCSS variables (`front/app/assets/styles/variables.scss`) are globally injected via Vite's `additionalData` (set in `nuxt.config.ts`).
- CSS custom properties drive light/dark theming (`front/app/assets/styles/theme.css`).
- Domain naming is in French (Banque, Compte, Operation, Categorie, Credit, Bien) — keep field/property names consistent with existing models when adding endpoints.
- All financial amounts use the SQL `FLOAT` type with manual rounding to 2 decimal places.
- Overlay (modal-style) flows are child pages under `front/app/pages/` that render `RouteOverTheContent`; the form is selected by `componentName` declared in `definePageMeta`. Route names are part of the contract (`route.name` is read by the code) and are checked by `front/tests/integration/routes.spec.ts`.

## Repository Layout

```
mccbng/
├── back/                # LoopBack 4 API (see back/CLAUDE.md)
├── front/               # Nuxt 4 SPA (see front/CLAUDE.md)
├── docs/                # Functional documentation (e.g. recette-non-regression-multiuser.md)
├── mockups/             # Standalone HTML UI mockups
├── package.json         # Workspace root, declares pnpm packageManager
├── pnpm-workspace.yaml  # back + front
├── pnpm-lock.yaml
├── docker-compose.build.yml
├── build-and-push.sh
├── README.md            # Functional + architectural docs (français)
└── CLAUDE.md            # this file
```
