## Why

Le schéma de production (MariaDB 10.11) est repris tel quel dans la migration `0000_baseline`. L'audit du 2026-10-05 y relève plusieurs problèmes :
- tables MyISAM, qui rendent toutes les transactions de l'API inopérantes (déjà inscrit dans `docs/security-roadmap.md` §1) : le virement et la création de crédit reposent sur des suppressions compensatoires ;
- colonnes en `utf8mb3`, sur lesquelles une saisie contenant un emoji échoue ;
- aucun index secondaire, si bien que chaque requête parcourt toute la table `Operation` ;
- drapeaux de compte acceptant `NULL` ;
- montants en `FLOAT`, faux au centime au-delà d'environ 131 000 € ;
- tables et colonnes legacy que plus rien ne lit (`Stats`, `UserCredentials`, `User.id`…).

Le runner de migrations n'a pas de verrou, et les tests API tournent sur MySQL 8.4 alors que la production est en MariaDB 10.11.

## What Changes

- **Runner de migrations** :
  - verrou `GET_LOCK` contre les exécutions concurrentes ;
  - `--baseline` refusé sur une base vide ;
  - message explicite en cas d'échec au milieu d'un fichier ;
  - convention : toute migration est rejouable après un échec partiel (syntaxe MariaDB `IF [NOT] EXISTS`), vérifiée par un test qui la rejoue.
- **Tests API sur MariaDB 10.11** (`@testcontainers/mariadb`) au lieu de `mysql:8.4`. MariaDB devient le seul moteur cible.
- **Migration `0002` de normalisation** :
  - passage en `ENGINE=InnoDB` de `Operation`, `OperationRecurrente`, `Compte`, `Categorie`, `Banque` et `User` ;
  - conversion en `utf8mb4` / `utf8mb4_unicode_ci` ;
  - remplacement des `NULL` des drapeaux de compte, puis passage en `NOT NULL DEFAULT 0` (1 pour `visible`) ;
  - suppression de la clé `UNIQUE IDopRecu`, redondante avec la clé primaire ;
  - ajout des index `Operation(IDcompte, CheckOp, DateOp)`, `Operation(IDcompte, DateOp)`, `Operation(IDcredit)`, `Operation(IDcat)`, `Compte(IDuser)`, `OperationRecurrente(IDcompte)`, `Categorie(IDuser)` et `Credit(IDuser)`.
- **Migration `0003` sans `FLOAT`** : **BREAKING (données)** les 10 colonnes de montant passent en `DECIMAL(12,2)`, `Credit.TauxInteret` en `DECIMAL(6,3)` et `Bien.Surface` en `DECIMAL(8,2)`. Le pool `mysql2` et le schéma Drizzle restituent des nombres et non des chaînes.
- **Migration `0004` de nettoyage legacy** : **BREAKING (schéma)** `DROP TABLE Stats`, `DROP TABLE UserCredentials`, `DROP COLUMN User.id, realm, emailVerified, verificationToken`.
- **Transactions réelles** : le virement (`POST /api/operations/transfert`) et la création de crédit s'exécutent dans une transaction ; les compensations manuelles (`insertCompensatedPair`, suppression explicite de la récurrente) sont retirées.

Hors périmètre, traités ailleurs :
- requêtes (pagination, limites, `like`, dates, `management-info`, recherche par montant) : `optimize-api-queries` ;
- audit des dépendances en CI et code mort : `add-dependency-audit` ;
- `noImplicitAny`, warnings ESLint et `any` : un change dédié au typage, à venir ;
- unification des routes CRUD explicites et génériques : abandonnée, les sous-répertoires `comptes/`, `operations/`… masquent `[resource]` dans Nitro (décision C11 de `migrate-back-to-nuxt-server`).

## Capabilities

### New Capabilities
_Aucune._

### Modified Capabilities
- `api-quality-and-migration` : runner de migrations sûr et migrations rejouables ; tests sur MariaDB ; migrations de normalisation, de montants exacts et de nettoyage legacy.
- `api-server-foundation` : le schéma Drizzle suit le schéma migré (et non plus seulement la baseline).
- `api-operations` : le virement est atomique par transaction.
- `api-credits-biens` : la création d'un crédit et de sa récurrente est atomique par transaction.

## Impact

- **Base de données** :
  - verrouillage des tables pendant `0002` et `0003` (`ALTER TABLE`), d'où une fenêtre de maintenance unique pour les trois migrations et le déploiement ;
  - sauvegarde obligatoire avant exécution ; rollback par restauration de la sauvegarde ;
  - procédure dans `docs/db-migrations.md`.
- **Code** :
  - `scripts/db-migrate.mjs` ;
  - `server/db/{schema,client}.ts` (`decimalNumbers`, `decimal`, drapeaux `notNull`, colonnes legacy retirées) ;
  - `server/utils/{transfer,resources,crud}.ts` et `server/api/operations/transfert.post.ts` ;
  - `tests/support/database.ts`, `package.json` (`@testcontainers/mariadb`).
- **Dépendances** : `harden-api-security` (archivé) occupe `0001_user_login_security`. `optimize-api-queries` s'appuie sur ce change pour la recherche exacte par montant (`DECIMAL`) et sur les index.
- **Documentation** : `CLAUDE.md` (InnoDB, `DECIMAL`, MariaDB), `docs/security-roadmap.md` (§1 réalisé), `docs/db-migrations.md`.
