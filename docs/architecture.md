# Architecture — Nuxt 4 SPA + Nitro API

## Overview

Single Page Application for the mccbng personal finance app. Built with **Nuxt 4 (`ssr: false`, `future.compatibilityVersion: 5`) + Vue 3.5 + TypeScript + Pinia**, with **auto-imports disabled**, light/dark theme support, touch gestures, and PWA packaging. Covers banks, accounts, operations, recurring operations, categories, statistics, **loans (Credit)** and **real-estate assets (Bien)**.

Nitro (Nuxt's server) serves the SPA **and hosts the REST API** (`server/`, MySQL + JWT): one process and one Docker image serve both. The API is described in the *Server (Nitro API)* section below.

## Commands

```bash
pnpm dev                # Nuxt dev server (port 8080) — SPA + API (needs DB_* env, see below)
pnpm build              # Production build (.output/ — Nitro server + public assets)
pnpm build:staging      # Staging build (--envName test)
pnpm preview            # Serve the production build locally
pnpm test               # Vitest (unit + integration, Nuxt environment)
pnpm test:watch         # Vitest in watch mode
pnpm test:api           # API integration tests on a disposable MySQL (Docker / Testcontainers)
pnpm test:coverage      # Tests with coverage report
pnpm db:migrate         # Apply SQL migrations (add `-- --baseline` on an existing production database)
pnpm type-check         # nuxt typecheck (vue-tsc)
pnpm lint               # ESLint (@nuxt/eslint, flat config) with --fix
pnpm lint:check         # ESLint check only
```

`pnpm install` runs `nuxt prepare` (postinstall) to generate `.nuxt/` (types, aliases).

## Architecture

### Application bootstrap

```
nuxt.config.ts          → ssr:false, compatibilityVersion 5, imports.autoImport:false, components:{dirs:[]},
                          SCSS additionalData, PWA (@vite-pwa/nuxt), head metadata, devServer port 8080
app/app.vue             → Root layout: AccountHeader (top) + CompteList (left) + <NuxtPage /> + NavBar (bottom)
app/pages/              → File-based routes (see below)
app/middleware/auth.global.ts → Global auth guard
app/plugins/            → fontawesome.ts (global <FontAwesomeIcon>), touch-events.client.ts (vue3-touch-events)
app/stores/             → 9 Pinia setup stores
server/                → REST API hosted by Nitro (see "Server (Nitro API)")
```

**No auto-imports.** Import everything explicitly:
- `ref`, `computed`, `watch`, `onMounted`… from `vue`;
- `useRoute`, `useRouter`, `definePageMeta`, `defineNuxtPlugin`, `defineNuxtRouteMiddleware`, `navigateTo` from `#imports`;
- Nuxt components such as `NuxtPage`, `NuxtPwaManifest` from `#components`;
- stores from `@/stores/<name>`, services from `@/services/<name>`. `@` is `app/`.

`app.vue` calls `useGlobalTheme()` and `useGlobalDebugTools().initDebugTools()` on setup. The user, account list and categories are loaded by `hydrateSession` (`app/services/session.ts`), called from the auth middleware and from `login.vue`, so pages and forms (deep links included) find the stores filled at setup.

### Layout

```
┌──────────────────────────────────────────────┐
│              AccountHeader                    │  ← active account, balances, totals, mask toggle
├──────────────┬───────────────────────────────┤
│  CompteList  │        <NuxtPage />            │
│  (left)      │      (Home / Stats / …)        │
│              │                                │
│  swipe ←     │        swipe →                 │
│  closes      │        opens left panel        │
├──────────────┴───────────────────────────────┤
│                NavBar                          │  ← bottom nav
└──────────────────────────────────────────────┘
```

- **Desktop** (≥ 768 px): left panel always visible at 33 % width, right panel takes the rest.
- **Mobile** (< 768 px): left panel slides in/out with CSS transitions and swipe gestures, full-width when open.

### Routes (`app/pages/`)

File-based routing, but **public URLs and route names are unchanged** from the former `router.ts` (the code reads `route.name`, e.g. `TransfertForm` distinguishes `Virement` / `Retrait`, `app.vue` / `NavBar` test `'Login'`). Each page sets its name (and `disabledTotalHeader`) with `definePageMeta`.

Child routes use the **overlay pattern**: each overlay is a tiny page that renders `RouteOverTheContent`, with an absolute `path`, a `name` and a `componentName` declared in `definePageMeta`. `RouteOverTheContent` reads `route.meta.componentName` to pick the form (`operation-form`, `transfert-form`, `search`, `operation-recurrente-form`, `compte-form`, `credit-form`, `bien-form`).

| Path | Page file | Overlay children (pages in the sibling folder) |
|------|-----------|-----------------------------------------------|
| `/` | `index.vue` | `/newOperation`, `/editOperation/:id`, `/search`, `/transfert`, `/retrait` |
| `/recurrOperation` | `recurrOperation.vue` | `/newRecurrOperation`, `/editRecurrOperation/:id` |
| `/amortissement` | `amortissement.vue` | — |
| `/gestion` | `gestion.vue` | — |
| `/comptesGestion` | `comptesGestion.vue` | `/newCompte`, `/editCompte/:id` |
| `/credits` | `credits.vue` | `/newCredit`, `/editCredit/:id` |
| `/biens` | `biens.vue` | `/newBien`, `/editBien/:id` |
| `/stats` | `stats.vue` | — |
| `/login` | `login.vue` | — |
| `/config` | `config.vue` | — |
| `/editUser` | `editUser.vue` | — |

`meta.disabledTotalHeader: true` (inherited by the overlays of a page) hides the global totals in `AccountHeader`.

The reference route table lives in `tests/fixtures/routes.ts` and is enforced by `tests/integration/routes.spec.ts`: **when you add or rename a route, update the fixture.**

### Authentication

- Cookies `userToken` and `userID` are read/written through `document.cookie` in `app/services/auth.ts` (`getTokenCookie`, `getUserIDCookie`, `saveCookies`, `removeCookies`), in the same format as `useCookie` (URI-encoded JSON, `SameSite=Strict`, `Secure` over HTTPS) and as the former `universal-cookie` implementation. `useCookie` is deliberately not used: each call would create a ref + watcher outside any effect scope.
- `app/middleware/auth.global.ts`: for any route other than `/login`, if the user store has no token, it reads the cookies, validates them with `GET /api/users/exists` (`checkUserAuthentification`, which clears invalid cookies), then calls `hydrateSession` (user, accounts, categories). It redirects to `/login` when cookies are missing, the token is invalid or hydration fails (cookies are then cleared), and redirects an already-authenticated user from `/login` to `/`. The requested deep link is preserved.
- `login.vue` has no auto-authentication of its own (the middleware handles existing sessions): after `auth(...)` it calls `hydrateSession`, saves the cookies, then `router.replace({ name: 'Home' })`.
- Logout (`config.vue`): clears storage and cookies, then reloads the page.

### Pinia stores (`app/stores/`)

Nine **setup stores** (`defineStore('x', () => { … })`); state is `ref`, getters are `computed`, actions are plain functions. Names mirror the former Vuex modules. Use `useXStore()` and, in components, `storeToRefs` when you need reactive destructuring. **Call `useOtherStore()` inside actions, never at module top level** (stores reference each other: `compte` ↔ `operation`).

#### `user` (`stores/user.ts`)
- **State**: `id`, `username`, `email`, `token`, `favoris`, `warningTotal`, `warningCompte`, `maskAmount`
- **Actions**: `setUser`, `fetchUser(userID)`, `updateUser(updates)`, `saveUserToken(token)`, `toggleMaskAmount()`

#### `compte`
- **State**: `activeAccount`, `accountList`, `currency` (default `'€'`), `managementInfo`
- **Getters**: `visibleAccounts`, `bloquedCompte`, `retraiteCompte`, `availableCompte`, `porteFeuilleCompte`, `jointCompte`, `childrenCompte`, `totalAvailable`, `totalGlobal`, `totalRetraite`, `totalJoint`, `totalChildren`, `getAccount(IDcompte)`
- **Actions**: `setActiveAccount`, `setNewBalances`, `setAccountList`, `fetchUserByIDAndGenerateRecurringOp(userID)`, `generateRecurringOperations()`, `fetchActiveAccount(accountID)`, `fetchAccountList()`, `fetchComptesManagementInfo()`, `createCompte`, `updateCompte`, `deleteCompte`

#### `operation`
- **State**: `operationsOfActiveAccount` (starts `undefined`), `recurringOperations`, `hasMoreOperations`, `isLoadingOperations`, `operationsSkip`, `operationsLimit` (35), `isSearchMode`, `currentSearchTerms`
- **Actions**: `setOperationsOfActiveAccount`, `fetchOperationsOfActiveAccount()`, `loadMoreOperations()` (infinite scroll), `updateOperation(op)`, `deleteOperation(op)`, `createTransfert(op)` (debit + credit pair), `fetchRecurrOperation()`, `updateRecurringOperation(op)`, `deleteRecurringOperation(op)`, `getSearchOperations(terms)`, `loadMoreSearchOperations()`, `fetchOperations(where)`, `operationFromCurrentList(id)`

#### `category`
- **State**: `list` — **Getter**: `getCategoryName(IDcat)` — **Actions**: `setCategoryList`, `fetchCategoryList()` (lazy: only fetches when the list has fewer than 2 entries)

#### `stats`
- **State**: `negativeMonth`, `currentMonth`, `currentYear`, `categoriesTotal`
- **Getter**: `getCategoriesTotalForHighchartPie`
- **Actions**: `fetchSumByUserByMonth()`, `fetchSumCategoriesByUserByMonth()`, `changeStatsCurrentYear(year)`, `changeStatsCurrentMonth(month)`

#### `display`
- **State**: `account_list` (left panel visibility on mobile) — **Action**: `toggleAccountList(force?)`

#### `credit`
- **State**: `creditList`, `activeCredit`, `creditBalances` (dict by `IDcredit`), `isLoadingCredits`
- **Actions**: `fetchCredits()` (also fetches remaining balances), `updateCredit`, `deleteCredit`, `fetchCreditDetails(IDcredit)`, `creditFromList(id)`, `setCreditBalance`

#### `bien`
- **State**: `bienList`, `activeBien`, `isLoadingBiens` — **Actions**: `fetchBiens()`, `updateBien`, `deleteBien`, `fetchBienDetails(IDbien)`, `bienFromList(id)`

#### `banque`
- **State**: `banqueList` — **Actions**: `setBanqueList`, `addBanque`, `fetchBanques()`, `createBanque(banque)` (used by `CompteForm`)

### Services (`app/services/`)

API layer built on the native `fetch` API via the small wrapper in `services/http.ts` (`apiGet`, `apiPost`, `apiPut`, `apiPatch`, `apiDelete`). Each function accepts `token` and `apiUrl` so services stay stateless.

| Service | Functions | API Endpoints |
|---------|-----------|---------------|
| **auth.ts** | `auth(code, apiUrl)`, `saveCookies()`, `removeCookies()`, `getTokenCookie()`, `getUserIDCookie()`, `checkUserAuthentification()` | `POST /api/users/login`, `GET /api/users/exists` |
| **user.ts** | `fetchUser(userID, token, apiUrl)`, `updateUser(updates, token, apiUrl)` | `GET /api/users/whoAmI`, `PATCH /api/users/me` |
| **compte.ts** | `fetchAccountList()`, `sumAllCompteForUser()`, `sumForACompte()` | `GET /api/comptes`, `GET /api/operations/sumAllCompteForUser`, `GET /api/operations/sumForACompte` |
| **operation.ts** | `fetchOperationsForAccount()`, `updateOperation()`, `deleteOperation()`, `createTransfert()`, `fetchRecurrOperation()`, `updateRecurringOperation()`, `deleteRecurringOperation()`, `generateRecurringOperations()`, `fetchSearchOperations()`, `fetchOperations(where)` | various `/api/operations` and `/api/operation-recurrentes` endpoints |
| **category.ts** | `fetchCategoryList()` | `GET /api/categories` |
| **stats.ts** | `fetchEvolutionSolde()`, `fetchSumByUserByMonth()`, `fetchSumCategoriesByUserByMonth()` | `GET /api/stats/evolutionSolde`, `/api/operations/sumByUserByMonth`, `/api/operations/sumCategoriesByUserByMonth` |
| **credit.ts** | `fetchCredits()`, `fetchCreditById()`, `updateCredit()`, `deleteCredit()`, `fetchCreditRemainingBalance()`, `fetchCreditPayments()` | `GET/POST /api/credits`, `GET/PUT/DEL /api/credits/:id`, `GET /api/credits/:id/remaining-balance`, `GET /api/credits/:id/payments` |
| **bien.ts** | `fetchBiens()`, `fetchBienById()`, `updateBien()`, `deleteBien()` | `GET/POST /api/biens`, `GET/PUT/DEL /api/biens/:id` |

**Authentication**: see the Authentication section above. The API base URL is the empty string (`app/services/config.ts` → `API_URL`) so every call is relative to `/api/**`, served by the same Nitro server.

### Components (`app/components/`)

#### Layout / navigation

| Component | Description |
|-----------|-------------|
| **AccountHeader.vue** | Top header: active account name, checked / unchecked balances, global totals, mask toggle |
| **NavBar.vue** | Bottom navigation bar with links to main views |
| **CompteList/index.vue** | Left panel — accounts grouped by type |
| **CompteList/Compte.vue** | Single account list item |

#### Operations

| Component | Description |
|-----------|-------------|
| **OperationList.vue** | Scrollable list with infinite scroll, loading and empty states |
| **Home/Operation.vue** | Single operation row — swipe-to-delete, click-to-edit, check/uncheck toggle |
| **Amortissement/Operation.vue** | Operation row with amortization-specific rendering |
| **OperationForm.vue** | Create/edit form, includes category suggestion via `suggestCategories` |
| **TransfertForm.vue** | Account-to-account transfer (creates the debit + credit pair) |
| **Search.vue** | Cross-account search by operation name |

#### Recurring operations

| Component | Description |
|-----------|-------------|
| **OperationRecurrenteList.vue** | List container |
| **OperationRecurrente.vue** | Single recurring-operation row |
| **OperationRecurrenteForm.vue** | Create/edit form |

#### Credits (loans)

| Component | Description |
|-----------|-------------|
| **CreditList.vue** | List container with loading / empty states |
| **CreditCard.vue** | Card showing name, lender, initial / monthly amount, remaining balance with progress bar, interest rate |
| **CreditForm.vue** | Form with name, lender, initial amount, interest rate, monthly payment, status, dates, linked account |

#### Biens (real-estate assets)

| Component | Description |
|-----------|-------------|
| **BienList.vue** | List container |
| **BienCard.vue** | Card showing name, type, city, surface, purchase date, total invested, current valuation |
| **BienForm.vue** | Form with name, city, type, usage, surface, purchase date, prices and fees, current value, optional credit link |

#### Stats / utilities

| Component | Description |
|-----------|-------------|
| **Currency.vue** | Currency formatter (uses `store.state.compte.currency`) |
| **Stats/SumByMonth.vue** | Monthly expense summary card |
| **Stats/PieByCategorie.vue** | Highcharts pie chart by category |
| **Stats/TimeSeriesEvolutionSoldes.vue** | Highcharts time series (global / retraite / dispo) |

### Pages (`app/pages/`)

| Page | Description |
|------|-------------|
| **login.vue** | Email + 6-character code → `auth(...)` → save cookies, load user |
| **index.vue** | Active account `OperationList`; child routes overlay forms |
| **recurrOperation.vue** | Recurring operations list and management |
| **amortissement.vue** | Operations filtered with `amortissement: 1` (loan principal repayments) |
| **gestion.vue**, **comptesGestion.vue** | Management hub and account management |
| **credits.vue** | Loans dashboard |
| **biens.vue** | Real-estate assets dashboard |
| **stats.vue** | Statistics dashboard |
| **config.vue** | Settings: reload, edit account, theme toggle, debug-tools toggle, logout |
| **editUser.vue** | Form to update profile (`PATCH /api/users/me`) |

`components/RouteOverTheContent.vue` is the overlay wrapper (reads `route.meta.componentName`).

### Composables (`app/composables/`)

- **`useTheme.ts`** — modes `light` / `dark` / `system`, persisted in `localStorage` (`theme`), follows `prefers-color-scheme`, sets `data-theme` and the `dark-theme` class on `<html>`. Singleton via `useGlobalTheme()`.
- **`useDebugTools.ts`** — optional Eruda console, `localStorage` key `debugToolsEnabled`, lazy `import('eruda')`. Singleton via `useGlobalDebugTools()`.

### Styles (`app/assets/styles/`)

- **`variables.scss`** — SCSS variables injected globally via `vite.css.preprocessorOptions.scss.additionalData` in `nuxt.config.ts` (breakpoints, header / navbar / left-panel sizes).
- **`theme.css`** — CSS custom properties for light + dark (`@media (prefers-color-scheme: dark)` and `html[data-theme="dark"]`).
- **`main.css`** — global resets and utilities, registered in `nuxt.config.ts` `css`.

### PWA (`@vite-pwa/nuxt`)

Configured under `pwa` in `nuxt.config.ts`: manifest `mCloud Compte and Budget` / `mCcBng` (`fullscreen`, portrait, theme `#4DBA87`, background `#000000`, icons 48 to 512), service worker `service-worker.js` with `registerType: 'autoUpdate'`, `navigateFallback: '/'` with `/api/**` denied. The SPA shell is prerendered (`nitro.prerender.routes: ['/']`) so the service worker can precache it. `<NuxtPwaManifest />` in `app.vue` injects the manifest link. `public/` holds the icons and favicon.

### Server (Nitro API)

```
server/
├── api/                      # one route per file (Nitro file-based routing)
│   ├── [resource]/*.ts       #   generic CRUD for banques, categories, biens
│   ├── comptes|operations|operation-recurrentes|credits/*.ts   # explicit CRUD files + specific routes
│   ├── users/*.ts, signup.post.ts, ping.get.ts
│   ├── stats/*.ts
│   └── [...path].ts          #   JSON 404 for any unknown /api route
├── middleware/auth.ts        # JWT check on /api/** (public: GET /api/ping, POST /api/users/login)
├── plugins/                  # config check at startup, MySQL pool shutdown
├── db/                       # schema.ts (Drizzle, mirrors the production DDL), client.ts, migrations/*.sql
└── utils/                    # config, auth, scope, crud, resources, crud-routes, filter, validate, errors, sql, stats, users, credits
```

- **Configuration** (`utils/config.ts`): `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET` (required in production), `JWT_TTL_SECONDS` (default 3600), read from `process.env` at runtime. In dev they can live in `.env`.
- **Handlers**: wrap them in `defineApiHandler` so every error follows `{ error: { statusCode, name, message } }`; throw `notFound`, `badRequest`, `conflict`, … from `utils/errors.ts`. Unexpected errors become a generic 500 and are logged as `[api] <method> <path>`.
- **CRUD**: `utils/resources.ts` describes each resource once (table, `readScope`/`writeScope`, Zod `create`/`patch` schemas, application `defaults`, `forced` fields such as `IDuser`, `validate` ownership checks, `onCreate`/`onDelete` cascades). `utils/crud.ts` implements the 8 standard routes. Because a static directory (`comptes/`, `operations/`, …) shadows the dynamic `[resource]` route, those resources have explicit one-line files calling `crudRoute(path, action)`; add the same files when a resource gets its own sub-routes.
- **Filter**: lists accept a LoopBack-style `filter` JSON (`where` with `and`/`or`/`inq`/`like`/`gt`…, `order`, `limit`, `skip`, `include`), parsed by `utils/filter.ts` with a column/operator whitelist. The user scope is always combined with `and` after the client's `where`.
- **Scope**: `utils/scope.ts` — `getCurrentUserId(event)`, `compteScope` (inherited scoping on `IDcompte`), `assertCompteOwned` (404). Users are looked up by `IDuser`, never by the non-unique `id` column.
- **SQL**: `rawQuery(sql, params)` (`utils/sql.ts`) for analytics (`utils/stats.ts`, aggregates, auto-generation); always parameterised. Dates are read/written in UTC (`timezone: 'Z'`).
- **Transactions**: cascades use `db.transaction`, but most production tables are MyISAM, which ignores transactions (`docs/db-migrations.md`).
- **Security**: `nuxt-security` adds the security headers and an enforced CSP; only `POST /api/users/login` is rate-limited (5 attempts per IP per 15 min, in memory; the module reads `X-Forwarded-For`, so the reverse proxy must overwrite it).
- **Migrations**: SQL files in `server/db/migrations`, applied by `scripts/db-migrate.mjs` (`pnpm db:migrate`); `0000_baseline.sql` is the production DDL and is only *marked* as applied on the existing database (`--baseline`). See `../docs/db-migrations.md`.

### Testing

- **Framework**: Vitest with `@nuxt/test-utils` (`environment: 'nuxt'`, see `vitest.config.ts`); `h3-next` is required as an optional peer.
- **Tests**: `tests/unit/` (stores, server filter parser), `tests/integration/` (route table, auth service + middleware), `tests/fixtures/routes.ts` (route contract).
- **API tests** (`tests/api/`, run with `pnpm test:api`, config `vitest.api.config.ts`): a global setup starts a disposable MySQL (Testcontainers, or an external one through `TEST_DB_*`), applies the migrations, builds Nuxt and starts the built server; specs call the API over HTTP with two users to cover multi-user isolation. `vitest.config.ts` excludes `tests/api/**`, so `pnpm test` does not need Docker.
- `useRouter()` and other Nuxt composables need the Nuxt context: call them inside tests, not at collection time.

## Dependencies

### Runtime
- `nuxt` 4, `vue` ^3.5, `pinia` + `@pinia/nuxt`, `@vite-pwa/nuxt`, `nuxt-security`
- Server: `drizzle-orm` + `mysql2`, `zod`, `jsonwebtoken`, `bcryptjs`
- `highcharts` ^12.2 — charts
- `@fortawesome/*` — icons
- `vue3-touch-events` ^4 — swipe gestures (client plugin)
- `eruda` ^3 — optional mobile dev console (lazy-loaded)

### Dev
- `typescript`, `vue-tsc`, `sass`
- `vitest`, `@nuxt/test-utils`, `@vue/test-utils`, `happy-dom`, `h3-next`, `testcontainers` + `@testcontainers/mysql`
- `eslint` 9 + `@nuxt/eslint`, `lint-staged`

## Docker

Build context is the **repo root** (`Dockerfile` is at the root): `docker build .` (the `docker:*:build` scripts do this).

1. **Build stage** (`node:26-slim`): `npm install -g pnpm@10.33.0` (Node 26 n'embarque plus corepack) + `pnpm install --frozen-lockfile --ignore-scripts`, then `pnpm build`.
2. **Runtime stage** (`node:26-slim`): copies `.output/` only, runs `node .output/server/index.mjs` as user `node` on port **8080** (`NITRO_PORT`), with a healthcheck. `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` and `JWT_SECRET` are **required** at run time (`docker-entrypoint.sh` exits at startup with an explicit message if one is missing); `JWT_TTL_SECONDS` is optional.

Registry: `dockregistry.xju.fr/mccbng/front:{staging,latest}`. `docker:run` maps port 8080 (fill in the `DB_*` and `JWT_SECRET` placeholders). Migrations are not run by the image: use `pnpm db:migrate` (`db-migrations.md`).

## File Structure

```
./
├── nuxt.config.ts
├── app/
│   ├── app.vue                       # Root layout
│   ├── pages/                        # File-based routes (+ overlay children in sibling folders)
│   ├── components/                   # + RouteOverTheContent.vue
│   ├── composables/                  # useTheme, useDebugTools
│   ├── middleware/auth.global.ts
│   ├── plugins/                      # fontawesome.ts, touch-events.client.ts
│   ├── services/                     # fetch-based services per domain + http.ts, config.ts
│   ├── stores/                       # user, compte, operation, category, stats, display, credit, bien, banque
│   └── assets/styles/                # variables.scss, theme.css, main.css
├── server/                           # REST API hosted by Nitro (api/, middleware/, plugins/, db/, utils/)
├── scripts/db-migrate.mjs            # SQL migration runner
├── public/                           # icons, favicon
├── tests/{unit,integration,api,support,fixtures}/
├── vitest.config.ts / vitest.api.config.ts
├── eslint.config.mjs
├── tsconfig.json                     # references .nuxt/tsconfig.*.json
├── Dockerfile / .dockerignore / docker-entrypoint.sh
└── package.json
```

## Conventions When Editing

- Use `<script setup lang="ts">` and the Composition API in new components, with **explicit imports** (no auto-imports).
- Add a new domain by creating: `app/services/<domain>.ts` (using `services/http.ts` and the relative base URL from `services/config.ts`), `app/stores/<domain>.ts` (a setup store), and components under `app/components/`.
- Model modal-style flows as **child pages** (absolute `path`, `name`, `componentName` in `definePageMeta`) rendering `RouteOverTheContent`, and update `tests/fixtures/routes.ts`.
- Keep route names stable: the code reads `route.name`.
- For currency display, prefer `<Currency :amount="…" />`.
- Read auth through `getTokenCookie()` / `getUserIDCookie()` (or the user store) rather than touching cookies directly, and use `hydrateSession` to load a session.
- Keep state mutations free of HTTP calls — services do the I/O, actions orchestrate.
- Never call `useXStore()` at module top level in a store file.
- Add an API endpoint under `server/api/` (wrapped in `defineApiHandler`), scope it with `getCurrentUserId`, validate input with Zod, and cover it in `tests/api/` with at least a second user to prove the isolation. For a new CRUD resource, describe it in `server/utils/resources.ts` and, if it has sub-routes, add explicit `crudRoute` files in its directory.
- Never look a user up by the `id` column: use `IDuser`.
