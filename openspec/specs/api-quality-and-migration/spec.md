# api-quality-and-migration Specification

## Purpose
TBD - created by archiving change migrate-back-to-nuxt-server. Update Purpose after archive.
## Requirements
### Requirement: Migrations SQL versionnées avec baseline
Le schéma SHALL être géré par des fichiers SQL versionnés dans `server/db/migrations/`, appliqués dans l'ordre par une commande dédiée (`pnpm db:migrate`) qui enregistre les migrations jouées dans une table de suivi. La base de production actuelle MUST être la **baseline** : la migration `0000_baseline` reprend à l'identique le DDL de production (moteurs MyISAM/InnoDB, jeux de caractères et défauts compris), est marquée comme jouée sans être exécutée sur la production, et MUST permettre de recréer le schéma sur une base vide. Les anciennes migrations (`2026-05-02-create-bien.sql`, `2026-05-07-categorie-type.sql`) sont intégrées à la baseline. Aucun mode `--rebuild`/`DROP` MUST exister. Le moteur cible est MariaDB. La commande MUST prendre un verrou exclusif (`GET_LOCK`) pendant son exécution et échouer explicitement si une autre exécution le détient ; l'option `--baseline` MUST être refusée lorsque le schéma n'existe pas ; chaque fichier MUST être appliqué avec le mode SQL `NO_AUTO_VALUE_ON_ZERO`, de sorte qu'une clé auto-incrémentée valant `0` soit conservée ; un échec pendant l'application d'un fichier MUST nommer le fichier et signaler qu'il peut être partiellement appliqué. Toute migration postérieure à la baseline MUST être rejouable : relancer son contenu après une application complète ou partielle ne produit ni erreur ni modification supplémentaire.

#### Scenario: Base vide
- **WHEN** la commande de migration est lancée sur une base vide
- **THEN** toutes les tables du schéma sont créées et le suivi de migrations est à jour

#### Scenario: Base de production existante
- **WHEN** la baseline est marquée comme jouée sur la production
- **THEN** aucune table n'est modifiée ni recréée

#### Scenario: Idempotence
- **WHEN** la commande est relancée sans nouvelle migration
- **THEN** aucune modification n'est effectuée

#### Scenario: Exécutions concurrentes
- **WHEN** deux commandes de migration sont lancées en même temps sur la même base
- **THEN** une seule applique les migrations et l'autre échoue avec un message indiquant que le verrou est pris

#### Scenario: Baseline sur base vide
- **WHEN** `pnpm db:migrate -- --baseline` est lancé sur une base sans table `User`
- **THEN** la commande échoue sans marquer la baseline comme jouée

#### Scenario: Fichier en échec
- **WHEN** une instruction d'un fichier de migration échoue
- **THEN** la commande échoue avec un message qui nomme le fichier et signale une application partielle possible, et le fichier n'est pas marqué comme joué

#### Scenario: Clé zéro conservée
- **WHEN** les migrations sont appliquées sur une base contenant la catégorie partagée `IDcat = 0` et la banque `IDbanque = 0`
- **THEN** ces deux lignes existent toujours avec la clé `0` et les opérations en `IDcat = 0` restent rattachées à « Aucune »

#### Scenario: Migration rejouée
- **WHEN** le contenu d'une migration postérieure à la baseline est exécuté une seconde fois sur une base où elle a déjà été appliquée
- **THEN** aucune erreur n'est levée et le schéma est inchangé

