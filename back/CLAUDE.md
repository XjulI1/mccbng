# CLAUDE.md — Backend (LoopBack 4 API)

## Overview

REST API server for the mccbng personal finance application, built with **LoopBack 4** on top of Express, persisting to **MySQL** via `loopback-connector-mysql`. Provides JWT-authenticated endpoints for managing banks, accounts, transactions, recurring operations, categories, statistics, **loans (Credit)** and **real-estate assets (Bien)**.

## Commands

```bash
pnpm build              # Compile TypeScript with lb-tsc
pnpm build:watch        # Watch mode compilation
pnpm start              # Rebuild + run production server (node -r source-map-support/register .)
pnpm lint               # Run ESLint and Prettier checks
pnpm lint:fix           # Fix linting issues
pnpm test               # Run tests with Mocha (@loopback/testlab) — auto-rebuild via pretest
pnpm clean              # Clean build artifacts (lb-clean dist *.tsbuildinfo .eslintcache)
pnpm migrate            # Run database migrations (auto-builds via premigrate hook)
pnpm openapi-spec       # Emit OpenAPI 3 spec into a file
```

## Architecture

### Application Bootstrap

```
src/index.ts                → Entry point, instantiates ExpressServer, boot() + start()
src/server.ts               → ExpressServer wrapping LoopBack app, mounts API at /api
src/application.ts          → ApiLoopbackApplication (BootMixin + ServiceMixin + RepositoryMixin + RestApplication)
src/sequence.ts             → MySequence (extends MiddlewareSequence — no custom middleware)
src/openapi-spec.ts         → CLI to emit the OpenAPI spec
src/migrate.ts              → CLI for schema migration (--rebuild for DROP/CREATE)
```

**Key setup in `application.ts`:**

- Mounts `AuthenticationComponent` and `JWTAuthenticationComponent`.
- Binds `MyUserService` to `UserServiceBindings.USER_SERVICE` for custom auth logic.
- **Overrides** `TokenServiceBindings.TOKEN_SERVICE` with the local `JwtService` so that the numeric `IDuser` is preserved in the encoded token (the default LB4 service only carries `id`, `name`, `email`).
- `TOKEN_SECRET = generateUniqueId()` — a fresh secret per app startup; tokens are invalidated by a restart.
- Enables REST Explorer at `/explorer`.
- Boot options auto-discover controllers under `./controllers` (matches `*.controller.js`, `nested: true`).
- Static file root mapped to `../public`.

### Layered Architecture

```
Controllers  →  Repositories  →  DataSource (MySQL)
     ↑               ↑
  Services       Models (Entities)
```

### Models (`src/models/`)

| Model | Primary Key | Key Properties | Relationships |
|-------|------------|----------------|---------------|
| **User** | `id` (UUID) | `IDuser` (numeric, used by JWT), `email` (unique), `username`, `secret_key` (6-char login code), `favoris`, `warningTotal`, `warningCompte`, `emailVerified`, `verificationToken` | hasOne UserCredentials |
| **UserCredentials** | `id` (UUID) | `password`, `userId` | belongsTo User |
| **Banque** | `IDbanque` (auto-inc) | `NomBanque` | hasMany Compte |
| **Compte** | `IDcompte` (auto-inc) | `NomCompte`, `solde` (FLOAT), `IDuser`, `IDbanque`, `bloque`, `joint`, `children`, `retraite`, `porte_feuille`, `visible` | belongsTo Banque |
| **Operation** | `IDop` (auto-inc) | `NomOp`, `MontantOp` (FLOAT), `DateOp`, `CheckOp` (def `false`), `IDcompte`, `IDcat` (def `0`), `amortissement` (def `false`), `IDcredit?` | scoped via Compte |
| **OperationRecurrente** | `IDopRecu` (auto-inc) | `NomOpRecu`, `MontantOpRecu` (FLOAT), `JourOpRecu`, `JourNumOpRecu` (def `1`), `MoisOpRecu` (def `1`), `Frequence` (def `3`: 3=monthly, 7=yearly), `DernierDateOpRecu`, `IDcompte`, `IDcat` (def `0`), `IDcredit?` | scoped via Compte |
| **Categorie** | `IDcat` (auto-inc) | `Nom`, `IDuser`, `Stats` (bool, def `true`) | — |
| **Credit** | `IDcredit` (auto-inc) | `NomCredit`, `NomPreteur?`, `MontantInitial` (FLOAT), `MontantMensuel` (FLOAT), `TauxInteret?` (FLOAT), `DateDebut`, `DateFin`, `IDcompte`, `IDopRecu?`, `IDuser`, `Statut` (def `'actif'`), `IDcat` (def `0`) | — |
| **Bien** | `IDbien` (auto-inc) | `NomBien`, `Ville`, `TypeBien`, `Surface?` (FLOAT), `Usage` (def `'principale'`), `DateAchat`, `PrixBienNu` (FLOAT), `FraisNotaire` (FLOAT), `FraisAgence?` (FLOAT, def `0`), `ApportCash?` (FLOAT, def `0`), `ValeurActuelle?` (FLOAT), `IDcredit?`, `IDuser` | — |
| **Stats** | `userID` | — | view-like model used by analytics |

