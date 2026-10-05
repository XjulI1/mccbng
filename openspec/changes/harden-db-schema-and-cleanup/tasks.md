## 1. Runner de migrations

- [ ] 1.1 `scripts/db-migrate.mjs` : `GET_LOCK('mccbng_migrate', 10)` / `RELEASE_LOCK` en `finally`, échec explicite si le verrou est pris
- [ ] 1.2 Refuser `--baseline` si la table `User` n'existe pas
- [ ] 1.3 En cas d'erreur, nommer le fichier et signaler l'application partielle possible
- [ ] 1.4 Tests du runner : exécutions concurrentes, `--baseline` sur base vide, fichier en échec
- [ ] 1.5 Documenter dans `docs/db-migrations.md` la convention d'écriture (migration vérifiable ou procédure de reprise) et la numérotation partagée avec `harden-api-security`

## 2. Migration 0001 : InnoDB, utf8mb4, drapeaux, index

- [ ] 2.1 Relever la version MySQL/MariaDB de production, le `innodb_default_row_format` et la collation cible
- [ ] 2.2 Écrire `server/db/migrations/0001_innodb_utf8mb4_indexes.sql` : `ENGINE=InnoDB` et `CONVERT TO CHARACTER SET utf8mb4`, mise à jour des `NULL` des drapeaux puis `NOT NULL DEFAULT`, `DROP INDEX IDopRecu`, création des 7 index
- [ ] 2.3 Mettre à jour `server/db/schema.ts` (drapeaux `notNull`, index)
- [ ] 2.4 Tests API : libellé avec emoji, transaction réellement annulée (création de crédit en échec simulé), `EXPLAIN` de la liste paginée qui utilise l'index
- [ ] 2.5 Répétition sur une copie de production : durée, intégrité, `pnpm test:api` contre la copie
- [ ] 2.6 Écrire dans `docs/db-migrations.md` la procédure de fenêtre de maintenance et les `ALTER` inverses

## 3. Migration 0002 : montants DECIMAL

- [ ] 3.1 Établir la liste exhaustive des colonnes monétaires depuis la baseline
- [ ] 3.2 Écrire `server/db/migrations/0002_decimal_amounts.sql` (`DECIMAL(12,2)`)
- [ ] 3.3 `server/db/client.ts` : `decimalNumbers: true` ; `server/db/schema.ts` : `decimal({ precision: 12, scale: 2, mode: 'number' })`
- [ ] 3.4 Script de comparaison des sommes par compte avant et après sur une copie ; documenter les écarts
- [ ] 3.5 Tests API : 150 000,01 relu à l'identique, `typeof MontantOp === 'number'`

## 4. Requêtes

- [ ] 4.1 `server/utils/crud.ts` : clé primaire en dernier critère d'`ORDER BY`, `DEFAULT_MAX_LIMIT` appliqué sans `limit` (vérifier les besoins du front, par exemple les catégories)
- [ ] 4.2 `server/utils/filter.ts` : échappement de `\`, `%`, `_` dans `like` avec `ESCAPE` ; tests unitaires
- [ ] 4.3 Recherche par montant : comparaison numérique si le terme est un nombre (virgule acceptée)
- [ ] 4.4 Remplacer `MONTH()`/`YEAR()` par des intervalles de dates dans `sumByUserByMonth`, `sumCategoriesByUserByMonth` et `server/utils/stats.ts`
- [ ] 4.5 Remplacer les `NATURAL JOIN Compte` par `JOIN Compte USING (IDcompte)` (stats, `suggestCategories`, `sumAllCompteForUser`, `auto-generation`)
- [ ] 4.6 `server/api/comptes/management-info.get.ts` : 3 requêtes groupées (`MAX(DateOp)`, deux `COUNT … GROUP BY IDcompte`)
- [ ] 4.7 `suggestCategories` : `LIMIT ?` paramétré, `LOWER` supprimé (collation `_ci`)
- [ ] 4.8 Tests API : 40 opérations à la même date sur deux pages sans doublon ni trou, liste sans limite bornée, `management-info` inchangé fonctionnellement

## 5. Code serveur

- [ ] 5.1 Supprimer `unprocessable` et `tooManyRequests` s'ils restent inutilisés, et l'export inutile de `findUserByEmail`
- [ ] 5.2 Unifier les routes CRUD explicites qui ne font que déléguer (`comptes`, `operations`, `operation-recurrentes`, `credits`) avec le routage `[resource]` ; tests de routes inchangés et verts
- [ ] 5.3 Documenter dans `server/utils/crud.ts` que `transaction()` n'est atomique qu'en InnoDB (retirer la mention une fois `0001` déployée)
- [ ] 5.4 Statuer sur `UserCredentials.password`, écrit mais jamais lu, et sur la table legacy `Stats` (questions ouvertes)

## 6. Qualité et CI

- [ ] 6.1 Corriger les 131 warnings ESLint (`any` dans `tests/api`, `app/stores`, `app/components` et `server/utils` ; `no-console` ; `vue/require-prop-types` ; `vue/attribute-hyphenation`)
- [ ] 6.2 Passer `lint:check` en `--max-warnings 0`
- [ ] 6.3 Activer `noImplicitAny: true` dans `nuxt.config.ts` et corriger les erreurs, `server/` d'abord puis `app/`
- [ ] 6.4 Ajouter `pnpm audit --prod --audit-level high` en CI avec une liste d'exceptions datée (`node-forge` via `listhen`, `braces` via `nitropack`, toutes deux limitées à l'outillage)
- [ ] 6.5 Rendre `pnpm type-check` exécutable sans `.env` (`--dotenv` vers un fichier vide en CI) et l'ajouter à la CI
- [ ] 6.6 Mettre à jour `CLAUDE.md` (moteur InnoDB, montants `DECIMAL`, commandes CI) et `docs/security-roadmap.md` (conversion InnoDB réalisée)
