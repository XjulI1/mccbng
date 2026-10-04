# api-quality-and-migration Specification

## Purpose
TBD - created by archiving change migrate-back-to-nuxt-server. Update Purpose after archive.
## Requirements
### Requirement: Migrations SQL versionnées avec baseline
Le schéma SHALL être géré par des fichiers SQL versionnés dans `front/server/db/migrations/`, appliqués dans l'ordre par une commande dédiée (`pnpm --filter @mccbng/front db:migrate`) qui enregistre les migrations jouées dans une table de suivi. La base de production actuelle MUST être la **baseline** : la migration `0000_baseline` reprend à l'identique le DDL de production (moteurs MyISAM/InnoDB, jeux de caractères et défauts compris), est marquée comme jouée sans être exécutée sur la production, et MUST permettre de recréer le schéma sur une base vide. Les anciennes migrations (`2026-05-02-create-bien.sql`, `2026-05-07-categorie-type.sql`) sont intégrées à la baseline. Aucun mode `--rebuild`/`DROP` MUST exister.

#### Scenario: Base vide
- **WHEN** la commande de migration est lancée sur une base vide
- **THEN** toutes les tables du schéma sont créées et le suivi de migrations est à jour

#### Scenario: Base de production existante
- **WHEN** la baseline est marquée comme jouée sur la production
- **THEN** aucune table n'est modifiée ni recréée

#### Scenario: Idempotence
- **WHEN** la commande est relancée sans nouvelle migration
- **THEN** aucune modification n'est effectuée

### Requirement: Tests d'intégration des handlers
Chaque domaine (auth, référentiel, opérations, crédits/biens, stats) SHALL être couvert par des tests Vitest + `@nuxt/test-utils` exécutant les handlers contre une base MySQL réelle jetable (Testcontainers ou Docker Compose) initialisée par les migrations. Les tests MUST couvrir le scoping multi-utilisateur (une ressource d'autrui = 404), les cascades du crédit, l'auto-génération des récurrentes, les filtres `Categorie.Type` et le rate-limit du login.

#### Scenario: Suite complète
- **WHEN** `pnpm --filter @mccbng/front test` est exécuté avec Docker disponible
- **THEN** la base jetable démarre, les migrations passent et tous les tests d'intégration réussissent

#### Scenario: Isolation entre tests
- **WHEN** deux tests créent des données
- **THEN** les données de l'un n'affectent pas l'autre

### Requirement: Tests de parité LoopBack ↔ Nitro
Avant la suppression de `back/`, un jeu de scénarios SHALL rejouer les mêmes requêtes (login, CRUD, agrégats, stats, crédits) contre l'API LoopBack et l'API Nitro adossées à la même base de test, et comparer statuts et corps JSON (en normalisant les champs volatils : JWT, dates générées, ordre non spécifié). Tout écart MUST être soit corrigé, soit listé comme correction mineure dans `design.md`.

#### Scenario: Agrégats identiques
- **WHEN** `sumAllCompteForUser` et `stats/evolutionSolde` sont appelés sur les deux API avec le même jeu de données
- **THEN** les réponses sont égales à l'arrondi près (2 décimales)

#### Scenario: Écart non documenté
- **WHEN** la comparaison révèle une différence non listée
- **THEN** le critère de bascule n'est pas satisfait

### Requirement: Recette de non-régression
La recette `docs/recette-non-regression-multiuser.md` SHALL être rejouée intégralement sur l'application Nitro (staging) et son résultat consigné avant la bascule en production.

#### Scenario: Recette validée
- **WHEN** tous les points de la recette passent sur staging
- **THEN** la bascule en production est autorisée

### Requirement: Suppression de LoopBack après bascule
Une fois les critères satisfaits, le package `back/`, ses scripts (`build`, `migrate`, `openapi-spec`, `docker:*`), le workspace `back` dans `pnpm-workspace.yaml`, le Dockerfile `api`, ses dépendances `@loopback/*`/`express`/etc. et le Swagger Explorer SHALL être supprimés, et la documentation (`CLAUDE.md` racine et `front/`, `README.md`, suppression de `back/CLAUDE.md`) mise à jour pour décrire l'architecture réelle (login email+code bcrypt, cookie HttpOnly, TTL JWT, logout).

#### Scenario: Repo propre
- **WHEN** la bascule est terminée
- **THEN** `pnpm install` et `pnpm --filter @mccbng/front build` réussissent sans `back/` et aucun fichier ne référence `@loopback/*` ni `API_URL`

