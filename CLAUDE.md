# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**mccbng** (mCloud Compte and Budget Next Generation) is a personal finance and budgeting application. It is structured as a Yarn workspaces monorepo with three packages:

- `back/` — LoopBack 4 REST API with JWT authentication and MySQL database
- `front/` — Vue 3 SPA with TypeScript, Vite, Vuex, and PWA support
- `vue-touch-events/` — Custom Vue 3 touch events plugin (fork of vue2-touch-events adapted for Vue 3)

See `back/CLAUDE.md` and `front/CLAUDE.md` for detailed architecture documentation of each package.

## Development Commands

### Root Level
```bash
yarn install           # Install all workspace dependencies (uses Yarn workspaces)
```

### Backend (`back/`)
```bash
cd back
yarn build              # Compile TypeScript (lb-tsc)
yarn build:watch        # Watch mode compilation
yarn start              # Run production server (node -r source-map-support/register .)
yarn lint               # Run ESLint and Prettier checks
yarn lint:fix           # Fix linting issues
yarn test               # Run tests with Mocha
yarn clean              # Clean build artifacts
yarn migrate            # Run database migrations (builds first via premigrate hook)
```

### Frontend (`front/`)
```bash
cd front
yarn dev                # Development server with Vite (port 8080)
yarn build              # Production build
yarn build:staging      # Staging build (--mode test)
yarn test               # Run Jest tests
yarn test:unit          # Unit tests only
yarn test:coverage      # Tests with coverage
yarn type-check         # TypeScript type checking (vue-tsc --noEmit)
yarn lint               # ESLint with auto-fix
yarn lint:check         # ESLint check only (no auto-fix)
```

## Architecture Overview

### How It All Connects

```
[Browser / PWA]
      │
      ▼
[Vue 3 Frontend]  ──── Axios ────►  [LoopBack 4 API]  ────►  [MySQL Database]
  (port 8080)          /api            (port 3000)
```

1. The frontend authenticates via `POST /api/users/login` with a 6-character secret code
2. The API returns a JWT token stored in cookies (`userToken`, `userID`)
3. All subsequent API calls include `Authorization: Bearer <token>` header
4. The Vite dev server proxies `/api` requests to the backend

### Domain Model

The application manages personal finances with this hierarchy:

- **User** — Has banks, accounts, categories
- **Banque** (Bank) — Groups accounts by financial institution
- **Compte** (Account) — Individual bank account with balance and type flags (bloque, joint, children, retraite, porte_feuille, visible)
- **Operation** — Single financial transaction (debit/credit) tied to an account and category
- **OperationRecurrente** — Recurring transaction template with frequency (monthly/yearly) for auto-generation
- **Categorie** (Category) — User-defined classification for operations, with optional stats tracking
- **Stats** — Aggregated balance evolution data

### Key Features
- Multi-bank account management with account type classification
- Transaction CRUD with check/uncheck status
- Recurring operation auto-generation
- Transfer between accounts
- Category-based expense tracking
- Monthly statistics with pie charts (Highcharts)
- Balance evolution time series
- Smart category suggestions based on operation name patterns
- Dark/light/system theme support
- Mobile-responsive PWA with swipe gestures
- Amortization tracking

## Development Setup

- **Node.js**: >=20 (see `.nvmrc`)
- **Package Manager**: Yarn 1.22.19 (see `packageManager` in root `package.json`)
- **Backend**: Runs on port 3000 (configurable via HOST/PORT env vars)
- **Frontend dev server**: Runs on port 8080 with proxy to backend `/api`

### Environment Configuration
- **Frontend**: `VITE_API_URL` — Backend API base URL (used by Vite proxy and at runtime via `window.env.VITE_API_URL`)
- **Backend**: `back/src/datasources/mccb-mysql.datasource.config.json` — MySQL connection config (host, port, user, password, database)

## Docker Deployments

Both packages have Dockerfiles for containerized deployment:

- **Backend**: `node:22-slim` base, builds TypeScript, removes source and config files for security, runs on port 3000
- **Frontend**: Multi-stage build with `node:22-slim` + `nginx`, serves static files via nginx

Registry: `dockregistry.xju.fr/mccbng/` with `staging` and `latest` tags.

Docker commands available via `yarn docker:staging:build`, `yarn docker:staging:push`, `yarn docker:latest:build`, `yarn docker:latest:push` in each package.

## Code Conventions

- Backend uses LoopBack 4 decorators (`@model`, `@property`, `@repository`, `@authenticate('jwt')`)
- Frontend uses Vue 3 Composition API with `<script setup lang="ts">`
- SCSS with global variables imported via Vite's `additionalData`
- CSS custom properties for theming (light/dark mode)
- French naming in domain models (Banque, Compte, Operation, Categorie)
- All financial amounts use FLOAT type with manual rounding to 2 decimal places
