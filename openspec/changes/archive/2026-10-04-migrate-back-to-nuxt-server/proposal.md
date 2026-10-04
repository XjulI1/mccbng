## Why

L'API LoopBack 4 (`back/`) tourne aujourd'hui dans un second package et une seconde image Docker, derrière un proxy Nitro (`front/server/api/[...path].ts`) qui n'existe que de façon transitoire (cf. change archivé `migrate-front-to-nuxt`, qui annonçait cette migration comme « prochain change »). LoopBack 4 (≈3 600 lignes de contrôleurs/repositories/services, décorateurs, DI, juggler) est lourd pour une application personnelle, et maintenir deux runtimes, deux builds, deux images et un proxy n'a plus de justification maintenant que le front est sur Nuxt/Nitro. Héberger l'API dans `./server` de Nuxt supprime un hop réseau, une image, un package et un framework.

## What Changes

- Réécrire les ~79 endpoints REST de LoopBack en **handlers Nitro** (`front/server/api/**`), avec les **mêmes URLs `/api/...`**, payloads et codes HTTP (iso-fonctionnel), le front restant inchangé. Corrections mineures d'incohérences autorisées mais **listées explicitement** dans `design.md`.
- Remplacer `loopback-connector-mysql` / juggler par **Drizzle ORM + mysql2** (schéma TypeScript reflétant la base existante, SQL analytique conservé via `sql```), config DB par **variables d'environnement**.
- Porter l'authentification à l'identique : login `email` + `code` (bcrypt, migration paresseuse des `secret_key` en clair), JWT (`id`, `name`, `email`, `IDuser`, TTL `JWT_TTL_SECONDS`, secret `JWT_SECRET`), cookie `HttpOnly` `mccbngAuth`, vérification Bearer sur chaque route protégée.
- Porter le **rate-limiting du login** via **`nuxt-security`**, qui apporte aussi les **en-têtes de sécurité (helmet-like)** de `docs/security-roadmap.md` (item 1).
- Ajouter une **validation systématique des entrées avec Zod** (remplace les schémas OpenAPI/LB4) en conservant le format d'erreur `{ error: { statusCode, message } }` attendu par le front.
- Remplacer `pnpm migrate` (auto-migration LB4) par des **migrations SQL versionnées** ; le schéma de production actuel sert de **baseline** (aucune modification de la base de prod).
- **BREAKING (infra)** : suppression du package `back/`, de l'image `mccbng/api`, de `API_URL`, du proxy `[...path].ts`, du Swagger Explorer (`/explorer`) et du script `openapi-spec`. L'image `mccbng/front` unique embarque l'API et exige `DB_*` et `JWT_SECRET` au runtime.
- Mettre en place un filet de non-régression : **Vitest + `@nuxt/test-utils`** sur les handlers, **MySQL réel jetable** (Testcontainers/Docker), **tests de parité LoopBack ↔ Nitro** avant suppression de `back/`, et passage de la **recette `docs/recette-non-regression-multiuser.md`**.
- Aligner la documentation sur le comportement réel (écarts `CLAUDE.md` ↔ code : login email+code, `secret_key` hashée, cookie HttpOnly, TTL, logout) et mettre à jour `CLAUDE.md` (racine, `front/`), `README.md`, `build-and-push.sh`, `docker-compose.build.yml`, CI.

**Hors périmètre** : nouvelles fonctionnalités métier ; durcissement d'auth (lockout par compte, refresh tokens, `nuxt-auth-utils`), qui restent dans `docs/security-roadmap.md` ; changement du modèle de données ou de l'API consommée par le front.

## Capabilities

### New Capabilities
- `api-server-foundation`: socle Nitro de l'API : connexion MySQL (Drizzle/mysql2, config par env), schéma de tables, format d'erreur uniforme, validation Zod, scoping utilisateur (`scope`/`assertOwned`/résolution des `IDcompte`), en-têtes de sécurité, route publique `GET /api/ping`.
- `api-auth`: login/logout/whoAmI/exists/update profil/signup, JWT préservant `IDuser`, cookie `mccbngAuth`, rate-limit du login, migration paresseuse bcrypt.
- `api-referentiel`: CRUD `banques`, `comptes` (+ `management-info`, `/comptes/{id}/banque`) et `categories`, scopés par utilisateur.
- `api-operations`: CRUD `operations` et `operation-recurrentes`, auto-génération des récurrentes, agrégats de soldes/mois/catégories et suggestion de catégories.
- `api-credits-biens`: CRUD `credits` (cascade création/suppression d'`OperationRecurrente`, solde restant, paiements) et `biens` (validation du crédit lié).
- `api-stats`: endpoints `/stats/*` (évolution du solde, comparaison annuelle, top catégories/opérations, revenus vs dépenses, heatmap) avec les règles de filtrage par `Categorie.Type`.
- `api-quality-and-migration`: migrations SQL versionnées (baseline), stratégie de tests (intégration, MySQL jetable, parité LoopBack ↔ Nitro, recette) et critères de bascule.

### Modified Capabilities
- `nuxt-app-shell`: l'exigence « Proxy de l'API » est retirée ; le serveur Nitro héberge directement `/api/**`.
- `front-delivery`: l'image Docker unique embarque l'API ; `API_URL` est supprimée au profit de `DB_*`/`JWT_SECRET` ; démarrage refusé si la configuration DB/JWT est absente.

## Impact

- **Code** : suppression de `back/` ; ajout de `front/server/{api,db,utils,middleware,plugins,tasks}` et de `front/server/db/migrations/`. Le code de `front/app/` n'est pas modifié (contrat d'API inchangé), hors corrections mineures listées.
- **Dépendances** : ajout `drizzle-orm`, `mysql2`, `drizzle-kit` (dev), `zod`, `jsonwebtoken` (ou `jose`), `bcryptjs`, `nuxt-security`, `testcontainers` (dev) ; retrait de tout `@loopback/*`, `express`, `cors`, `compression`, `express-rate-limit`, `loopback-connector-mysql`.
- **Déploiement** : une seule image `dockregistry.xju.fr/mccbng/front:{staging,latest}` ; `dockregistry.xju.fr/mccbng/api` abandonnée ; mise à jour de `build-and-push.sh`, `docker-compose.build.yml`, workflows `.github/`, et des variables d'environnement de l'hébergement (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `JWT_TTL_SECONDS`, retrait de `API_URL`).
- **Données** : aucune migration de données ; la base de production reste inchangée (baseline).
- **Risques** : régression sur les requêtes SQL analytiques (`DATE_FORMAT`, `FLOAT`), arrondi à 2 décimales, comportement des cascades crédit, format des erreurs 4xx/5xx consommé par le front, rate-limit en mémoire via `nuxt-security` (instance unique, succès éventuellement comptés). Les sessions existantes peuvent être invalidées à la bascule (acceptable).
