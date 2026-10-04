# mccbng

**mccbng** (mCloud Compte and Budget Next Generation) est une application web de gestion de finances personnelles : suivi multi-banques et multi-comptes, opérations bancaires, opérations récurrentes, budget par catégorie, statistiques, suivi de crédits et de biens immobiliers.

L'application est un workspace `pnpm` composé d'un seul package, **`front/`** : une SPA Nuxt 4 (Vue 3, TypeScript, Pinia, PWA ; SSR désactivé, mode sombre, gestes tactiles) dont le serveur Nitro héberge aussi l'**API REST** (`front/server/`), sur MySQL, avec authentification JWT. Un seul processus et une seule image Docker servent donc le front et l'API.

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
- **PWA** : manifeste « MCCB NG », mode `standalone`, service worker `autoUpdate` via `@vite-pwa/nuxt`.
- **Mobile** : panneau gauche escamotable au swipe, layout responsive (breakpoint 768 px).
- **Outils de debug** : intégration optionnelle d'Eruda (panneau dev mobile) chargé à la demande via `useDebugTools` et togglée dans `/config`.
- Vue `/config` : recharger l'application, éditer le compte, basculer le thème, activer les outils de debug, se déconnecter.

---

## Architecture technique

### Stack

| Couche       | Technologies |
|--------------|--------------|
| Frontend     | Nuxt 4 (SPA, `ssr: false`, `compatibilityVersion: 5`, auto-imports désactivés), Vue 3.5, Pinia, TypeScript 5, SCSS, Highcharts 12, FontAwesome, `vue3-touch-events`, `@vite-pwa/nuxt`, Vitest |
| API          | Serveur Nitro de Nuxt (Node.js ≥ 26, TypeScript 5), Drizzle ORM + `mysql2`, Zod, `jsonwebtoken`, `bcryptjs`, `nuxt-security` |
| Base données | MySQL / MariaDB (schéma de production : MyISAM et InnoDB, voir `docs/db-migrations.md`) |
| Build / déploiement | Docker (multi-stage), Node/Nitro, `pnpm` workspace |

### Vue d'ensemble

```
                     ┌─────────────────────┐
                     │   Browser / PWA     │
                     │  (nuxt spa + pinia) │
                     └──────────┬──────────┘
                                │ fetch, Bearer JWT
                                ▼
   ┌──────────────────────────────────────────────────┐
   │   Nuxt / Nitro (port 8080)                       │
   │   - SPA + service worker                         │
   │   - API REST /api/**  (front/server/api)         │
   │   - middleware JWT, validation Zod, erreurs JSON │
   │   - nuxt-security : en-têtes, CSP, rate-limit    │
   └──────────────────────────────┬───────────────────┘
                                  ▼
                        ┌──────────────────┐
                        │  MySQL / MariaDB │
                        └──────────────────┘
```

### API serveur (`front/server/`)

```
server/
├── api/                    # une route par fichier (file-based routing Nitro)
│   ├── [resource]/*.ts     #   CRUD générique : banques, categories, biens
│   ├── comptes|operations|operation-recurrentes|credits/*.ts   # CRUD + routes spécifiques
│   ├── users/*.ts, signup.post.ts, ping.get.ts
│   ├── stats/*.ts          #   statistiques
│   └── [...path].ts        #   404 JSON pour toute route /api inconnue
├── middleware/auth.ts      # vérifie le JWT sur /api/** (sauf ping et login)
├── plugins/                # contrôle de la configuration au démarrage, fermeture du pool MySQL
├── db/                     # schema.ts (Drizzle), client.ts (pool mysql2), migrations/*.sql
└── utils/                  # auth, config, crud, filter, resources, scope, sql, stats, errors…
```

- **Configuration** (`utils/config.ts`) : lue dans `process.env` à l'exécution (voir [Configuration](#configuration)) ; le serveur refuse de démarrer en production si une variable obligatoire manque.
- **CRUD générique** (`utils/crud.ts`, `utils/resources.ts`) : chaque ressource est décrite une fois (table, scope, schémas Zod, défauts, hooks de cascade) et expose les 8 routes standard (`POST /`, `GET /count`, `GET /`, `PATCH /`, `GET|PATCH|PUT|DELETE /{id}`).
- **Filtre de liste** (`utils/filter.ts`) : le paramètre `filter` (`where`, `order`, `limit`, `skip`, `include`) est interprété avec une liste blanche de colonnes et d'opérateurs (jamais interpolé dans le SQL).
- **Sécurité par scope** (`utils/scope.ts`) :
  - **Direct** : `Bien`, `Credit`, `Compte`, `Categorie` portent un champ `IDuser` ; toute requête est combinée à `IDuser = <utilisateur du JWT>`. Les catégories partagées (`IDuser = 0`) sont lisibles par tous mais non modifiables.
  - **Hérité** : `Operation` et `OperationRecurrente` n'ont pas d'`IDuser` ; on filtre sur `IDcompte ∈ comptes de l'utilisateur`. Une ressource d'autrui répond **404**.
