# CLAUDE.md — Frontend (Vue 3 SPA)

## Overview

Single Page Application for the mccbng personal finance app. Built with **Vue 3.5 + TypeScript + Vite + Vuex 4 + Vue Router 4**, with light/dark theme support, touch gestures, and PWA packaging. Covers banks, accounts, operations, recurring operations, categories, statistics, **loans (Credit)** and **real-estate assets (Bien)**.

## Commands

```bash
pnpm dev                # Vite dev server (port 8080, proxies /api to backend)
pnpm build              # Production build (dist/)
pnpm build:staging      # Staging build (--mode test)
pnpm test               # Run Jest tests
pnpm test:unit          # Unit tests only
pnpm test:watch         # Tests in watch mode
pnpm test:coverage      # Tests with coverage report
pnpm type-check         # TypeScript type checking (vue-tsc --noEmit)
pnpm lint               # ESLint with auto-fix (.vue, .js, .jsx, .ts, .tsx)
pnpm lint:check         # ESLint check only
```

## Architecture

### Application Bootstrap

```
src/main.ts             → Creates Vue app, registers store, router, vue3-touch-events, FontAwesome
src/App.vue             → Root layout: AccountHeader (top) + CompteList (left) + RouterView + NavBar (bottom)
src/router.ts           → Vue Router 4 with lazy-loaded routes
src/store/index.ts      → Vuex 4 store with 8 modules (no namespacing)
```

**Plugin registration order (`main.ts`):**

1. Vuex store
2. Vue Router
3. `vue3-touch-events` (npm package — replaces the former local `vue-touch-events/` workspace)
4. FontAwesome (registered globally as `<FontAwesomeIcon>` via `plugins/fontawesome.ts`)

`App.vue` calls `useGlobalTheme()` and `useGlobalDebugTools().initDebugTools()` on setup, watches `store.state.user.id` to fetch the account list and categories on login, and force-pushes `/login` on init.

### Layout

