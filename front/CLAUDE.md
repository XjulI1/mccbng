# CLAUDE.md — Frontend (Vue 3 SPA)

## Overview

Single Page Application for the mccbng personal finance application. Built with Vue 3, TypeScript, Vite, and Vuex 4. Provides a mobile-responsive PWA for managing bank accounts, transactions, categories, and statistics with dark/light theme support and touch gestures.

## Commands

```bash
yarn dev                # Development server with Vite (port 8080, proxies /api to backend)
yarn build              # Production build (output: dist/)
yarn build:staging      # Staging build (--mode test)
yarn test               # Run Jest tests
yarn test:unit          # Unit tests only
yarn test:watch         # Tests in watch mode
yarn test:coverage      # Tests with coverage report
yarn type-check         # TypeScript type checking (vue-tsc --noEmit)
yarn lint               # ESLint with auto-fix (.vue, .js, .jsx, .ts, .tsx)
yarn lint:check         # ESLint check only (no auto-fix)
```

## Architecture

### Application Bootstrap

```
src/main.ts             → Creates Vue app, registers plugins (store, router, Vue2TouchEvents, FontAwesome)
src/App.vue             → Root component with layout: AccountHeader + CompteList (left panel) + RouterView (right panel) + NavBar
src/router.ts           → Vue Router with lazy-loaded routes
src/store/index.ts      → Vuex store with 6 modules
```

**Plugin registration order in `main.ts`:**
1. Vuex store
2. Vue Router
3. Vue2TouchEvents (custom touch events plugin from `vue-touch-events/` workspace)
4. FontAwesome (registered as global `FontAwesomeIcon` component)

### Layout Architecture

```
┌─────────────────────────────────────────────┐
│              AccountHeader                   │  ← Shows active account name, balances, totals
├──────────────┬──────────────────────────────┤
│              │                              │
│  CompteList  │        RouterView            │  ← Main content area
│  (left panel)│    (Home / Stats / etc.)     │
│              │                              │
│  Swipeable   │        Swipeable             │
│  ←close      │        →open                 │
│              │                              │
├──────────────┴──────────────────────────────┤
│                NavBar                        │  ← Bottom navigation
└─────────────────────────────────────────────┘
```

- **Desktop** (>=768px): Left panel visible at 33% width, right panel takes remaining space
- **Mobile** (<768px): Left panel slides in/out with CSS transitions and swipe gestures, full-width when visible

### Routes (`src/router.ts`)

All routes use lazy loading via dynamic `import()`:

| Path | View | Description | Children |
|------|------|-------------|----------|
| `/` | `Home` | Main operations view | `/newOperation`, `/editOperation/:id`, `/search`, `/transfert`, `/retrait` |
| `/recurrOperation` | `OperationsRecurrentes` | Recurring operations list | `/newRecurrOperation`, `/editRecurrOperation/:id` |
| `/amortissement` | `Amortissement` | Amortization tracking | — |
| `/stats` | `Stats` | Statistics dashboard | — |
| `/login` | `Login` | Authentication page | — |
| `/config` | `Config` | User settings | — |

Child routes use `RouteOverTheContent` — a wrapper view that dynamically renders `OperationForm`, `Search`, `TransfertForm`, or `OperationRecurrenteForm` based on `componentName` prop. This creates a modal-like overlay pattern.

Routes with `meta.disabledTotalHeader: true` hide the total balance in the header.

### Vuex Store (`src/store/`)

6 modules, all without namespacing:

#### `user` module
- **State**: `id`, `favoris`, `warningTotal`, `token`, `maskAmount`
- **Actions**: `fetchUser(userID)`, `saveUserToken(token)`, `toggleMaskAmount()`
- **Note**: `maskAmount` hides monetary values in the UI

#### `compte` module
- **State**: `activeAccount`, `accountList`, `currency` (default: `'€'`)
- **Getters**: `bloquedCompte`, `retraiteCompte`, `availableCompte`, `porteFeuilleCompte`, `jointCompte`, `childrenCompte`, `totalAvailable`, `totalGlobal`, `totalRetraite`, `totalJoint`, `totalChildren`, `getAccount(IDcompte)`, `visibleAccounts`
- **Actions**: `fetchUserByIDAndGenerateRecurringOp(userID)`, `generateRecurringOperations()`, `fetchActiveAccount(accountID)`, `fetchAccountList()`
- **Logic**: Computes checked/unchecked balances per account, filters by account type flags