### Requirement: Tests d'intégration des handlers
Chaque domaine (auth, référentiel, opérations, crédits/biens, stats) SHALL être couvert par des tests Vitest + `@nuxt/test-utils` exécutant les handlers contre une base MariaDB 10.11 réelle jetable (Testcontainers, ou base externe via `TEST_DB_*`) initialisée par les migrations. Les tests MUST couvrir le scoping multi-utilisateur (une ressource d'autrui = 404), les cascades du crédit, l'auto-génération des récurrentes, les filtres `Categorie.Type` et le rate-limit du login.

#### Scenario: Suite complète
- **WHEN** `pnpm test:api` est exécuté avec Docker disponible
- **THEN** la base MariaDB jetable démarre, les migrations passent et tous les tests d'intégration réussissent

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
- **THEN** `pnpm install` et `pnpm build` réussissent sans `back/` et aucun fichier ne référence `@loopback/*` ni `API_URL`

### Requirement: Schéma normalisé
Une migration versionnée SHALL convertir les tables `Operation`, `OperationRecurrente`, `Compte`, `Categorie`, `Banque`, `User` et `Credit` en `InnoDB` avec le jeu de caractères `utf8mb4` et la collation `utf8mb4_unicode_ci`, remplacer les valeurs `NULL` des drapeaux de compte (`bloque`, `porte_feuille`, `retraite` → 0, `visible` → 1) puis les déclarer `NOT NULL` avec ces défauts, supprimer la clé `UNIQUE IDopRecu` redondante, et créer les index `Operation(IDcompte, CheckOp, DateOp)`, `Operation(IDcompte, DateOp)`, `Operation(IDcredit)`, `Operation(IDcat)`, `Compte(IDuser)`, `OperationRecurrente(IDcompte)`, `Categorie(IDuser)` et `Credit(IDuser)`.

#### Scenario: Libellé avec emoji
- **WHEN** `POST /api/operations` est appelé avec `NomOp: "Resto 🍕"`
- **THEN** l'opération est créée et relue avec le même libellé

#### Scenario: Drapeau absent
- **WHEN** un compte est inséré sans valeur pour `bloque` ni `visible`
- **THEN** il est relu avec `bloque = 0` et `visible = 1`

#### Scenario: Index présents
- **WHEN** les migrations sont appliquées sur une base vide
- **THEN** `information_schema.STATISTICS` contient les 8 index et toutes les tables métier sont en `InnoDB` / `utf8mb4_unicode_ci`

### Requirement: Valeurs numériques exactes
Une migration versionnée distincte SHALL supprimer toute colonne `FLOAT` du schéma : les montants (`Operation.MontantOp`, `OperationRecurrente.MontantOpRecu`, `Compte.solde`, `Credit.MontantInitial`, `Credit.MontantMensuel`, `Bien.PrixBienNu`, `Bien.FraisNotaire`, `Bien.FraisAgence`, `Bien.ApportCash`, `Bien.ValeurActuelle`) en `DECIMAL(12,2)`, `Credit.TauxInteret` en `DECIMAL(6,3)` et `Bien.Surface` en `DECIMAL(8,2)`, nullabilité et défauts conservés. L'API MUST continuer de renvoyer ces valeurs comme des nombres JSON.

#### Scenario: Montant élevé
- **WHEN** un crédit de 150 000,01 € est enregistré puis relu
- **THEN** `MontantInitial` vaut exactement 150000.01

#### Scenario: Type JSON conservé
- **WHEN** une opération est lue via `GET /api/operations/{id}` et un crédit via `GET /api/credits/{id}`
- **THEN** `MontantOp`, `MontantInitial` et `TauxInteret` sont des nombres JSON et non des chaînes

### Requirement: Suppression du schéma legacy
Une migration versionnée SHALL supprimer les tables `Stats` et `UserCredentials` et les colonnes `User.id`, `User.realm`, `User.emailVerified` et `User.verificationToken`, qu'aucun code ne lit ni n'écrit.

#### Scenario: Schéma nettoyé
- **WHEN** les migrations sont appliquées sur une base vide
- **THEN** les tables `Stats` et `UserCredentials` n'existent pas et `User` ne contient plus les colonnes legacy

#### Scenario: Profil utilisateur intact
- **WHEN** `GET /api/users/whoAmI` est appelé après migration
- **THEN** `username`, `warningTotal`, `warningCompte` et `favoris` sont renvoyés comme avant