```
┌──────────────────────────────────────────────┐
│              AccountHeader                    │  ← active account, balances, totals, mask toggle
├──────────────┬───────────────────────────────┤
│  CompteList  │        RouterView              │
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

### Routes (`src/router.ts`)

All routes use lazy loading via `import()` with `webpackChunkName` hints. Child routes use the **overlay pattern**: every child path renders the same `RouteOverTheContent` view, which in turn renders a form (`OperationForm`, `TransfertForm`, `Search`, `OperationRecurrenteForm`, `CreditForm`, `BienForm`) based on the `componentName` prop.

| Path | View | Chunk | Children |
|------|------|-------|----------|
| `/` | `Home` | `home` | `/newOperation`, `/editOperation/:id`, `/search`, `/transfert`, `/retrait` |
| `/recurrOperation` | `OperationsRecurrentes` | `operecur` | `/newRecurrOperation`, `/editRecurrOperation/:id` |
| `/amortissement` | `Amortissement` | `operecur` | — |
| `/credits` | `Credits` | `credits` | `/newCredit`, `/editCredit/:id` |
| `/biens` | `Biens` | `biens` | `/newBien`, `/editBien/:id` |
| `/stats` | `Stats` | `stats` | — |
| `/login` | `Login` | `login` | — |
| `/config` | `Config` | `config` | — |
| `/editUser` | `EditUser` | `edituser` | — |

Routes with `meta.disabledTotalHeader: true` hide the global totals in `AccountHeader`.

### Vuex Store (`src/store/`)

Eight modules, no namespacing — accessed as `store.state.<module>.<prop>` and via root-level dispatch.

#### `user`
- **State**: `id`, `username`, `email`, `token`, `favoris`, `warningTotal`, `warningCompte`, `maskAmount`
- **Actions**: `fetchUser(userID)`, `updateUser(updates)`, `saveUserToken(token)`, `toggleMaskAmount()`
- `maskAmount` hides monetary values throughout the UI.

#### `compte`
- **State**: `activeAccount`, `accountList`, `currency` (default `'€'`)
- **Getters**: `bloquedCompte`, `retraiteCompte`, `availableCompte`, `porteFeuilleCompte`, `jointCompte`, `childrenCompte`, `totalAvailable`, `totalGlobal`, `totalRetraite`, `totalJoint`, `totalChildren`, `getAccount(IDcompte)`, `visibleAccounts`
- **Actions**: `fetchUserByIDAndGenerateRecurringOp(userID)`, `generateRecurringOperations()`, `fetchActiveAccount(accountID)`, `fetchAccountList()`
- Computes checked / unchecked balances per account; filters by account-type flags.

#### `operation`
- **State**: `operationsOfActiveAccount`, `recurringOperations`, `hasMoreOperations`, `isLoadingOperations`, `operationsSkip`, `operationsLimit` (35), `isSearchMode`, `currentSearchTerms`
- **Actions**: `fetchOperationsOfActiveAccount()`, `loadMoreOperations()` (infinite scroll), `updateOperation(op)`, `deleteOperation(op)`, `createTransfert(op)` (creates a debit + credit pair), `fetchRecurrOperation()`, `updateRecurringOperation(op)`, `deleteRecurringOperation(op)`, `getSearchOperations(terms)`, `loadMoreSearchOperations()`, `fetchOperations(where)`
- Skip/limit pagination, 35 items per page.

#### `category`
- **State**: `list`
- **Getters**: `getCategoryName(IDcat)`
- **Actions**: `fetchCategoryList()` — lazy loads (only fetches if list is empty / very small).

#### `stats`
- **State**: `negativeMonth`, `currentMonth`, `currentYear`, `categoriesTotal`
- **Getters**: `getCategoriesTotalForHighchartPie` (transforms data for Highcharts pie format)
- **Actions**: `fetchSumByUserByMonth()`, `fetchSumCategoriesByUserByMonth()`, `changeStatsCurrentYear(year)`, `changeStatsCurrentMonth(month)`

#### `display`
- **State**: `account_list` (boolean, toggles left panel visibility on mobile)
- **Actions**: `toggleAccountList(force?)`

#### `credit`
- **State**: `creditList`, `activeCredit`, `creditBalances` (dict by `IDcredit`), `isLoadingCredits`
- **Getters**: `creditFromList(creditID)`
- **Actions**: `fetchCredits()` (also fetches remaining balances for each), `updateCredit(credit)`, `deleteCredit(credit)`, `fetchCreditDetails(IDcredit)`

#### `bien`
- **State**: `bienList`, `activeBien`, `isLoadingBiens`
- **Getters**: `bienFromList(bienID)`
- **Actions**: `fetchBiens()`, `updateBien(bien)`, `deleteBien(bien)`, `fetchBienDetails(IDbien)`

### Services (`src/services/`)

API layer using Axios. Each function accepts `token` and `apiUrl` so services stay stateless.

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

**Authentication**: token stored in cookies (`userToken`, `userID`) via `universal-cookie`. The app force-pushes to `/login` on startup; `Login.vue` validates the 6-char code, stores the cookies, then routes to `/`.

### Components (`src/components/`)

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

### Views (`src/views/`)

| View | Description |
|------|-------------|
| **Login.vue** | 6-character code input → `auth(code)` → save cookies, dispatch `fetchUser` |
| **Home.vue** | Active account `OperationList`; child routes overlay forms |
| **OperationsRecurrentes.vue** | Recurring operations list and management |
| **Amortissement.vue** | Operations filtered with `amortissement: 1` (loan principal repayments) |
| **Credits.vue** | Loans dashboard |
| **Biens.vue** | Real-estate assets dashboard |
| **Stats.vue** | Dashboard composing the three Stats components |
| **Config.vue** | Settings: reload, edit account, theme toggle, debug-tools toggle, logout |
| **EditUser.vue** | Form to update profile (`PATCH /api/users/me`) |
| **RouteOverTheContent.vue** | Dynamic overlay wrapper — reads `componentName` prop and renders the matching form |

### Composables (`src/composables/`)

- **`useTheme.ts`** — theme management.
  - Modes: `light`, `dark`, `system`.
  - Persists choice to `localStorage` under `theme`.
  - Listens to `prefers-color-scheme` changes.
  - Sets `data-theme` attribute and `dark-theme` class on `<html>`.
  - Singleton via `useGlobalTheme()` for shared state.
- **`useDebugTools.ts`** — optional Eruda integration.
  - `localStorage` key: `debugToolsEnabled`.
  - `initDebugTools()` reads the flag and lazy-loads Eruda (`eruda` npm package) when enabled.
  - `toggleDebugTools()` flips the flag.
  - Singleton via `useGlobalDebugTools()`.
  - Toggled from `Config.vue` to enable a mobile dev console.

### Plugins (`src/plugins/`)

- **`fontawesome.ts`** — registers a curated set of FontAwesome solid icons; the resulting component is exposed globally as `<FontAwesomeIcon>`.

### Styles (`src/styles/`)

- **`variables.scss`** — SCSS variables globally injected via Vite `additionalData` (breakpoints, layout):
  - `$desktop_BP_min_width: 768px`, `$mobile_BP_max_width: 767px`
  - `$header-height: 70px`, `$header-height-and-margin: 80px`
  - `$left-panel-width: 33%`, `$navbar-height: 40px`, `$navbar-height-and-margin: 70px`
- **`theme.css`** — CSS custom properties for the full theme system: gradients, base colors, text, backgrounds (incl. glass-morphism), borders, button states, z-index. Light + dark via `@media (prefers-color-scheme: dark)` and `html[data-theme="dark"]`.
- **`main.css`** — global resets, font stack, container/grid utilities.

### PWA Configuration

Configured via `vite-plugin-pwa` in `vite.config.ts`:

- Manifest: name `MCCB NG`, short name `MCCB`, display `standalone`.
- Icons: 192×192 and 512×512 PNG.
- Service worker: `service-worker.js` registered with `autoUpdate`.
- Workbox for caching strategies.
- `src/registerServiceWorker.js` performs the runtime registration.

### Vite Configuration (`vite.config.ts`)

- **Dev server**: port 8080, proxies `/api` to `VITE_API_URL` (default `http://localhost:3000`).
- **Build**: manual chunks — `vue` (vue / vue-router / vuex), `vendor` (axios / highcharts).
- **SCSS**: modern compiler API, global variables injection.
- **Aliases**: `@` → `src/`.
- **Vue flags**: Options API enabled, prod devtools disabled.