#### `operation` module
- **State**: `operationsOfActiveAccount`, `recurringOperations`, `hasMoreOperations`, `isLoadingOperations`, `operationsSkip`, `operationsLimit` (35), `isSearchMode`, `currentSearchTerms`
- **Actions**: `fetchOperationsOfActiveAccount()`, `loadMoreOperations()` (infinite scroll), `updateOperation(op)`, `deleteOperation(op)`, `createTransfert(op)` (creates debit+credit pair), `fetchRecurrOperation()`, `updateRecurringOperation(op)`, `deleteRecurringOperation(op)`, `getSearchOperations(terms)`, `loadMoreSearchOperations()`, `fetchOperations(where)`
- **Pagination**: Skip/limit based with 35 items per page

#### `category` module
- **State**: `list`
- **Getters**: `getCategoryName(IDcat)` — Finds category by ID
- **Actions**: `fetchCategoryList()` — Lazy-loads (only fetches if < 2 items)

#### `stats` module
- **State**: `negativeMonth`, `currentMonth`, `currentYear`, `categoriesTotal`
- **Getters**: `getCategoriesTotalForHighchartPie` — Transforms categories data for Highcharts pie chart format
- **Actions**: `fetchSumByUserByMonth()`, `fetchSumCategoriesByUserByMonth()`, `changeStatsCurrentYear(year)`, `changeStatsCurrentMonth(month)`

#### `display` module
- **State**: `account_list` (boolean, toggles left panel visibility)
- **Actions**: `toggleAccountList(force?)`

### Services (`src/services/`)

API communication layer using Axios. All services accept `token` and `apiUrl` parameters.

| Service | Functions | API Endpoints |
|---------|-----------|---------------|
| **auth.ts** | `auth(code, apiUrl)`, `saveCookies()`, `removeCookies()`, `getTokenCookie()`, `getUserIDCookie()`, `checkUserAuthentification()` | `POST /api/users/login`, `GET /api/users/exists` |
| **user.ts** | `fetchUser(userID, token, apiUrl)` | `GET /api/users/whoAmI` |
| **compte.ts** | `fetchAccountList()`, `sumAllCompteForUser()`, `sumForACompte()` | `GET /api/comptes`, `GET /api/operations/sumAllCompteForUser`, `GET /api/operations/sumForACompte` |
| **operation.ts** | `fetchOperationsForAccount()`, `updateOperation()`, `deleteOperation()`, `fetchRecurrOperation()`, `updateRecurringOperation()`, `deleteRecurringOperation()`, `generateRecurringOperations()`, `fetchSearchOperations()`, `fetchOperations()` | Various `/api/operations` and `/api/operation-recurrentes` endpoints |
| **category.ts** | `fetchCategoryList()` | `GET /api/categories` |
| **stats.ts** | `fetchEvolutionSolde()` | `GET /api/stats/evolutionSolde` |

**Authentication**: Token stored in cookies (`userToken`, `userID`) via `universal-cookie`. The app redirects to `/login` on startup and checks token validity.

### Components (`src/components/`)

| Component | Description |
|-----------|-------------|
| **AccountHeader.vue** | Top header showing active account name, checked/unchecked balances, and global totals |
| **NavBar.vue** | Bottom navigation bar with links to main views |
| **CompteList/index.vue** | Left panel account list, grouped by account type |
| **CompteList/Compte.vue** | Individual account item in the list |
| **OperationList.vue** | Scrollable list of operations for the active account with infinite scroll |
| **Home/Operation.vue** | Single operation row with swipe-to-delete and check/uncheck |
| **OperationForm.vue** | Form for creating/editing operations with category suggestion |
| **TransfertForm.vue** | Form for transfers between accounts (debit + credit) |
| **Search.vue** | Search form to find operations by name across all accounts |
| **OperationRecurrenteList.vue** | List of recurring operations |
| **OperationRecurrente.vue** | Single recurring operation row |
| **OperationRecurrenteForm.vue** | Form for creating/editing recurring operations |
| **Currency.vue** | Currency display component (formats amounts with `€`) |
| **Amortissement/Operation.vue** | Operation row for amortization view |
| **Stats/SumByMonth.vue** | Monthly expense summary component |
| **Stats/PieByCategorie.vue** | Highcharts pie chart for category breakdown |
| **Stats/TimeSeriesEvolutionSoldes.vue** | Highcharts time series for balance evolution |

