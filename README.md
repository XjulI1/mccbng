# mccbng

**mccbng** (mCloud Compte and Budget Next Generation) est une application web de gestion de finances personnelles : suivi multi-banques et multi-comptes, opérations bancaires, opérations récurrentes, budget par catégorie, statistiques, suivi de crédits et de biens immobiliers.

L'application est organisée en monorepo `pnpm` avec deux packages :

- **`back/`** — API REST [LoopBack 4](https://loopback.io/) (Node.js / TypeScript) sur MySQL, authentification JWT.
- **`front/`** — SPA Vue 3 (TypeScript / Vite / Vuex / PWA), avec mode sombre et gestes tactiles.

---

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Architecture technique](#architecture-technique)
- [Modèle de données](#modèle-de-données)
- [Démarrage rapide](#démarrage-rapide)
- [Configuration](#configuration)
- [Déploiement Docker](#déploiement-docker)

---

## Fonctionnalités

### Authentification et compte utilisateur
- Connexion par **code secret à 6 caractères** (`POST /api/users/login`) — pas de mot de passe à saisir.
- Token JWT stocké en cookies (`userToken`, `userID`) côté front, valide jusqu'au redémarrage du back (le secret est régénéré à chaque démarrage).
- Inscription via `POST /api/signup` (réservée à un usage admin / amorçage).
- Édition du profil (`PATCH /api/users/me`) : email, username, seuils d'alerte (`warningTotal`, `warningCompte`), favori (`favoris`).
- Vue **Mon compte** (`/editUser`) pour la mise à jour du profil.

### Comptes et banques
- Gestion de plusieurs **banques** et plusieurs **comptes** par banque.
- Chaque compte porte des indicateurs typés : `bloque`, `joint`, `children`, `retraite`, `porte_feuille`, `visible`.
- Liste latérale des comptes regroupée par type (disponibles, joints, enfants, retraite, portefeuille, bloqués).
- Calcul automatique des **soldes pointés / non pointés** par compte et des **totaux globaux** par catégorie de comptes.
- Masquage des montants à la volée (`maskAmount` dans le module `user`).

### Opérations bancaires
- CRUD complet des opérations (débit/crédit), avec date, libellé, montant, catégorie, indicateur "pointée" (`CheckOp`) et indicateur d'amortissement.
- Liste paginée par scroll infini (35 opérations par page) côté front.
- **Swipe-to-delete** et clic pour éditer sur mobile.
- **Virement** entre comptes (`/transfert`) : crée automatiquement la paire débit + crédit.
- **Recherche** d'opérations par libellé sur tous les comptes (`/search`).
- **Suggestion intelligente de catégorie** lors de la saisie : `GET /api/operations/suggestCategories` propose les catégories les plus fréquentes pour un libellé similaire.

### Opérations récurrentes
- Modèle de transaction récurrente avec fréquence (3 = mensuelle, 7 = annuelle), jour, mois, et date de dernière génération.
- Génération automatique au login : `POST /api/operation-recurrentes/auto-generation` parcourt toutes les récurrentes de l'utilisateur et insère les opérations manquantes selon le délai écoulé.
- Vue dédiée `/recurrOperation` pour la gestion (création, édition, suppression).

### Catégorisation et budget
- **Catégories** définies par utilisateur, avec un drapeau `Stats` indiquant si elles entrent dans les statistiques de dépense.
- Vue **Statistiques** (`/stats`) :
  - Somme mensuelle des dépenses (`GET /api/operations/sumByUserByMonth`).
  - Répartition par catégorie en **camembert Highcharts** (`GET /api/operations/sumCategoriesByUserByMonth`).
  - **Évolution temporelle** des soldes (global, retraite, disponible) en time series (`GET /api/stats/evolutionSolde`).
  - Sélecteurs mois / année.

### Crédits (emprunts)
- Modèle **Credit** : nom, prêteur, montant initial, mensualité, taux d'intérêt, date début / fin, compte associé, statut (`actif` par défaut), catégorie.
- À la création d'un crédit, une **opération récurrente mensuelle est générée automatiquement** (`Frequence = 3`) et liée via `IDopRecu`.
- À la suppression, l'opération récurrente associée est supprimée et les opérations passées dissociées (`IDcredit` mis à `null`).
- Endpoints spécifiques :
  - `GET /api/credits/{id}/remaining-balance` — calcul du capital restant dû et déjà payé via SQL brut.
  - `GET /api/credits/{id}/payments` — historique des prélèvements liés.
- Vue `/credits` : `CreditList` + `CreditCard` (avec barre de progression) + `CreditForm`.

### Biens immobiliers
- Modèle **Bien** : nom, ville, type, surface, usage (`principale` par défaut), date d'achat, prix nu, frais de notaire, frais d'agence, apport cash, valeur actuelle estimée, lien optionnel vers un crédit (`IDcredit`).
- CRUD scopé utilisateur ; vérification que le crédit lié appartient bien à l'utilisateur.
- Vue `/biens` : `BienList` + `BienCard` (résumé investissement / valorisation) + `BienForm`.

### Amortissement
- Vue `/amortissement` qui filtre les opérations marquées `amortissement = 1` (typiquement le capital remboursé sur les crédits) avec un rendu spécifique.

### Configuration et UX
- **Thèmes** : clair / sombre / système (composable `useTheme`), persistance `localStorage`, suivi du `prefers-color-scheme`, attribut `data-theme` sur `<html>`.
- **PWA** : manifeste « MCCB NG », mode `standalone`, service worker `autoUpdate` via `vite-plugin-pwa`.
- **Mobile** : panneau gauche escamotable au swipe, layout responsive (breakpoint 768 px).
- **Outils de debug** : intégration optionnelle d'Eruda (panneau dev mobile) chargé à la demande via `useDebugTools` et togglée dans `/config`.
- Vue `/config` : recharger l'application, éditer le compte, basculer le thème, activer les outils de debug, se déconnecter.

---

## Architecture technique

### Stack

| Couche       | Technologies |
|--------------|--------------|
| Frontend     | Vue 3.5, Vue Router 4, Vuex 4, TypeScript 5, Vite 6+, SCSS, Highcharts 12, FontAwesome, `vue3-touch-events`, `vite-plugin-pwa`, `universal-cookie` |
| Backend      | LoopBack 4 (Node.js ≥ 20, TypeScript 5), `@loopback/authentication-jwt`, Express, MySQL via `loopback-connector-mysql`, `bcryptjs`, `jsonwebtoken` |
| Base données | MySQL (charset `utf8mb4_unicode_ci`) |
| Build / déploiement | Docker (multi-stage), nginx (front), `pnpm` workspace |

### Vue d'ensemble

```
                     ┌─────────────────────┐
                     │   Browser / PWA     │
                     │  (vue3 + vuex)      │
                     └──────────┬──────────┘
                                │ Axios, Bearer JWT
                                ▼
   ┌──────────────────────────────────────────────────┐
   │   Vite dev server (port 8080) — proxy /api       │
   └──────────────────────────────┬───────────────────┘
                                  ▼
   ┌──────────────────────────────────────────────────┐
   │   LoopBack 4 API (Express, port 3000, mount /api)│
   │   - AuthenticationComponent + JWTAuthn           │
   │   - REST Explorer  /explorer                     │
   │   - Custom JwtService (préserve IDuser)          │
   │   - Controllers : auto-discovery dans dist/      │
   └──────────────────────────────┬───────────────────┘
                                  ▼
                        ┌──────────────────┐
                        │     MySQL        │
                        └──────────────────┘
```

### Architecture backend (`back/`)

Architecture en couches typique LoopBack 4 :

```
Controllers  →  Repositories  →  DataSource (MySQL)
     ↑               ↑
  Services        Models (Entities)
```

- **`src/index.ts`** crée un `ExpressServer` (`src/server.ts`) qui monte l'application LB4 sur `/api`.
- **`src/application.ts`** (`ApiLoopbackApplication`) :
  - Étend `BootMixin(ServiceMixin(RepositoryMixin(RestApplication)))`.
  - Monte `AuthenticationComponent`, `JWTAuthenticationComponent`, `RestExplorerComponent`.
  - Surcharge le `TokenService` par défaut par `JwtService` pour propager `IDuser` à travers le token.
  - `TOKEN_SECRET = generateUniqueId()` — nouveau secret à chaque démarrage (les tokens sont invalides après redémarrage).
  - Boot auto-discovery des contrôleurs (`./controllers/**/*.controller.js`).
- **`src/sequence.ts`** : `MySequence extends MiddlewareSequence` (séquence par défaut).
- **`src/services/`** :
  - `MyUserService.verifyCredentials({code})` : recherche l'utilisateur par `secret_key` (6 caractères). Le code de `bcryptjs` est en place mais commenté — la connexion par mot de passe n'est pas active.
  - `JwtService` : signe et vérifie le JWT en y conservant `id`, `name`, `email`, `IDuser`.
  - `getCurrentUserId(profile)` : utilitaire qui extrait l'`IDuser` numérique du `UserProfile` ; jette `Unauthorized` sinon.
- **Sécurité par scope** :
  - **Direct** : `Bien`, `Credit`, `Compte`, `Categorie` portent un champ `IDuser`. Les contrôleurs ajoutent un `where { IDuser }` à toute requête (`scope()` / `assertOwned()`).
  - **Hérité** : `Operation`, `OperationRecurrente` n'ont pas d'`IDuser`. Les contrôleurs résolvent d'abord la liste des `IDcompte` de l'utilisateur, puis filtrent (`{ IDcompte: { inq: ids } }`).
- **Migrations** : `src/migrate.ts` (LB4) ; un script SQL ad hoc `migrations/2026-05-02-create-bien.sql` crée la table `Bien`.

### Architecture frontend (`front/`)

```
src/main.ts          → createApp + register store, router, vue3-touch-events, FontAwesome
src/App.vue          → layout : AccountHeader (top) + CompteList (gauche) + RouterView + NavBar (bas)
src/router.ts        → Vue Router en lazy loading, child routes en overlay via RouteOverTheContent
src/store/index.ts   → Vuex avec 8 modules (sans namespacing)
src/services/*.ts    → couche API (axios) — un fichier par domaine
src/composables/     → useTheme, useDebugTools (singletons via useGlobal*)
src/components/      → cartes / formulaires / listes par domaine
src/views/           → vues routées
src/styles/          → variables.scss + theme.css (custom properties) + main.css
```

**Modules Vuex** (8) : `user`, `compte`, `operation`, `category`, `stats`, `display`, `credit`, `bien`.

**Pattern d'overlay** : les routes enfant (`/newOperation`, `/editCredit/:id`, `/newBien`, etc.) instancient toutes le même composant `RouteOverTheContent` qui rend dynamiquement le formulaire (`operation-form`, `credit-form`, `bien-form`, `transfert-form`, `operation-recurrente-form`, `search`) via la prop `componentName`. Cela évite de gérer un état modal ailleurs.

**Vite / PWA** :
- Proxy `/api` → `VITE_API_URL` (par défaut `http://localhost:3000`).
- Manual chunks : `vue` (vue + router + vuex) et `vendor` (axios + highcharts).
- Service worker auto-update, manifeste `MCCB NG` / `MCCB`, icônes 192/512.
- Production : image `nginx` avec fallback SPA `try_files $uri /index.html`.

### Flux d'authentification

1. Le front appelle `POST /api/users/login` avec `{ code: "XXXXXX" }`.
2. `MyUserService.verifyCredentials` recherche l'utilisateur par `secret_key`.
3. `JwtService.generateToken` signe un JWT avec `{ id, name, email, IDuser }`.
4. Le front stocke `id` (token) et `userId` (`IDuser`) dans des cookies (`universal-cookie`).
5. Toute requête authentifiée envoie `Authorization: Bearer <token>`.
6. Côté serveur, `JwtService.verifyToken` reconstruit le `UserProfile` ; `getCurrentUserId` est utilisé dans chaque contrôleur pour scoper les requêtes à l'utilisateur.

---

## Modèle de données

| Entité | Clé primaire | Champs principaux | Liens |
|--------|--------------|-------------------|-------|
| **User** | `id` (UUID) | `IDuser`, `email`, `username`, `secret_key`, `favoris`, `warningTotal`, `warningCompte`, `emailVerified`, `verificationToken` | `hasOne UserCredentials` |
| **UserCredentials** | `id` (UUID) | `password`, `userId` | `belongsTo User` |
| **Banque** | `IDbanque` | `NomBanque` | `hasMany Compte` |
| **Compte** | `IDcompte` | `NomCompte`, `solde` (FLOAT), `IDuser`, `IDbanque`, `bloque`, `joint`, `children`, `retraite`, `porte_feuille`, `visible` | `belongsTo Banque` |
| **Operation** | `IDop` | `NomOp`, `MontantOp` (FLOAT), `DateOp`, `CheckOp`, `IDcompte`, `IDcat`, `amortissement`, `IDcredit?` | scopée via `Compte` |
| **OperationRecurrente** | `IDopRecu` | `NomOpRecu`, `MontantOpRecu` (FLOAT), `JourOpRecu`, `JourNumOpRecu`, `MoisOpRecu`, `Frequence` (3=mensuel, 7=annuel), `DernierDateOpRecu`, `IDcompte`, `IDcat`, `IDcredit?` | scopée via `Compte` |
| **Categorie** | `IDcat` | `Nom`, `IDuser`, `Stats` (bool) | — |
| **Credit** | `IDcredit` | `NomCredit`, `NomPreteur?`, `MontantInitial` (FLOAT), `MontantMensuel`, `TauxInteret?`, `DateDebut`, `DateFin`, `IDcompte`, `IDopRecu?`, `IDuser`, `Statut` (def `actif`), `IDcat` | — |
| **Bien** | `IDbien` | `NomBien`, `Ville`, `TypeBien`, `Surface?`, `Usage` (def `principale`), `DateAchat`, `PrixBienNu`, `FraisNotaire`, `FraisAgence`, `ApportCash`, `ValeurActuelle?`, `IDcredit?`, `IDuser` | — |
| **Stats** | `userID` | (entité support pour les agrégations) | — |

> Les montants financiers utilisent le type SQL `FLOAT`, avec arrondi manuel à 2 décimales côté applicatif.

### Endpoints REST principaux

| Méthode | Route | Description |
|--------:|-------|-------------|
| `POST`  | `/api/users/login` | Authentification par `code` (6 car.) — **publique** |
| `GET`   | `/api/users/whoAmI` | Profil de l'utilisateur courant |
| `PATCH` | `/api/users/me` | Mise à jour du profil |
| `GET`   | `/api/users/exists` | Vérifie la validité du token |
| `POST`  | `/api/signup` | Création d'utilisateur |
| `GET`   | `/api/ping` | Healthcheck |
| `*`     | `/api/banques`, `/api/comptes`, `/api/categories` | CRUD scopés utilisateur |
| `*`     | `/api/operations` | CRUD opérations + endpoints d'analytics |
| `GET`   | `/api/operations/sumAllCompteForUser` | Totaux pointés / non pointés par compte |
| `GET`   | `/api/operations/sumForACompte?id=` | Totaux pour un compte |
| `GET`   | `/api/operations/sumByUserByMonth?monthNumber=&yearNumber=&IDCompte=` | Total dépenses du mois (catégories `Stats=1`) |
| `GET`   | `/api/operations/sumCategoriesByUserByMonth?monthNumber=&yearNumber=` | Répartition mensuelle par catégorie |
| `GET`   | `/api/operations/suggestCategories?operationName=&limit=` | Suggestion par similarité de libellé |
| `*`     | `/api/operation-recurrentes` | CRUD opérations récurrentes |
| `POST`  | `/api/operation-recurrentes/auto-generation` | Génère les opérations dues |
| `*`     | `/api/credits` | CRUD crédits (création auto d'une op. récurrente) |
| `GET`   | `/api/credits/{id}/remaining-balance` | Capital restant dû / payé |
| `GET`   | `/api/credits/{id}/payments` | Historique de prélèvement |
| `*`     | `/api/biens` | CRUD biens immobiliers |
| `GET`   | `/api/stats/evolutionSolde` | Time series `global`, `retraite`, `dispo` |

> L'OpenAPI Explorer est exposé sur `http://localhost:3000/explorer` en local.

---

## Démarrage rapide

### Pré-requis
- Node.js ≥ 20 (cf. `.nvmrc`)
- pnpm ≥ 10 (cf. `packageManager` dans `package.json`)
- MySQL (en local ou via Docker)

### Installation

```bash
pnpm install                # installe back + front
```

### Lancer le backend (port 3000)

```bash
cd back
cp src/datasources/mccb-mysql.datasource.config.json.example \
   src/datasources/mccb-mysql.datasource.config.json    # ou créer le fichier (cf. ci-dessous)
pnpm migrate                # crée / met à jour le schéma MySQL
pnpm start                  # build + node .
```

### Lancer le frontend (port 8080)

```bash
cd front
echo "VITE_API_URL=http://localhost:3000" > .env
pnpm dev
```

### Tests / linting

```bash
# back
pnpm --filter @mccbng/back test
pnpm --filter @mccbng/back lint

# front
pnpm --filter @mccbng/front test
pnpm --filter @mccbng/front lint
pnpm --filter @mccbng/front type-check
```

---

## Configuration

### Backend (`back/src/datasources/mccb-mysql.datasource.config.json`)

```json
{
  "name": "db_name_connection_mysql",
  "connector": "mysql",
  "host": "localhost",
  "port": 3306,
  "database": "database_name",
  "user": "database_user_name",
  "password": "database_user_password"
}
```

### Frontend (`.env` / `.env.test` / `.env.production`)

```
VITE_API_URL=http://localhost:3000
```

`VITE_API_URL` sert à la fois pour le proxy Vite en dev et au runtime via `window.env.VITE_API_URL`.

---

## Déploiement Docker

Les deux packages exposent les mêmes scripts pnpm :

```bash
pnpm --filter @mccbng/back  docker:staging:build && pnpm --filter @mccbng/back  docker:staging:push
pnpm --filter @mccbng/back  docker:latest:build  && pnpm --filter @mccbng/back  docker:latest:push
pnpm --filter @mccbng/front docker:staging:build && pnpm --filter @mccbng/front docker:staging:push
pnpm --filter @mccbng/front docker:latest:build  && pnpm --filter @mccbng/front docker:latest:push
```

- **Back** : image `node:22-slim`, build TypeScript, suppression de `dist/datasources/*config.json` et de `src/` pour réduire la surface, lance `node .` (port 3000).
- **Front** : multi-stage `node:22-slim` → `nginx`, sert le dossier `dist/` avec un fallback SPA (`nginx.conf`).
- Registre : `dockregistry.xju.fr/mccbng/{api,front}:{staging,latest}`.

Un `docker-compose.build.yml` et un script `build-and-push.sh` sont disponibles à la racine pour orchestrer les builds.

---

## Licence

MIT — © Xavier Julien