> Monetary values are stored as MySQL `FLOAT`. Always round amounts to 2 decimals at the application boundary.

### Controllers (`src/controllers/`)

All controllers except the public `POST /users/login`, `POST /signup`, and `GET /ping` are decorated with `@authenticate('jwt')`. Every protected handler resolves the user via `getCurrentUserId(currentUserProfile)` and then enforces ownership through one of two patterns:

- **Direct scoping** (`scope()`/`assertOwned()`) when the entity has an `IDuser` column.
- **Inherited scoping** when ownership comes from the parent `Compte`: the controller resolves the user's `IDcompte[]` and constrains queries with `{ IDcompte: { inq: ids } }` (see `OperationController.userCompteIds` and `OperationRecurrenteController`).

| Controller | Route prefix | Notable endpoints |
|-----------|--------------|-------------------|
| **PingController** | `/ping` | `GET /ping` — health check, public |
| **UserController** | `/users` + `/signup` | `POST /users/login` (public, body `{code: "XXXXXX"}` → `{id, userId}`); `GET /users/whoAmI`; `PATCH /users/me` (email / username / warningTotal / warningCompte / favoris, with email-uniqueness check); `GET /users/exists`; `POST /signup` (creates User + bcrypt-hashed UserCredentials, with uniqueness checks on `email`, `secret_key`, `IDuser`) |
| **BanqueController** | `/banques` | Standard CRUD |
| **CompteController** | `/comptes` | CRUD scoped per user |
| **CompteBanqueController** | `/comptes/{id}/banque` | Returns the bank for a given account |
| **CategoriesController** | `/categories` | CRUD scoped per user |
| **OperationController** | `/operations` | CRUD + analytics (see below) |
| **OperationRecurrenteController** | `/operation-recurrentes` | CRUD + `POST /operation-recurrentes/auto-generation` (replays missed occurrences for the current user) |
| **CreditController** | `/credits` | CRUD; on create auto-spawns a monthly OperationRecurrente; on delete removes the OperationRecurrente and nulls `IDcredit` on past Operations. Plus `GET /credits/{id}/remaining-balance` and `GET /credits/{id}/payments` |
| **BienController** | `/biens` | CRUD scoped per user; validates that any linked `IDcredit` belongs to the same user |
| **StatsController** | `/stats` | `GET /stats/evolutionSolde` returns `{soldeGlobal, soldeRetraite, soldeDispo, global, retraite, dispo}` time series |

**Notable `OperationController` analytics endpoints:**

- `GET /operations/sumAllCompteForUser` — checked / unchecked totals grouped by account.
- `GET /operations/sumForACompte?id=<IDcompte>` — checked / unchecked totals for a single account.
- `GET /operations/sumByUserByMonth?monthNumber=&yearNumber=&IDCompte=` — monthly total restricted to categories with `Stats=1`.
- `GET /operations/sumCategoriesByUserByMonth?monthNumber=&yearNumber=` — per-category totals for a month.
- `GET /operations/suggestCategories?operationName=&limit=` — category suggestions ranked by frequency of past operations whose name matches (LIKE), defaults to 5, clamped 1-50, name min length 2.

