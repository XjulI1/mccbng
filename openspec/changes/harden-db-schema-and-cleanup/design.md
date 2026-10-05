## Context

`server/db/migrations/0000_baseline.sql` reproduit le DDL de production : un mélange de MyISAM (`Operation`, `OperationRecurrente`, `Compte`, `Categorie`, `Banque`, `User`) et d'InnoDB (`Credit`, `Bien`, `Stats`, `UserCredentials`), des colonnes en `utf8mb3` (sauf `Bien`, déjà en `utf8mb4_unicode_ci`), des drapeaux `DEFAULT NULL`, des colonnes `FLOAT` et aucun index hors clés primaires (sauf `Bien`). `0001_user_login_security` a ajouté les colonnes de lockout et `tokenVersion`.

Production relevée le 2026-10-05 : **MariaDB 10.11.11**, `innodb_default_row_format = dynamic`, `collation_server = utf8mb3_general_ci`. Les tests API (`tests/support/database.ts`) tournent sur `mysql:8.4`.

Le dump phpMyAdmin de production du 2026-10-05 confirme que le schéma est **identique** à `0000_baseline` + `0001_user_login_security` : mêmes colonnes, moteurs, charsets et index, aucun trigger, aucune vue, aucune routine. Seule la table `__migrations` s'ajoute, créée par le runner (InnoDB, `utf8mb3`). Constats sur les données :
- volume faible : environ 11 000 opérations, 35 comptes, 38 récurrentes, 24 catégories, 1 utilisateur ;
- **`Banque` et `Categorie` contiennent chacune une ligne de clé `0`** dans une colonne `AUTO_INCREMENT` (la catégorie partagée « Aucune », `IDcat = 0`) ; le dump lui-même s'appuie sur `NO_AUTO_VALUE_ON_ZERO` pour la recharger ;
- aucun drapeau de compte à `NULL` ; aucune `Operation.IDcat` à `NULL` ;
- 2 montants d'opération ont plus de 2 décimales (arrondis par `0003`) ; aucune valeur hors de la plage de `DECIMAL(12,2)` ; aucun taux à plus de 3 décimales ;
- `Stats` et `UserCredentials` sont vides ; `User.id`, `realm` et `emailVerified` sont renseignés pour l'unique utilisateur, mais aucun code ne les lit ;
- aucune collision d'`email` possible (un seul utilisateur).

Le runner `scripts/db-migrate.mjs` applique les fichiers dans l'ordre, sans verrou, et refuse déjà d'appliquer la baseline sur un schéma existant sans `--baseline`.

Faute de transactions, deux écritures multi-lignes sont protégées par compensation : `insertCompensatedPair` (`server/utils/transfer.ts`) pour le virement, et la suppression explicite de la récurrente dans `credits.onCreate` (`server/utils/resources.ts`).

Constats de l'audit du 2026-10-05 traités ici :

| Réf. | Constat |
|---|---|
| D-M2, B7, roadmap §1 | MyISAM : transactions sans effet |
| D-M7 | `FLOAT` : 150 000,01 est relu 150 000,02 |
| D-M8 | Pool `utf8mb4`, colonnes `utf8mb3` : erreur sur un emoji |
| D-M9 | Aucun index secondaire |
| D-B6 | Runner : pas de verrou, échec partiel non signalé, `--baseline` sur base vide |
| D-B12 | `UNIQUE IDopRecu` redondant ; tables et colonnes legacy |

## Goals / Non-Goals

**Goals :**
- Des transactions réelles sur toutes les tables métier, utilisées par le virement et la création de crédit.
- Des valeurs exactes : plus aucun `FLOAT` dans le schéma.
- Les index nécessaires à la liste paginée, aux soldes et aux stats.
- Un runner de migrations sûr, des migrations rejouables, testées sur le moteur de production.
- Un schéma débarrassé du legacy inutilisé.

