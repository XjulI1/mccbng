# CLAUDE.md — Backend (LoopBack 4 API)

## Overview

REST API server for the mccbng personal finance application, built with LoopBack 4. Provides JWT-authenticated endpoints for managing bank accounts, transactions, categories, and statistics.

## Commands

```bash
yarn build              # Compile TypeScript with lb-tsc
yarn build:watch        # Watch mode compilation
yarn start              # Run production server (node -r source-map-support/register .)
yarn lint               # Run ESLint and Prettier checks
yarn lint:fix           # Fix linting issues
yarn test               # Run tests with Mocha (@loopback/testlab)
yarn clean              # Clean build artifacts (lb-clean dist *.tsbuildinfo .eslintcache)
yarn migrate            # Run database migrations (auto-builds via premigrate hook)
```

## Architecture

### Application Bootstrap

```
src/index.ts                → Entry point, creates ExpressServer
src/server.ts               → ExpressServer wrapping LoopBack app, mounts API at /api
src/application.ts          → ApiLoopbackApplication (BootMixin + ServiceMixin + RepositoryMixin + RestApplication)
src/sequence.ts             → MySequence (extends MiddlewareSequence, no custom middleware)
```

**Key setup in `application.ts`:**
- Mounts `AuthenticationComponent` and `JWTAuthenticationComponent`
- Binds `MyUserService` for custom authentication logic
- Configures JWT token secret via `generateUniqueId()` (new secret on each restart)
- Enables REST Explorer at `/explorer`
- Boot options: auto-discovers controllers in `./controllers`

### Layered Architecture

```
Controllers  →  Repositories  →  DataSource (MySQL)
     ↑               ↑
  Services       Models (Entities)
```

### Models (`src/models/`)

| Model | Primary Key | Key Properties | Relationships |
|-------|------------|----------------|---------------|
| **User** | `id` (UUID) | `IDuser`, `email`, `username`, `secret_key`, `favoris`, `warningTotal`, `warningCompte` | hasOne UserCredentials |
| **UserCredentials** | `id` (UUID) | `password`, `userId` | belongsTo User |
| **Banque** | `IDbanque` (auto-inc) | `NomBanque` | hasMany Compte |
| **Compte** | `IDcompte` (auto-inc) | `NomCompte`, `solde` (FLOAT), `IDuser`, `IDbanque`, `bloque`, `joint`, `children`, `retraite`, `porte_feuille`, `visible` | belongsTo Banque |
| **Operation** | `IDop` (auto-inc) | `NomOp`, `MontantOp` (FLOAT), `DateOp`, `CheckOp`, `IDcompte`, `IDcat`, `amortissement` | — |
| **OperationRecurrente** | `IDopRecu` (auto-inc) | `NomOpRecu`, `MontantOpRecu` (FLOAT), `JourOpRecu`, `JourNumOpRecu`, `MoisOpRecu`, `Frequence` (3=monthly, 7=yearly), `DernierDateOpRecu`, `IDcompte`, `IDcat` | — |
| **Categorie** | `IDcat` (auto-inc) | `Nom`, `IDuser`, `Stats` (boolean) | — |
| **Stats** | `userID` | — | — |

### Controllers (`src/controllers/`)

All controllers except `PingController` and `UserController.login` require `@authenticate('jwt')`.

| Controller | Key Endpoints | Description |
|-----------|--------------|-------------|
| **UserController** | `POST /users/login`, `GET /users/whoAmI`, `GET /users/exists`, `POST /signup` | Authentication and user management. Login uses 6-char `code` (secret_key) |
| **PingController** | `GET /ping` | Health check |
| **BanqueController** | CRUD `/banques` | Bank management |
| **CompteController** | CRUD `/comptes` | Account management |
| **CompteBanqueController** | `GET /comptes/{id}/banque` | Get bank for an account |
| **OperationController** | CRUD `/operations` + analytics endpoints | Transaction management |
| **OperationRecurrenteController** | CRUD `/operation-recurrentes`, `POST /operation-recurrentes/auto-generation/{userID}` | Recurring operations with auto-generation |
| **CategoriesController** | CRUD `/categories` | Category management |
| **StatsController** | `GET /stats/evolutionSolde/{userID}` | Balance evolution (global, retraite, dispo) |

**Notable OperationController endpoints:**
- `GET /operations/sumAllCompteForUser?userID=` — Sum checked/unchecked totals by account
- `GET /operations/sumForACompte?id=` — Sum for a specific account
- `GET /operations/sumByUserByMonth?userID=&monthNumber=&yearNumber=&IDCompte=` — Monthly sums by category
- `GET /operations/sumCategoriesByUserByMonth?userID=&monthNumber=&yearNumber=` — Category totals for a month
- `GET /operations/suggestCategories?operationName=&limit=` — Smart category suggestions based on name pattern matching