- **Authentification** : l'utilisateur courant est toujours retrouvé par `IDuser` (clé primaire), jamais par la colonne `id`, non unique en production.
- **Erreurs** : format uniforme `{ "error": { "statusCode", "name", "message" } }` (`defineApiHandler`) ; une erreur inattendue renvoie un 500 générique, détaillée seulement dans les logs.
- **SQL analytique** (`utils/sql.ts`, `utils/stats.ts`) : requêtes brutes paramétrées pour les agrégats et les statistiques.
- **Migrations** : fichiers SQL versionnés (`server/db/migrations`), appliqués par `front/scripts/db-migrate.mjs` (voir `docs/db-migrations.md`).

### Architecture frontend (`front/`)

```
nuxt.config.ts          → ssr:false, compatibilityVersion 5, auto-imports off, PWA, SCSS global
server/                → API REST hébergée par Nitro (voir plus haut)
app/app.vue            → layout : AccountHeader (top) + CompteList (gauche) + NuxtPage + NavBar (bas)
app/pages/             → routes file-based ; les overlays sont des pages enfants (RouteOverTheContent)
app/middleware/        → auth.global.ts : redirection /login, réhydratation de la session
app/stores/            → Pinia, 9 stores (setup stores)
app/services/*.ts      → couche API (fetch) — un fichier par domaine
app/composables/       → useTheme, useDebugTools (singletons via useGlobal*)
app/components/        → cartes / formulaires / listes par domaine
app/plugins/           → FontAwesome (global), vue3-touch-events (client)
app/assets/styles/     → variables.scss + theme.css (custom properties) + main.css
```

**Stores Pinia** (9) : `user`, `compte`, `operation`, `category`, `stats`, `display`, `credit`, `bien`, `banque`.

**Pattern d'overlay** : les routes enfant (`/newOperation`, `/editCredit/:id`, `/newBien`, etc.) instancient toutes le même composant `RouteOverTheContent` qui rend dynamiquement le formulaire (`operation-form`, `credit-form`, `bien-form`, `transfert-form`, `operation-recurrente-form`, `search`, `compte-form`) selon le `componentName` déclaré dans la meta de la page (`definePageMeta`). Cela évite de gérer un état modal ailleurs.

**Nuxt / PWA** :
- Le front appelle l'API en chemin relatif (`/api/**`), servie par le même serveur Nitro.
- Aucun auto-import : tous les `ref`, `useRoute`, `defineStore`, composants… sont importés explicitement.
- Service worker auto-update (`service-worker.js`), manifeste `MCCB NG` / `MCCB`, icônes 192/512 ; le shell SPA est prérendu pour le fallback de navigation.
- Production : image Node qui exécute la sortie Nitro (`.output/server/index.mjs`), port 8080.

### Flux d'authentification

1. Le front appelle `POST /api/users/login` avec `{ email, code }` (code de 6 caractères).
2. Le serveur retrouve l'utilisateur par email et compare le code à `secret_key` (bcrypt ; une `secret_key` encore en clair est acceptée puis re-hashée à la première connexion réussie). Une comparaison factice est faite si l'email est inconnu pour égaliser les temps de réponse.
3. Un JWT est signé avec `{ id, name, email, IDuser }` (`JWT_SECRET`, durée `JWT_TTL_SECONDS`, 1 h par défaut) ; la réponse contient `{ id: <token>, userId: <IDuser> }` et un cookie `mccbngAuth` (`HttpOnly`, `SameSite=Strict`, `Secure` en production).
4. Le front stocke le token et `IDuser` dans les cookies `userToken` / `userID`.
5. Toute requête authentifiée envoie `Authorization: Bearer <token>` ; le middleware `server/middleware/auth.ts` vérifie le JWT, et `getCurrentUserId` scope chaque requête à l'utilisateur.
6. Le login est limité à 5 essais par IP et par fenêtre de 15 minutes (`nuxt-security`). Les en-têtes de sécurité et la CSP sont appliqués à toutes les réponses.