### Views (`src/views/`)

| View | Description |
|------|-------------|
| **Login.vue** | 6-character code input for authentication |
| **Home.vue** | Main view: OperationList for the active account |
| **OperationsRecurrentes.vue** | Recurring operations management |
| **Amortissement.vue** | Amortization tracking view |
| **Stats.vue** | Statistics dashboard with charts |
| **Config.vue** | User settings (theme toggle, preferences) |
| **RouteOverTheContent.vue** | Dynamic overlay wrapper for child route components |

### Composables (`src/composables/`)

- **useTheme.ts**: Theme management composable
  - Supports `light`, `dark`, `system` modes
  - Persists choice to `localStorage`
  - Listens to system `prefers-color-scheme` changes
  - Singleton pattern via `useGlobalTheme()` for shared state
  - Sets `data-theme` attribute and `.dark-theme` class on `<html>`

### Styling

- **SCSS**: Variables in `src/styles/variables.scss` (globally injected via Vite `additionalData`)
  - Breakpoints: desktop >=768px, mobile <768px
  - Layout: `$header-height: 70px`, `$left-panel-width: 33%`, `$navbar-height: 40px`
- **CSS Custom Properties**: Full theme system in `src/styles/theme.css`
  - Colors, gradients, shadows, spacing, typography, z-index
  - Light and dark variants via `@media (prefers-color-scheme: dark)` and `html[data-theme]`
  - Glass morphism effects
- **Global styles**: `src/styles/main.css`

### Plugins (`src/plugins/`)

- **fontawesome.ts**: Configures FontAwesome with `@fortawesome/free-solid-svg-icons`

### PWA Configuration

Configured via `vite-plugin-pwa` in `vite.config.ts`:
- Service worker: `service-worker.js` with `autoUpdate` registration
- Manifest: `MCCB NG` / `MCCB`, standalone display mode
- Icons: 192x192 and 512x512 PNG
- Workbox for caching strategies

### Vite Configuration (`vite.config.ts`)

- **Dev server**: Port 8080, proxies `/api` to `VITE_API_URL` (default `http://localhost:3000`)
- **Build**: Manual chunks — `vue` (vue/vue-router/vuex), `vendor` (axios/highcharts)
- **SCSS**: Modern compiler API, global variables injection
- **Aliases**: `@` → `src/`
- **Vue flags**: Options API enabled, prod devtools disabled

### Testing

- **Framework**: Jest with `jest-environment-jsdom`
- **Vue testing**: `@vue/test-utils` + `@vue/vue3-jest`
- **TypeScript**: `ts-jest`
- **CSS**: `identity-obj-proxy` for CSS module mocking
- **Config**: `jest.config.js`
- **Test location**: `tests/unit/`
- **Lint-staged**: ESLint auto-fix on commit for `.js, .jsx, .ts, .tsx, .vue` files

## Dependencies

### Runtime
- `vue` ^3.5, `vue-router` ^4.5, `vuex` ^4.1 — Core framework
- `axios` ^1.13 — HTTP client
- `highcharts` ^12.2 — Charts and visualizations
- `@fortawesome/fontawesome-svg-core`, `@fortawesome/free-solid-svg-icons`, `@fortawesome/vue-fontawesome` — Icons
- `universal-cookie` ^4.0 — Cookie management for auth tokens
- `hammerjs` ^2.0 — Touch gesture support
- `vue2-touch-events` — Custom workspace touch plugin
- `register-service-worker` — PWA service worker registration
- `core-js` — Polyfills