### Repositories (`src/repositories/`)

Standard `DefaultCrudRepository` implementations for each model. Notable custom logic:

- **UserRepository**: `findCredentials(userId)` method, hasOne relationship with UserCredentials
- **CompteRepository**: belongsTo accessor for Banque with inclusion resolver
- **StatsRepository**: `evolutionSolde(userID)` — Executes raw SQL to compute balance evolution across account types (global, retraite, dispo) grouped by date

### Services (`src/services/`)

- **MyUserService** (`user.service.ts`): Custom authentication service
  - `verifyCredentials(credentials)` — Validates `code` field (6-char secret_key lookup)
  - `convertToUserProfile(user)` — Builds UserProfile with securityId
  - `findUserById(id)` — Finds user by UUID
- **Binding keys** (`keys.ts`): `USER_SERVICE`, `USER_REPOSITORY`, `USER_CREDENTIALS_REPOSITORY`

### DataSource (`src/datasources/`)

- **MccbMysqlDataSource**: MySQL connection via `loopback-connector-mysql`
- Config file: `mccb-mysql.datasource.config.json` (host, port, user, password, database)
- Implements `LifeCycleObserver` for graceful shutdown

### Authentication Flow

1. Client sends `POST /api/users/login` with `{ code: "XXXXXX" }` (6 chars)
2. `MyUserService.verifyCredentials()` looks up user by `secret_key`
3. JWT token generated using `TokenService` with app-specific secret
4. Token returned as `{ id: token, userId: IDuser }`
5. Protected endpoints require `Authorization: Bearer <token>` header

### Database Migrations

`src/migrate.ts` — CLI script for schema management:
- Default: `ALTER` existing schema to match models
- `--rebuild` flag: `DROP` and recreate schema
- Auto-builds TypeScript before running (via `premigrate` npm hook)

## Dependencies

### Runtime
- `@loopback/boot`, `@loopback/core`, `@loopback/repository`, `@loopback/rest` — LoopBack 4 framework
- `@loopback/authentication`, `@loopback/authentication-jwt` — JWT auth
- `@loopback/rest-explorer` — OpenAPI Explorer
- `loopback-connector-mysql` — MySQL connector
- `express`, `cors`, `compression` — HTTP server
- `bcryptjs` — Password hashing (available but currently not used for login)
- `tslib` — TypeScript runtime helpers

### Dev
- TypeScript ~5.2, ESLint ^8.57
- `@loopback/build`, `@loopback/testlab` — Build and test tooling
- Mocha for testing

## Docker

- **Base**: `node:22-slim`
- **Build**: Copies source, installs deps, compiles TypeScript
- **Security**: Removes `dist/datasources/*config.json` and `src/*` from image
- **Runtime**: `HOST=0.0.0.0 PORT=3000`, command `node .`
- **Registry**: `dockregistry.xju.fr/mccbng/api:{staging,latest}`

## File Structure

```
back/
├── src/
│   ├── index.ts                    # Entry point
│   ├── server.ts                   # ExpressServer wrapper
│   ├── application.ts              # LoopBack application config
│   ├── sequence.ts                 # Request sequence (MiddlewareSequence)
│   ├── migrate.ts                  # Database migration script
│   ├── controllers/
│   │   ├── user.controller.ts      # Auth + user management
│   │   ├── ping.controller.ts      # Health check
│   │   ├── banque.controller.ts    # Bank CRUD
│   │   ├── compte.controller.ts    # Account CRUD
│   │   ├── compte-banque.controller.ts  # Account-Bank relation
│   │   ├── operation.controller.ts      # Transaction CRUD + analytics
│   │   ├── operation-recurrente.controller.ts  # Recurring ops + auto-gen
│   │   ├── categories.controller.ts     # Category CRUD
│   │   └── stats.controller.ts          # Balance evolution
│   ├── models/
│   │   ├── user.model.ts
│   │   ├── user-credentials.model.ts
│   │   ├── banque.model.ts
│   │   ├── compte.model.ts
│   │   ├── operation.model.ts
│   │   ├── operation-recurrente.model.ts
│   │   ├── categorie.model.ts
│   │   └── stats.model.ts
│   ├── repositories/               # DefaultCrudRepository per model
│   ├── services/
│   │   ├── user.service.ts         # MyUserService (auth logic)
│   │   ├── keys.ts                 # DI binding keys
│   │   └── interfaces/
│   │       └── user.service.ts     # UserService interface
│   └── datasources/
│       ├── mccb-mysql.datasource.ts
│       └── mccb-mysql.datasource.config.json
├── Dockerfile
├── package.json
└── tsconfig.json
```