### Testing

- **Framework**: Jest with `jest-environment-jsdom`.
- **Vue testing**: `@vue/test-utils` + `@vue/vue3-jest`.
- **TypeScript**: `ts-jest`.
- **CSS**: `identity-obj-proxy` for CSS module mocking.
- **Config**: `jest.config.js`.
- **Tests**: `tests/unit/`.
- **lint-staged**: ESLint auto-fix on commit for `.js, .jsx, .ts, .tsx, .vue`.

## Dependencies

### Runtime
- `vue` ^3.5, `vue-router` ^4.5, `vuex` ^4.1 — core framework
- `axios` ^1.13 — HTTP client
- `highcharts` ^12.2 — charts
- `@fortawesome/fontawesome-svg-core`, `@fortawesome/free-solid-svg-icons`, `@fortawesome/vue-fontawesome` — icons
- `universal-cookie` ^4 — cookie management for auth
- `vue3-touch-events` ^4 — Vue 3 touch / swipe gestures (replaces former local workspace)
- `eruda` ^3 — optional in-page mobile dev console (lazy-loaded)
- `register-service-worker`, `core-js`

### Dev
- `vite` ^6.3, `@vitejs/plugin-vue`
- `vite-plugin-pwa`, `workbox-build`, `workbox-window`
- `typescript` ^5.8, `vue-tsc` ^2.2
- `sass` ^1.86
- `jest` ^29.7, `@vue/test-utils` ^2.4, `@vue/vue3-jest`, `ts-jest`, `babel-jest`
- `eslint` ^8.57 + Vue / TS / Standard plugins, `lint-staged`

