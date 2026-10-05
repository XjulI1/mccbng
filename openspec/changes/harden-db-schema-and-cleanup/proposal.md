## Why

Le schéma de production est repris tel quel dans la migration `0000_baseline`. L'audit du 2026-10-05 y relève plusieurs problèmes :
- tables MyISAM, qui rendent toutes les transactions de l'API inopérantes (déjà inscrit dans `docs/security-roadmap.md` §1) ;
- colonnes en `utf8mb3`, sur lesquelles une saisie contenant un emoji échoue ;
- aucun index secondaire, si bien que chaque requête parcourt toute la table `Operation` ;
- drapeaux de compte acceptant `NULL` ;
- montants en `FLOAT`, faux au centime au-delà d'environ 131 000 €.

S'y ajoutent une pagination non déterministe, des listes sans limite, un runner de migrations sans verrou et une dette technique : 131 warnings ESLint, des `any`, du code dupliqué et des dépendances de build vulnérables.

## What Changes

- **Migration `0002` de normalisation** :
  - passage en `ENGINE=InnoDB` de `Operation`, `OperationRecurrente`, `Compte`, `Categorie`, `Banque` et `User` (roadmap sécurité §1) ;
  - conversion en `utf8mb4` ;
  - remplacement des `NULL` des drapeaux de compte, puis passage en `NOT NULL DEFAULT 0` (1 pour `visible`) ;
  - suppression de la clé `UNIQUE IDopRecu`, redondante avec la clé primaire ;
  - ajout des index `Operation(IDcompte, CheckOp, DateOp)`, `Operation(IDcredit)`, `Operation(IDcat)`, `Compte(IDuser)`, `OperationRecurrente(IDcompte)`, `Categorie(IDuser)` et `Credit(IDuser)`.
- **Migration `0003` montants exacts** : **BREAKING (données)** les colonnes de montant passent de `FLOAT` à `DECIMAL(12,2)`. Le pool `mysql2` et le schéma Drizzle restituent des nombres et non des chaînes.
- **Requêtes** :
  - tri de pagination complété par la clé primaire ;
  - limite par défaut sur toutes les listes ;
  - filtres de dates en intervalles (`DateOp >= ? AND DateOp < ?`) au lieu de `MONTH()`/`YEAR()` ;
  - `NATURAL JOIN` remplacés par `JOIN … USING (IDcompte)` ;
  - `management-info` réécrit en 3 requêtes groupées au lieu de 3 par compte ;
  - `%` et `_` échappés dans les filtres `like` ;
  - recherche par montant fondée sur une comparaison numérique.
- **Runner de migrations** :
  - verrou `GET_LOCK` contre les exécutions concurrentes ;
  - `--baseline` refusé sur une base vide ;
  - message explicite en cas d'échec au milieu d'un fichier ;
  - convention « une migration = un changement rejouable ou vérifiable ».
- **Dette technique** :
  - `pnpm lint:check` ramené à 0 warning, puis exécuté en CI en mode strict ;
  - `noImplicitAny` réactivé progressivement ;
  - suppression du code serveur mort (`unprocessable`, `tooManyRequests`, export inutile de `findUserByEmail`) et de la fausse impression d'atomicité (commentaires et `transaction()` documentés) ;
  - unification des routes CRUD explicites et génériques ;
  - suivi des vulnérabilités `node-forge` et `braces`, limitées à l'outillage de build.

## Capabilities

### New Capabilities
- `code-quality` : exigences de qualité vérifiées en CI (lint sans warning, typage strict, audit des dépendances).

### Modified Capabilities
- `api-quality-and-migration` : runner de migrations sûr ; ajout des migrations de normalisation (InnoDB, `utf8mb4`, index, drapeaux `NOT NULL`) et des montants en `DECIMAL`.
- `api-server-foundation` : le schéma Drizzle suit le schéma migré (et non plus seulement la baseline) ; la pagination est déterministe et toute liste est bornée ; les filtres `like` sont échappés.

## Impact

- **Base de données** :
  - verrouillage des tables pendant `0002` et `0003` (`ALTER TABLE`), d'où une fenêtre de maintenance ;
  - sauvegarde obligatoire avant exécution ;
  - procédure dans `docs/db-migrations.md`.
- **Code** :
  - `server/db/{schema,client}.ts` (`decimalNumbers`) ;
  - `server/utils/{crud,filter,stats,errors,users}.ts` ;
  - `server/api/operations/*.get.ts` et `server/api/comptes/management-info.get.ts` ;
  - `scripts/db-migrate.mjs` ;
  - `eslint.config.mjs` et `nuxt.config.ts` (`noImplicitAny`) ;
  - les fichiers `app/**` et `tests/**` qui portent des `any`.
- **Dépendances** : `harden-api-security` est déployé avant ce change et occupe la migration `0001_user_login_security` (lockout, `tokenVersion`) ; il ne dépend plus d'InnoDB (la création d'utilisateur a été retirée de l'API). `fix-recurring-and-credit-calculations` fonctionne avant comme après ce change. La suppression de `User.id` et de `UserCredentials`, devenus inutilisés, fait l'objet de la tâche 5.5.
- **CI** : nouvelle étape `lint:check` sans warning, `type-check` et `pnpm audit --prod`.
