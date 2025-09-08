# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a monorepo for mccbng (mCloud Compte and Budget Next Generation), a personal finance and budgeting application with:

- `back/`: LoopBack 4 API server with JWT authentication, MySQL connector
- `front/`: Vue 3 frontend with TypeScript, Vite, and PWA capabilities  
- `vue-touch-events/`: Custom Vue touch events package

## Development Commands

### Backend (LoopBack 4 API)
```bash
cd back
yarn build              # Compile TypeScript
yarn build:watch        # Watch mode compilation
yarn start              # Run production server
yarn lint               # Run ESLint and Prettier checks
yarn lint:fix           # Fix linting issues
yarn test               # Run tests with Mocha
yarn clean              # Clean build artifacts
yarn migrate            # Run database migrations
```

### Frontend (Vue 3)
```bash
cd front  
yarn dev                # Development server with Vite
yarn build              # Production build
yarn build:staging     # Staging build
yarn test               # Run Jest tests
yarn test:unit          # Unit tests only
yarn test:coverage      # Tests with coverage
yarn type-check         # TypeScript type checking
yarn lint               # ESLint with auto-fix
yarn lint:check         # ESLint check only
```

### Root Level
```bash
yarn install           # Install all workspace dependencies
```

## Architecture Overview

### Backend Architecture
- **Framework**: LoopBack 4 with REST API
- **Authentication**: JWT with custom user service
- **Database**: MySQL via loopback-connector-mysql
- **Main Models**: User, Banque (Bank), Compte (Account), Operation, Categorie (Category), Stats
- **Key Controllers**: Authentication, CRUD operations for financial entities, statistics
- **Database Config**: `back/src/datasources/mccb-mysql.datasource.config.json`

### Frontend Architecture  
- **Framework**: Vue 3 with Composition API
- **Build Tool**: Vite with TypeScript
- **State Management**: Vuex 4
- **Routing**: Vue Router 4
- **HTTP Client**: Axios
- **UI**: FontAwesome icons, Highcharts for visualizations
- **PWA**: Service worker with workbox
- **Touch Events**: Custom vue-touch-events integration

### Key Features
- Multi-bank account management
- Transaction categorization and tracking
- Recurring operations support
- Statistics and reporting with charts
- Mobile-responsive PWA
- User authentication and authorization

## Configuration

### Environment Files
- Frontend: `.env`, `.env.test`, `.env.production` with `VITE_API_URL`
- Backend database config: `back/src/datasources/mccb-mysql.datasource.config.json`

### Development Setup
- Node.js >=20 (see `.nvmrc`)
- Package manager: Yarn 1.22.19
- Backend runs on port 3001 by default
- Frontend dev server uses Vite defaults

## Docker Support
Both frontend and backend have Docker configurations for staging and production deployments to `dockregistry.xju.fr/mccbng/`.