---

## Modèle de données

| Entité | Clé primaire | Champs principaux | Liens |
|--------|--------------|-------------------|-------|
| **User** | `IDuser` (non auto-incrémenté) | `id` (identifiant applicatif, **non unique**), `email` (unique), `username`, `secret_key` (bcrypt), `favoris`, `warningTotal`, `warningCompte`, `emailVerified`, `verificationToken` | `UserCredentials` |
| **UserCredentials** | `id` (UUID) | `password`, `userId` | `belongsTo User` |
| **Banque** | `IDbanque` | `NomBanque` | `hasMany Compte` |
| **Compte** | `IDcompte` | `NomCompte`, `solde` (FLOAT), `IDuser`, `IDbanque`, `bloque`, `joint`, `children`, `retraite`, `porte_feuille`, `visible` | `belongsTo Banque` |
| **Operation** | `IDop` | `NomOp`, `MontantOp` (FLOAT), `DateOp`, `CheckOp`, `IDcompte`, `IDcat`, `amortissement`, `IDcredit?` | scopée via `Compte` |
| **OperationRecurrente** | `IDopRecu` | `NomOpRecu`, `MontantOpRecu` (FLOAT), `JourOpRecu`, `JourNumOpRecu`, `MoisOpRecu`, `Frequence` (3=mensuel, 7=annuel), `DernierDateOpRecu`, `IDcompte`, `IDcat`, `IDcredit?` | scopée via `Compte` |
| **Categorie** | `IDcat` | `Nom`, `IDuser` (0 = catégorie partagée), `Type` (`depense` / `revenu` / `transfert`) | — |
| **Credit** | `IDcredit` | `NomCredit`, `NomPreteur?`, `MontantInitial` (FLOAT), `MontantMensuel`, `TauxInteret?`, `DateDebut`, `DateFin`, `IDcompte`, `IDopRecu?`, `IDuser`, `Statut` (def `actif`), `IDcat` | — |
| **Bien** | `IDbien` | `NomBien`, `Ville`, `TypeBien`, `Surface?`, `Usage` (def `principale`), `DateAchat`, `PrixBienNu`, `FraisNotaire`, `FraisAgence`, `ApportCash`, `ValeurActuelle?`, `IDcredit?`, `IDuser` | — |
| **Stats** | `userID` | (entité support pour les agrégations) | — |

> Les montants financiers utilisent le type SQL `FLOAT`, avec arrondi manuel à 2 décimales côté applicatif.

### Endpoints REST principaux