## Docker

Multi-stage build:

1. **Build stage** (`node:22-slim`): install deps with pnpm, run `pnpm build`.
2. **Production stage** (`nginx`): copy `dist/` to nginx html, custom `nginx.conf` with SPA fallback (`try_files $uri /index.html`).

Registry: `dockregistry.xju.fr/mccbng/front:{staging,latest}`.

## File Structure

```
front/
├── src/
│   ├── main.ts                       # App entry point
│   ├── App.vue                       # Root layout
│   ├── router.ts                     # Vue Router config (lazy + overlay child routes)
│   ├── registerServiceWorker.js      # PWA SW registration
│   ├── shims-vue.d.ts                # Vue SFC type declarations
│   ├── store/
│   │   ├── index.ts                  # Vuex store wiring
│   │   ├── user.ts                   # auth, profile, maskAmount
│   │   ├── compte.ts                 # accounts + balances
│   │   ├── operation.ts              # operations + pagination + search
│   │   ├── category.ts               # categories (lazy)
│   │   ├── stats.ts                  # monthly stats + charts
│   │   ├── display.ts                # UI panel toggle
│   │   ├── credit.ts                 # loans + remaining balances
│   │   └── bien.ts                   # real-estate assets
│   ├── services/                     # axios services per domain (auth, user, compte, operation, category, stats, credit, bien)
│   ├── composables/
│   │   ├── useTheme.ts               # theme system (light/dark/system)
│   │   └── useDebugTools.ts          # Eruda lazy load
│   ├── components/
│   │   ├── AccountHeader.vue
│   │   ├── NavBar.vue
│   │   ├── CompteList/{index,Compte}.vue
│   │   ├── OperationList.vue
│   │   ├── OperationForm.vue
│   │   ├── TransfertForm.vue
│   │   ├── Search.vue
│   │   ├── OperationRecurrente{,List,Form}.vue
│   │   ├── CreditCard.vue / CreditForm.vue / CreditList.vue
│   │   ├── BienCard.vue / BienForm.vue / BienList.vue
│   │   ├── Currency.vue
│   │   ├── Home/Operation.vue
│   │   ├── Amortissement/Operation.vue
│   │   └── Stats/{SumByMonth,PieByCategorie,TimeSeriesEvolutionSoldes}.vue
│   ├── views/                        # Login, Home, OperationsRecurrentes, Amortissement, Credits, Biens, Stats, Config, EditUser, RouteOverTheContent
│   ├── plugins/
│   │   └── fontawesome.ts
│   └── styles/
│       ├── variables.scss
│       ├── theme.css
│       └── main.css
├── tests/
│   ├── setup.js
│   └── unit/
│       └── example.spec.js
├── public/                           # static assets (icons, favicon)
├── vite.config.ts
├── jest.config.js
├── tsconfig.json
├── Dockerfile
├── nginx.conf
└── package.json
```

## Conventions When Editing

- Use `<script setup lang="ts">` and the Composition API in new components.
- Add a new domain by creating: a `services/<domain>.ts` (axios), a `store/<domain>.ts` (module registered in `store/index.ts`), and components under `components/`.
- Modal-style flows should be modeled as **child routes** with `RouteOverTheContent` and a `componentName` prop, not as imperative components.
- For currency display, prefer `<Currency :amount="…" />` so the locale and symbol stay centralised.
- Read auth from `getTokenCookie()` / `getUserIDCookie()` rather than from the Vuex store when calling services from outside Vue components.
- Keep state mutations free of axios calls — services do the I/O, actions orchestrate.