**Non-Goals :**
- La réécriture des requêtes (pagination, limites, `like`, dates, `management-info`, recherche par montant) : `optimize-api-queries`.
- L'audit des dépendances : `add-dependency-audit`. Le typage strict et le lint : change dédié à venir.
- L'unification des routes CRUD explicites avec `[resource]` : abandonnée. Les sous-répertoires `server/api/{comptes,operations,operation-recurrentes,credits}/` masquent `[resource]` dans le routeur Nitro (décision C11 de `migrate-back-to-nuxt-server`) ; chaque fichier explicite se limite déjà à `crudRoute(…)`.
- La portabilité MySQL : MariaDB devient le seul moteur cible.

## Decisions

### D1. MariaDB 10.11 comme moteur de test
`tests/support/database.ts` démarre `mariadb:10.11` via `@testcontainers/mariadb` (remplace `@testcontainers/mysql`). Les migrations, les collations, `GET_LOCK` et le DDL sont ainsi validés sur le moteur réel. La baseline doit passer sur une base MariaDB vide.
- *Alternative* : matrice MySQL + MariaDB. Écartée : double durée de `test:api` pour un moteur qui n'est pas déployé.

### D2. Migrations rejouables
Chaque migration MUST pouvoir être relancée après un échec partiel, sans erreur ni effet supplémentaire :
- `CREATE INDEX IF NOT EXISTS`, `DROP INDEX IF EXISTS`, `DROP TABLE IF EXISTS`, `DROP COLUMN IF EXISTS`, `ADD COLUMN IF NOT EXISTS` (syntaxe MariaDB) ;
- `ENGINE=InnoDB`, `CONVERT TO CHARACTER SET`, `MODIFY` et `UPDATE … WHERE col IS NULL` sont rejouables par nature.

Un test applique chaque migration, puis rejoue son contenu une seconde fois et vérifie l'absence d'erreur. La convention est écrite dans `docs/db-migrations.md`.
- *Alternative* : contrôle d'`information_schema` dans une procédure temporaire. Écartée : verbeux, et inutile puisque MariaDB est seul moteur cible.

### D3. Sécurité du runner
- `SELECT GET_LOCK('mccbng_migrate', 10)` en début d'exécution : échec explicite si le verrou n'est pas obtenu. `RELEASE_LOCK` dans un `finally`.
- `--baseline` vérifie que la table `User` existe ; sinon, refus avec un message, sans rien marquer.
- En cas d'erreur pendant un fichier, le message nomme le fichier, rappelle que le DDL n'est pas transactionnel (le fichier peut être partiellement appliqué) et qu'il peut être relancé (D2).
- *Alternative* : outil tiers (drizzle-kit migrate, Flyway). Écartée : le runner actuel est testé et suffisant.

### D4. Trois migrations
- Toutes les migrations s'exécutent avec `NO_AUTO_VALUE_ON_ZERO` : le runner ajoute ce mode à la session avant d'appliquer un fichier, et `0002` le rappelle en tête (`SET SESSION sql_mode = CONCAT(@@SESSION.sql_mode, ',NO_AUTO_VALUE_ON_ZERO')`). Sans lui, une copie de table qui réinsère la ligne de clé `0` de `Categorie` ou de `Banque` pourrait lui attribuer une nouvelle valeur auto-incrémentée, ce qui détacherait toutes les opérations de la catégorie « Aucune ». Un test vérifie, après migration, que les lignes `IDcat = 0` et `IDbanque = 0` existent toujours avec cette clé.
- `0002_innodb_utf8mb4_indexes.sql` :
  - contrôle préalable documenté : aucune collision de `User.email` sous `utf8mb4_unicode_ci` (requête `GROUP BY email COLLATE utf8mb4_unicode_ci HAVING COUNT(*) > 1` jouée sur la copie de production) ;
  - `ALTER TABLE … ENGINE=InnoDB, CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci` sur `Operation`, `OperationRecurrente`, `Compte`, `Categorie`, `Banque`, `User`, `Credit` (déjà InnoDB) ; `Bien` est déjà conforme ; `Stats` et `UserCredentials` ne sont pas convertis (supprimés par `0004`) ;
  - `UPDATE Compte SET bloque = 0 WHERE bloque IS NULL`, de même pour `porte_feuille` et `retraite` (0) et `visible` (1) ; puis `MODIFY … tinyint(1) NOT NULL DEFAULT …` ;
  - `DROP INDEX IF EXISTS IDopRecu ON OperationRecurrente` ;
  - les 8 index (D5).