| Méthode | Route | Description |
|--------:|-------|-------------|
| `POST`  | `/api/users/login` | Authentification par `email` + `code` (6 car.) — **publique** |
| `POST`  | `/api/users/logout` | Efface le cookie d'authentification |
| `GET`   | `/api/users/whoAmI` | Profil de l'utilisateur courant |
| `PATCH` | `/api/users/me` | Mise à jour du profil |
| `GET`   | `/api/users/exists` | Vérifie la validité du token |
| `POST`  | `/api/signup` | Création d'utilisateur (réservée aux utilisateurs authentifiés) |
| `GET`   | `/api/ping` | Healthcheck |
| `*`     | `/api/banques`, `/api/comptes`, `/api/categories` | CRUD scopés utilisateur |
| `*`     | `/api/operations` | CRUD opérations + endpoints d'analytics |
| `GET`   | `/api/operations/sumAllCompteForUser` | Totaux pointés / non pointés par compte |
| `GET`   | `/api/operations/sumForACompte?id=` | Totaux pour un compte |
| `GET`   | `/api/operations/sumByUserByMonth?monthNumber=&yearNumber=&IDCompte=` | Total dépenses du mois (catégories `Type = depense`) |
| `GET`   | `/api/operations/sumCategoriesByUserByMonth?monthNumber=&yearNumber=` | Répartition mensuelle par catégorie |
| `GET`   | `/api/operations/suggestCategories?operationName=&limit=` | Suggestion par similarité de libellé |
| `*`     | `/api/operation-recurrentes` | CRUD opérations récurrentes |
| `POST`  | `/api/operation-recurrentes/auto-generation` | Génère les opérations dues |
| `*`     | `/api/credits` | CRUD crédits (création auto d'une op. récurrente) |
| `GET`   | `/api/credits/{id}/remaining-balance` | Capital restant dû / payé |
| `GET`   | `/api/credits/{id}/payments` | Historique de prélèvement |
| `*`     | `/api/biens` | CRUD biens immobiliers |
| `GET`   | `/api/stats/evolutionSolde` | Time series `global`, `retraite`, `dispo` |
| `GET`   | `/api/stats/yearComparison`, `topCategories`, `incomeVsExpense`, `topOperations`, `categoryHeatmap` | Statistiques annuelles et par catégorie |

> Toutes les routes (sauf `ping` et `login`) exigent un JWT. Les listes acceptent un paramètre `filter` JSON (`where`, `order`, `limit`, `skip`, `include`).

---

## Démarrage rapide

### Pré-requis
- Node.js ≥ 26 (cf. `.nvmrc`)
- pnpm ≥ 10 (cf. `packageManager` dans `package.json`)
- MySQL ou MariaDB (en local ou via Docker)
- Docker pour les tests d'API (MySQL jetable via Testcontainers)

### Installation

```bash
pnpm install
```

### Base de données

```bash
export DB_HOST=localhost DB_PORT=3306 DB_USER=… DB_PASSWORD=… DB_NAME=…
pnpm --filter @mccbng/front db:migrate                  # base vide : crée le schéma
pnpm --filter @mccbng/front db:migrate -- --baseline    # base de production existante : marque la baseline comme jouée
```

Voir `docs/db-migrations.md` pour la procédure complète.

### Lancer l'application (port 8080)

```bash
cd front
# variables DB_* et JWT_SECRET dans l'environnement ou dans front/.env
pnpm dev
```

### Tests / linting

```bash
pnpm --filter @mccbng/front test        # unitaires + intégration front (Vitest, environnement Nuxt)
pnpm --filter @mccbng/front test:api    # tests d'intégration de l'API sur un MySQL jetable (Docker requis)
pnpm --filter @mccbng/front lint
pnpm --filter @mccbng/front type-check
```

---

## Configuration

Toute la configuration serveur passe par des variables d'environnement, lues à l'exécution (aucun fichier de configuration embarqué dans l'image).

| Variable | Obligatoire | Rôle |
|----------|-------------|------|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | oui | connexion MySQL |
| `JWT_SECRET` | oui en production | secret de signature des sessions (le garder fixe : un changement déconnecte tout le monde) |
| `JWT_TTL_SECONDS` | non | durée de vie du JWT en secondes (3600 par défaut) |

En développement, `JWT_SECRET` peut être omis (un secret éphémère est généré, avec un avertissement). Le front appelle toujours l'API en chemin relatif (`/api`).

---

## Déploiement Docker

Une seule image contient le front **et** l'API :

```bash
pnpm --filter @mccbng/front docker:staging:build && pnpm --filter @mccbng/front docker:staging:push
pnpm --filter @mccbng/front docker:latest:build  && pnpm --filter @mccbng/front docker:latest:push
```

- Multi-stage `node:26-slim` (pnpm installé avec npm, car Node 26 n'embarque plus corepack) → `node:26-slim` qui exécute `.output/server/index.mjs` sur le port 8080, avec un healthcheck. Le contexte de build est la **racine du dépôt** (`docker build -f front/Dockerfile .`) car le lockfile pnpm est à la racine.
- Au démarrage, le conteneur sort avec un message explicite si `DB_*` ou `JWT_SECRET` manque.
- Les migrations SQL ne sont pas jouées par l'image : les lancer depuis le poste ou la CI avant de déployer une version qui en apporte (`docs/db-migrations.md`).
- Registre : `dockregistry.xju.fr/mccbng/front:{staging,latest}`.

Un `docker-compose.build.yml` et un script `build-and-push.sh` sont disponibles à la racine pour orchestrer le build (le conteneur de build utilise `docker:24-cli`, compatible avec l'API Docker du NAS).

### Historique et retour arrière

L'API LoopBack 4 (`back/`, image `mccbng/api`) a été remplacée par l'API Nitro. Pour revenir en arrière, redéployer les anciennes images `front` (qui proxifiait vers `API_URL`) et `api` encore présentes dans le registre. Le schéma de base de données n'a pas été modifié par la migration.

---

## Licence

MIT — © Xavier Julien