### Repositories (`src/repositories/`)

Most repositories are vanilla `DefaultCrudRepository`. Custom logic worth knowing:

- **UserRepository** — declares the hasOne relation with `UserCredentials` and exposes `findCredentials(userId)`.
- **CompteRepository** — declares belongsTo Banque with an inclusion resolver.
- **StatsRepository** — implements `evolutionSolde(userID)`. Runs raw SQL (`repository.execute(...)`) using MySQL `DATE_FORMAT` to compute current balances and daily time series across three account groupings (global, retraite, dispo / disponible).
- **OperationRepository** / **OperationRecurrenteRepository** — used together with `repository.execute(...)` for the analytics SQL.

### Services (`src/services/`)

- **`MyUserService`** (`user.service.ts`)
  - `verifyCredentials({code})` — looks up user by `secret_key`. The bcrypt password block is intentionally commented out: login is currently a 6-char secret-key lookup only.
  - `convertToUserProfile(user)` — builds a UserProfile with `securityId = id`, plus `name`, `id`, `email`, `IDuser`.
  - `findUserById(id)` — finds the user by UUID.
- **`JwtService`** (`jwt.service.ts`) — overrides the default LB4 token service so that `IDuser` (numeric) is preserved across encode/decode. Uses `jsonwebtoken` directly with `TOKEN_SECRET` and `TOKEN_EXPIRES_IN`.
- **`getCurrentUserId(profile)`** (`current-user.ts`) — utility used by every protected controller; throws `Unauthorized` when the profile lacks a numeric `IDuser`.
- **Binding keys** (`keys.ts`): `UserServiceBindings.USER_SERVICE`, `USER_REPOSITORY`, `USER_CREDENTIALS_REPOSITORY`.

### DataSource (`src/datasources/`)

- **MccbMysqlDataSource** — MySQL connection via `loopback-connector-mysql`.
- Config loaded from `mccb-mysql.datasource.config.json` (host, port, user, password, database). This file is `.gitignored` per package and removed from the Docker image.
- Implements `LifeCycleObserver` for graceful shutdown.

### Authentication Flow

1. Client sends `POST /api/users/login` with `{ code: "XXXXXX" }` (6 chars).
2. `MyUserService.verifyCredentials()` looks up the user by `secret_key`.
3. JWT is generated by the local `JwtService` with payload `{ id, name, email, IDuser }`.
4. Response: `{ id: <token>, userId: <IDuser> }`.
5. Protected endpoints expect `Authorization: Bearer <token>`. The decoded profile carries `IDuser`, which is read by every controller via `getCurrentUserId()`.

> The `TOKEN_SECRET` is regenerated on every backend startup; existing tokens become invalid. There is no refresh-token mechanism.

### Database Migrations

- `src/migrate.ts` — LoopBack CLI script:
  - Default: `ALTER` existing schema to match models.
  - `--rebuild` flag: `DROP` and recreate schema.
  - `pnpm migrate` auto-builds TypeScript first via the `premigrate` hook.
- `migrations/2026-05-02-create-bien.sql` — ad hoc SQL migration that creates the `Bien` table (charset `utf8mb4_unicode_ci`, indexes on `IDuser` and `IDcredit`, no FK constraints).

## Testing

- Mocha + `@loopback/testlab`.
- Test config: `.mocharc.json`. Tests live in `src/__tests__/` and run from `dist/__tests__/` after `pretest` rebuild.
- Acceptance tests under `__tests__/acceptance/` (see `ping.controller.acceptance.ts`, `test-helper.ts`).

## Dependencies

### Runtime