### Dev
- `vite` ^6.3, `@vitejs/plugin-vue` ^5.2 — Build tooling
- `vite-plugin-pwa` ^1.0, `workbox-build`, `workbox-window` — PWA
- `typescript` ^5.8, `vue-tsc` ^2.2 — Type checking
- `sass` ^1.86 — SCSS support
- `jest` ^29.7, `@vue/test-utils` ^2.4 — Testing
- `eslint` ^8.57 with Vue and TypeScript plugins — Linting

## Docker

Multi-stage build:
1. **Build stage** (`node:22-slim`): Install deps, run `yarn build`
2. **Production stage** (`nginx`): Copy `dist/` to nginx html, custom `nginx.conf`

Registry: `dockregistry.xju.fr/mccbng/front:{staging,latest}`

## File Structure

```
front/
├── src/
│   ├── main.ts                     # App entry point
│   ├── App.vue                     # Root component (layout)
│   ├── router.ts                   # Vue Router config (lazy routes)
│   ├── registerServiceWorker.js    # PWA service worker registration
│   ├── shims-vue.d.ts              # Vue SFC type declarations
│   ├── store/
│   │   ├── index.ts                # Vuex store with 6 modules
│   │   ├── user.ts                 # User state (auth, preferences)
│   │   ├── compte.ts               # Account state (list, active, balances)
│   │   ├── operation.ts            # Operations state (CRUD, pagination, search)
│   │   ├── category.ts             # Categories state
│   │   ├── stats.ts                # Statistics state (monthly, charts)
│   │   └── display.ts              # UI display state (panel toggle)
│   ├── services/
│   │   ├── auth.ts                 # Authentication (login, cookies, token check)
│   │   ├── user.ts                 # User API calls
│   │   ├── compte.ts               # Account API calls
│   │   ├── operation.ts            # Operation API calls (CRUD, search, recurring)
│   │   ├── category.ts             # Category API calls
│   │   └── stats.ts                # Statistics API calls
│   ├── composables/
│   │   └── useTheme.ts             # Theme management (light/dark/system)
│   ├── components/
│   │   ├── AccountHeader.vue       # Top header with balances
│   │   ├── NavBar.vue              # Bottom navigation
│   │   ├── CompteList/
│   │   │   ├── index.vue           # Account list panel
│   │   │   └── Compte.vue          # Account list item
│   │   ├── OperationList.vue       # Operations list with infinite scroll
│   │   ├── OperationForm.vue       # Operation create/edit form
│   │   ├── TransfertForm.vue       # Transfer between accounts
│   │   ├── Search.vue              # Operation search
│   │   ├── Currency.vue            # Currency formatting
│   │   ├── OperationRecurrenteList.vue
│   │   ├── OperationRecurrente.vue
│   │   ├── OperationRecurrenteForm.vue
│   │   ├── Home/
│   │   │   └── Operation.vue       # Operation row (swipeable)
│   │   ├── Amortissement/
│   │   │   └── Operation.vue       # Amortization operation row
│   │   └── Stats/
│   │       ├── SumByMonth.vue      # Monthly expense summary
│   │       ├── PieByCategorie.vue  # Category pie chart (Highcharts)
│   │       └── TimeSeriesEvolutionSoldes.vue  # Balance evolution chart
│   ├── views/
│   │   ├── Login.vue               # Authentication page
│   │   ├── Home.vue                # Main operations view
│   │   ├── OperationsRecurrentes.vue
│   │   ├── Amortissement.vue
│   │   ├── Stats.vue               # Statistics dashboard
│   │   ├── Config.vue              # User settings
│   │   └── RouteOverTheContent.vue # Dynamic overlay for child routes
│   ├── plugins/
│   │   └── fontawesome.ts          # FontAwesome icon setup
│   └── styles/
│       ├── variables.scss          # SCSS variables (breakpoints, layout)
│       ├── theme.css               # CSS custom properties (light/dark theme)
│       └── main.css                # Global styles
├── tests/
│   ├── setup.js                    # Jest setup
│   └── unit/
│       └── example.spec.js         # Example test
├── public/                         # Static assets (icons, favicon)
├── vite.config.ts                  # Vite configuration
├── jest.config.js                  # Jest configuration
├── tsconfig.json                   # TypeScript config
├── Dockerfile                      # Multi-stage build (node + nginx)
├── nginx.conf                      # Nginx config for SPA routing
└── package.json
```
