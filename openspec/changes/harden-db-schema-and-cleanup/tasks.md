## 1. Tests sur MariaDB

- [ ] 1.1 Remplacer `@testcontainers/mysql` par `@testcontainers/mariadb` et démarrer `mariadb:10.11` dans `tests/support/database.ts`
- [ ] 1.2 Vérifier que `0000_baseline` et `0001_user_login_security` passent sur une base MariaDB vide et que `pnpm test:api` reste vert ; corriger les écarts MySQL/MariaDB éventuels

## 2. Runner de migrations

- [ ] 2.1 `scripts/db-migrate.mjs` : `GET_LOCK('mccbng_migrate', 10)` / `RELEASE_LOCK` en `finally`, échec explicite si le verrou est pris
- [ ] 2.2 Refuser `--baseline` si la table `User` n'existe pas, sans rien marquer
- [ ] 2.3 En cas d'erreur, nommer le fichier, signaler l'application partielle possible et rappeler qu'il peut être relancé
- [ ] 2.4 Ajouter `NO_AUTO_VALUE_ON_ZERO` au `sql_mode` de session avant chaque fichier
- [ ] 2.5 Tests du runner : exécutions concurrentes, `--baseline` sur base vide, fichier en échec non marqué, lignes `IDcat = 0` / `IDbanque = 0` conservées après toutes les migrations
- [ ] 2.6 Test générique de rejouabilité : chaque migration postérieure à la baseline est rejouée une seconde fois sans erreur ni changement de schéma
- [ ] 2.7 Documenter dans `docs/db-migrations.md` la convention de rejouabilité (`IF [NOT] EXISTS` MariaDB) et MariaDB comme seul moteur cible

## 3. Migration 0002 : InnoDB, utf8mb4, drapeaux, index

- [ ] 3.1 Écrire la requête de contrôle des collisions de `User.email` sous `utf8mb4_unicode_ci` (dans `docs/db-migrations.md`)
- [ ] 3.2 Écrire `server/db/migrations/0002_innodb_utf8mb4_indexes.sql` : `ENGINE=InnoDB` et `CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci` (7 tables), `NULL` des drapeaux remplacés puis `NOT NULL DEFAULT`, `DROP INDEX IF EXISTS IDopRecu`, les 8 index en `CREATE INDEX IF NOT EXISTS`
- [ ] 3.3 Tests API : libellé avec emoji, drapeaux par défaut, index et moteurs présents dans `information_schema`

## 4. Migration 0003 : plus de FLOAT

- [ ] 4.1 Écrire `server/db/migrations/0003_decimal_columns.sql` : 10 montants en `DECIMAL(12,2)`, `TauxInteret` en `DECIMAL(6,3)`, `Surface` en `DECIMAL(8,2)`, nullabilité et défauts conservés
- [ ] 4.2 `server/db/client.ts` : `decimalNumbers: true`
- [ ] 4.3 Script de comparaison des sommes par compte (`SUM(MontantOp)`, `solde`) avant et après, à jouer sur la copie de production
- [ ] 4.4 Tests API : 150 000,01 relu à l'identique ; `MontantOp`, `MontantInitial`, `TauxInteret` sont des nombres JSON

## 5. Migration 0004 : legacy

- [ ] 5.1 Vérifier une dernière fois qu'aucun code ne lit `Stats`, `UserCredentials`, `User.id`, `realm`, `emailVerified`, `verificationToken`
- [ ] 5.2 Écrire `server/db/migrations/0004_drop_legacy.sql` (`DROP TABLE IF EXISTS`, `DROP COLUMN IF EXISTS`)
- [ ] 5.3 Tests API : tables et colonnes absentes, `whoAmI` inchangé

## 6. Schéma Drizzle et transactions

- [ ] 6.1 `server/db/schema.ts` : `decimal({ precision, scale, mode: 'number' })`, drapeaux `notNull().default(…)`, index déclarés, `userCredentials` et colonnes legacy de `User` retirés
- [ ] 6.2 Test de comparaison du schéma Drizzle avec `information_schema.COLUMNS` après migration d'une base vide
- [ ] 6.3 `POST /api/operations/transfert` : débit et crédit dans `getDb().transaction(…)` ; supprimer `server/utils/transfer.ts` et ses tests
- [ ] 6.4 `credits.onCreate` (`server/utils/resources.ts`) : retirer la suppression compensatoire, s'appuyer sur la transaction de `crud.ts`
- [ ] 6.5 Retirer les commentaires mentionnant MyISAM (`crud.ts`, `resources.ts`…)
- [ ] 6.6 Tests API : virement dont le crédit échoue → aucune opération persistée ; crédit dont la mise à jour d'`IDopRecu` échoue → ni crédit ni récurrente

## 7. Répétition et mise en production

- [ ] 7.1 Répétition sur une copie de production (dump phpMyAdmin chargé dans un MariaDB 10.11 local, jamais commité) : collisions d'`email`, lignes de clé `0` conservées, durée de `pnpm db:migrate`, comparaison des sommes, `EXPLAIN` de la liste paginée et d'une requête de stats, `pnpm test:api` contre la copie
- [ ] 7.2 Écrire dans `docs/db-migrations.md` la procédure de fenêtre de maintenance unique (arrêt, sauvegarde, migrations, déploiement, recette) et le rollback par restauration
- [ ] 7.3 Mettre à jour `CLAUDE.md` (InnoDB partout, `DECIMAL`, MariaDB 10.11, tables legacy supprimées) et `docs/security-roadmap.md` (§1 réalisé)