- `0003_decimal_columns.sql` :
  - `DECIMAL(12,2)` : `Operation.MontantOp`, `OperationRecurrente.MontantOpRecu`, `Compte.solde`, `Credit.MontantInitial`, `Credit.MontantMensuel`, `Bien.PrixBienNu`, `Bien.FraisNotaire`, `Bien.FraisAgence`, `Bien.ApportCash`, `Bien.ValeurActuelle` ;
  - `DECIMAL(6,3)` : `Credit.TauxInteret` (taux annuel en %) ;
  - `DECIMAL(8,2)` : `Bien.Surface` (m²) ;
  - nullabilité et défauts conservés.
- `0004_drop_legacy.sql` : `DROP TABLE IF EXISTS Stats`, `DROP TABLE IF EXISTS UserCredentials`, `ALTER TABLE User DROP COLUMN IF EXISTS id, … realm, … emailVerified, … verificationToken`. Aucune de ces tables ou colonnes n'est lue ni écrite par l'API (`username`, `warningTotal`, `warningCompte` et `favoris` restent utilisés).

On sépare les trois fichiers parce que leurs risques diffèrent : `0002` ne change aucune valeur métier (hors `NULL` des drapeaux), `0003` arrondit des valeurs, `0004` détruit des données legacy. Chacun a sa vérification propre lors de la répétition.

### D5. Index
| Index | Sert |
|---|---|
| `Operation(IDcompte, CheckOp, DateOp)` | liste paginée (`CheckOp ASC, DateOp DESC`), soldes pointés / non pointés |
| `Operation(IDcompte, DateOp)` | stats et totaux mensuels (plage de dates par compte), `MAX(DateOp)` |
| `Operation(IDcredit)` | paiements et solde restant d'un crédit, cascade |
| `Operation(IDcat)` | stats par catégorie, suppression d'une catégorie |
| `Compte(IDuser)` | scope utilisateur |
| `OperationRecurrente(IDcompte)` | scope hérité, auto-génération |
| `Categorie(IDuser)` | catégories de l'utilisateur et partagées |
| `Credit(IDuser)` | scope utilisateur |

La vérification automatisée porte sur l'existence des index dans `information_schema.STATISTICS` après migration. L'usage effectif (`EXPLAIN`) n'est contrôlé que lors de la répétition sur la copie de production : sur une base de test presque vide, l'optimiseur préfère légitimement un parcours complet.

### D6. Lecture des DECIMAL en nombres
`mysql2` renvoie les `DECIMAL` en chaînes par défaut, ce qui casserait le contrat JSON consommé par le front. On ajoute `decimalNumbers: true` au pool (`server/db/client.ts`) et `decimal({ precision, scale, mode: 'number' })` dans le schéma Drizzle. `DECIMAL(12,2)` reste représentable exactement en `number` (moins de 15 chiffres significatifs).
- Les agrégats SQL (`SUM`) deviennent exacts ; le calcul côté JS reste en flottants et `round2` est appliqué aux sommes.

### D7. Transactions réelles
Une fois toutes les tables en InnoDB :
- `POST /api/operations/transfert` insère le débit et le crédit dans `getDb().transaction(…)` ; `insertCompensatedPair` et `server/utils/transfer.ts` sont supprimés ;
- `credits.onCreate` s'exécute déjà dans la transaction de `crud.ts` : le `try/catch` de suppression compensatoire est retiré ;
- les commentaires mentionnant MyISAM sont retirés.