- `@loopback/boot`, `@loopback/core`, `@loopback/repository`, `@loopback/rest`, `@loopback/service-proxy` — framework v8/v15
- `@loopback/authentication` ^12, `@loopback/authentication-jwt` ^0.16 — JWT auth
- `@loopback/rest-explorer` ^8 — Swagger / OpenAPI Explorer at `/explorer`
- `loopback-connector-mysql` ^8 — MySQL connector
- `express`, `cors`, `compression` — HTTP server stack
- `tslib` — TypeScript helpers
- `bcryptjs`, `jsonwebtoken`, `lodash` (transitive via auth packages and used in `user.controller.ts` / `jwt.service.ts`)

### Dev

- TypeScript ~5.2, ESLint ^8.57
- `@loopback/build`, `@loopback/testlab`, `@loopback/eslint-config`
- Mocha for testing, `source-map-support` for stack traces

## Docker

- **Base**: `node:22-slim`.
- **Build**: copies source, installs deps with pnpm, runs `lb-tsc`.
- **Hardening**: removes `dist/datasources/*config.json` and `src/*` from the final image.
- **Runtime**: `HOST=0.0.0.0 PORT=3000`, command `node .`.
- **Registry**: `dockregistry.xju.fr/mccbng/api:{staging,latest}`.
- See `package.json` scripts `docker:staging:*`, `docker:latest:*`, `docker:run`, `docker:inspect`, `docker:stop`.

## File Structure

```
back/
├── src/
│   ├── index.ts                        # Entry point
│   ├── server.ts                       # ExpressServer wrapper (mounts /api)
│   ├── application.ts                  # LoopBack application config + JwtService binding
│   ├── sequence.ts                     # MiddlewareSequence (default)
│   ├── migrate.ts                      # Schema migration CLI
│   ├── openapi-spec.ts                 # OpenAPI emitter
│   ├── controllers/
│   │   ├── user.controller.ts          # login / whoAmI / updateMe / exists / signup
│   │   ├── ping.controller.ts          # health check
│   │   ├── banque.controller.ts        # bank CRUD
│   │   ├── compte.controller.ts        # account CRUD (user-scoped)
│   │   ├── compte-banque.controller.ts # account → bank relation
│   │   ├── operation.controller.ts     # transaction CRUD + analytics
│   │   ├── operation-recurrente.controller.ts # recurring ops + auto-generation
│   │   ├── categories.controller.ts    # category CRUD
│   │   ├── credit.controller.ts        # loan CRUD + remaining-balance + payments
│   │   ├── bien.controller.ts          # real-estate asset CRUD
│   │   └── stats.controller.ts         # balance evolution
│   ├── models/                         # one file per entity (User, Banque, Compte, Operation, OperationRecurrente, Categorie, Credit, Bien, Stats, UserCredentials)
│   ├── repositories/                   # DefaultCrudRepository per model + custom evolutionSolde in stats.repository.ts
│   ├── services/
│   │   ├── user.service.ts             # MyUserService
│   │   ├── jwt.service.ts              # Custom token service (preserves IDuser)
│   │   ├── current-user.ts             # getCurrentUserId helper
│   │   ├── keys.ts                     # DI binding keys
│   │   └── interfaces/
│   │       └── user.service.ts
│   └── datasources/
│       ├── mccb-mysql.datasource.ts
│       └── mccb-mysql.datasource.config.json (gitignored)
├── migrations/
│   └── 2026-05-02-create-bien.sql
├── __tests__/                          # acceptance tests (built into dist/__tests__)
├── public/                             # static root
├── Dockerfile
├── package.json
└── tsconfig.json
```

## Conventions When Editing

- New endpoint: decorate with `@authenticate('jwt')`, inject `@inject(SecurityBindings.USER) currentUserProfile: UserProfile`, call `getCurrentUserId(currentUserProfile)`, then either `scope()` or `assertOwned()` before any DB read/write.
- Cascading writes (e.g. creating a Credit creates an OperationRecurrente; deleting it removes that record and nulls back-references on `Operation`) should stay in the controller — there is no service layer for cross-entity orchestration.
- Avoid adding `IDuser` columns to entities that are already scoped via a parent (`Operation`, `OperationRecurrente`); follow the `userCompteIds` pattern instead.
- When introducing custom analytics, prefer parameterized `repository.execute(sql, params)` to keep the SQL injection surface small.