Ce code et les migrations partent dans la même fenêtre (voir Migration Plan) : la version déployée n'a jamais à fonctionner sur du MyISAM.

### D8. Schéma Drizzle
`server/db/schema.ts` décrit le schéma obtenu après toutes les migrations : `decimal` (D6), drapeaux `notNull().default(…)`, index déclarés, `userCredentials` et les colonnes legacy de `User` retirées. Un test compare, après migration d'une base vide, les colonnes, types, nullabilités et défauts du schéma Drizzle à `information_schema.COLUMNS`.

## Risks / Trade-offs

- [`ALTER TABLE` sur `Operation` verrouille la table pendant la conversion] → Exécution dans la fenêtre de maintenance, application arrêtée, après sauvegarde (`mysqldump`). Avec environ 11 000 lignes, la conversion doit prendre quelques secondes ; durée mesurée d'abord sur une copie.
- [Renumérotation de la clé `0` de `Categorie` / `Banque` lors de la copie de table] → `NO_AUTO_VALUE_ON_ZERO` imposé par le runner ; test dédié ; contrôle `SELECT IDcat FROM Categorie WHERE IDcat = 0` lors de la répétition et de la recette.
- [Collision d'`email` sous la nouvelle collation (l'index `UNIQUE email` ferait échouer la conversion)] → Requête de contrôle jouée sur la copie de production avant la fenêtre.
- [Valeurs `FLOAT` déjà imprécises arrondies en `DECIMAL`] → Un script compare `SUM(MontantOp)` par compte avant et après sur une copie. On accepte un écart au centime, documenté.
- [Le front reçoit des chaînes si `decimalNumbers` est oublié] → Test API qui vérifie que `typeof MontantOp === 'number'` et `typeof TauxInteret === 'number'`.
- [`0004` détruit des données] → Elles ne sont plus lues ; la sauvegarde de la fenêtre les conserve. L'image précédente ne fonctionne plus après `0004` (Drizzle sélectionne les colonnes déclarées) : le rollback passe par la restauration de la sauvegarde, pas par un simple retour d'image.
- [Fenêtre unique : un problème dans `0003` ou `0004` oblige à tout restaurer] → Assumé ; la répétition complète sur la copie de production réduit ce risque.
- [Abandon de la portabilité MySQL] → Assumé : la production est MariaDB et le restera sur le NAS.

## Migration Plan

1. Répétition sur une copie de production (base MariaDB 10.11 locale, chargée depuis un dump phpMyAdmin récent ; le dump contient des données personnelles et ne doit pas être commité) :
   - contrôle des collisions d'`email` ;
   - présence des lignes `IDcat = 0` et `IDbanque = 0` après migration ;
   - `pnpm db:migrate` (`0002` → `0004`) : mesurer la durée ;
   - comparer les sommes par compte avant et après `0003` ;
   - `EXPLAIN` de la liste paginée d'un compte et d'une requête de stats ;
   - `pnpm test:api` avec `TEST_DB_*` pointant vers la copie.
2. Fenêtre de maintenance :
   1. arrêter l'application ;
   2. sauvegarde complète (`mysqldump`) ;
   3. `pnpm db:migrate` ;
   4. déployer la nouvelle image (`decimalNumbers`, transactions, schéma Drizzle) et redémarrer ;
   5. recette rapide : connexion, liste d'un compte, virement, création d'un crédit de test, stats.
3. Rollback : arrêter l'application, restaurer la sauvegarde, redéployer l'image précédente.

## Open Questions

_Aucune._ Décisions prises le 2026-10-05 : MariaDB 10.11 seul moteur cible, collation `utf8mb4_unicode_ci`, conversion de tous les `FLOAT`, suppression du legacy dans `0004`, fenêtre unique.
