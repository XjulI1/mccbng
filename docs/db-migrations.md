# Migrations de base de données

Depuis la migration de l'API dans Nuxt (`server/`), le schéma est géré par des fichiers SQL versionnés
(`server/db/migrations/*.sql`), appliqués dans l'ordre alphabétique par `scripts/db-migrate.mjs`.
Le moteur cible est **MariaDB** (production : MariaDB 10.11 sur le NAS ; tests : `mariadb:10.11`) ; la portabilité MySQL n'est plus visée.
L'auto-migration LoopBack (`pnpm migrate`, `--rebuild`) n'existe plus.

La table de suivi `__migrations` (`name`, `applied_at`) mémorise les fichiers déjà joués.

Le runner :

- prend le verrou `GET_LOCK('mccbng_migrate')` : une seconde exécution concurrente échoue (« Verrou mccbng_migrate déjà pris ») ;
- applique chaque fichier avec le mode SQL `NO_AUTO_VALUE_ON_ZERO`, pour que les clés `AUTO_INCREMENT` à `0`
  (catégorie partagée « Aucune », `IDcat = 0`, et `IDbanque = 0`) survivent aux copies de table des `ALTER TABLE` ;
- en cas d'erreur, nomme le fichier en échec et ne le marque pas comme joué : le DDL n'étant pas transactionnel,
  le fichier peut être partiellement appliqué ; corriger la cause puis relancer (les migrations sont rejouables).

## Configuration

Les scripts qui modifient la base (`db-migrate.mjs`, `hash-legacy-secrets.mjs`, `diagnose-recurrentes.mjs`) lisent `DB_HOST`, `DB_PORT`,
`DB_USER`, `DB_PASSWORD` et `DB_NAME` dans le fichier `.env` de la racine du dépôt (le même que `pnpm dev`).
Les variables déjà définies dans l'environnement sont prioritaires, et `ENV_FILE` permet de viser un autre fichier :

```bash
pnpm db:migrate                               # .env de la racine
ENV_FILE=.env.production pnpm db:migrate      # autre fichier (chemin relatif à la racine, ou absolu)
DB_NAME=mccbng_copie pnpm db:migrate          # une variable passée en ligne de commande l'emporte sur le fichier
```

Le script affiche le fichier chargé (`Configuration lue dans …`) : le vérifier avant toute opération sur la production.

## Commandes

```bash
pnpm db:migrate              # applique les migrations en attente
pnpm db:migrate -- --baseline  # marque 0000_baseline comme jouée SANS l'exécuter
```

## Première mise en service sur la base de production existante (baseline)

`0000_baseline.sql` reprend à l'identique le DDL de production (MyISAM / InnoDB, utf8mb3, index, défauts).
La base de production le possède déjà : il ne faut **pas** l'exécuter, seulement l'enregistrer.

1. Sauvegarder la base (`mysqldump`).
2. Lancer **une seule fois** : `pnpm db:migrate -- --baseline`.
   La commande crée `__migrations` et y inscrit `0000_baseline.sql` ; aucune table métier n'est modifiée.
3. Vérifier : `SELECT * FROM __migrations;` doit lister `0000_baseline.sql`.

Sans `--baseline`, le runner refuse de continuer s'il trouve la table `User` sans suivi de migrations
(protection contre un rejeu accidentel sur une base existante).
À l'inverse, `--baseline` est refusé si la table `User` n'existe pas (base vide).

## Base vide (développement, CI, nouvelle instance)

`pnpm db:migrate` (sans option) exécute la baseline puis les migrations suivantes.

## Contrôles et procédures d'exploitation

Les requêtes de contrôle à lancer avant un déploiement (aucun `User.IDuser ≤ 0`, références `IDcredit` / `IDcat`
croisées entre utilisateurs, `secret_key` en clair) et les procédures phpMyAdmin (création d'utilisateur,
déverrouillage, banques) sont décrites dans [`exploitation.md`](exploitation.md).

```sql
-- Aucun utilisateur ne doit avoir un IDuser ≤ 0 (0 = propriétaire des catégories partagées)
SELECT IDuser, email FROM `User` WHERE IDuser <= 0;
```

## Ajouter une migration

1. Créer `server/db/migrations/NNNN_<description>.sql` (numéro suivant, SQL pur, **rejouable**, voir ci-dessous).
2. Mettre à jour `server/db/schema.ts` si les tables ou colonnes changent.
3. Lancer `db:migrate` sur chaque environnement au moment du déploiement, **avant** de démarrer la nouvelle image.

Les migrations ne sont jamais jouées automatiquement au démarrage du serveur (évite les exécutions concurrentes).

### Convention : migrations rejouables

Toute migration postérieure à la baseline doit pouvoir être relancée après une application complète ou partielle,
sans erreur ni effet supplémentaire (test `tests/api/migrations.spec.ts`, qui rejoue chaque fichier) :

- syntaxe MariaDB `IF [NOT] EXISTS` : `ADD COLUMN IF NOT EXISTS`, `DROP COLUMN IF EXISTS`, `CREATE INDEX IF NOT EXISTS`,
  `DROP INDEX IF EXISTS … ON …`, `DROP TABLE IF EXISTS` ;
- `ENGINE = …`, `CONVERT TO CHARACTER SET …`, `MODIFY …` et `UPDATE … WHERE col IS NULL` sont rejouables par nature ;
- pas de `RENAME` ni d'`INSERT` sans garde (`INSERT IGNORE`, `WHERE NOT EXISTS`).

## Mise en production de 0002 à 0004 (InnoDB, DECIMAL, legacy)

Les trois migrations et la nouvelle image partent dans **une seule fenêtre de maintenance** : l'image qui les accompagne
(`decimalNumbers`, transactions réelles, schéma Drizzle sans colonnes legacy) suppose le schéma migré, et l'image
précédente ne fonctionne plus après `0004`. Le rollback passe donc par la restauration de la sauvegarde.

### Répétition sur une copie (avant la fenêtre)

Sur un poste de développement, avec un dump phpMyAdmin récent (il contient des données personnelles : ne jamais le commiter) :

```bash
docker run -d --name mccbng-copie -e MARIADB_ROOT_PASSWORD=copie -e MARIADB_DATABASE=copie -p 127.0.0.1:33061:3306 mariadb:10.11
docker exec -i mccbng-copie mariadb -uroot -pcopie copie < dump.sql
export DB_HOST=127.0.0.1 DB_PORT=33061 DB_USER=root DB_PASSWORD=copie DB_NAME=copie ENV_FILE=/dev/null

# 1. Aucune collision d'email sous la nouvelle collation (attendu : 0)
docker exec mccbng-copie mariadb -uroot -pcopie copie -e "SELECT COUNT(*) FROM (SELECT CONVERT(email USING utf8mb4) COLLATE utf8mb4_unicode_ci AS e FROM \`User\` GROUP BY e HAVING COUNT(*) > 1) t"
# 2. Instantané des montants agrégés, migrations (durée), comparaison
node scripts/check-amounts.mjs --save avant.json
time node scripts/db-migrate.mjs
node scripts/check-amounts.mjs --compare avant.json
# 3. Clés 0 conservées (attendu : une ligne chacune)
docker exec mccbng-copie mariadb -uroot -pcopie copie -e "SELECT IDcat, Nom FROM Categorie WHERE IDcat = 0; SELECT IDbanque FROM Banque WHERE IDbanque = 0"
docker rm -f mccbng-copie
```

`check-amounts` ne signale que les écarts d'au moins un demi-centime : ce sont les montants saisis avec plus de
2 décimales, arrondis au centime par `0003` (accepté). Répétition du 2026-10-05 sur le dump de production :
aucune collision, migrations en 0,2 s, un seul écart (1 centime sur le compte 1, opérations 743 et 744 à 3 décimales),
clés 0 conservées, réponses de l'API identiques avant et après hors ordre des ex aequo.

### Fenêtre de maintenance

1. Arrêter le conteneur de l'application.
2. Sauvegarde complète : `mysqldump --single-transaction --routines --triggers <base> > avant-0002.sql` (ou export phpMyAdmin complet).
3. `pnpm db:migrate` avec la configuration de production (vérifier la ligne `Configuration lue dans …`).
   Attendu : `applique 0002…`, `applique 0003…`, `applique 0004…`.
4. Déployer la nouvelle image et redémarrer.
5. Recette : connexion, liste d'un compte, virement entre deux comptes, création puis suppression d'un crédit de test,
   onglet Stats ; `SELECT COUNT(*) FROM Operation WHERE IDcat = 0` inchangé.

### Rollback

Arrêter l'application, restaurer la sauvegarde (`mariadb <base> < avant-0002.sql`), redéployer l'image précédente.
Pour revenir sur `0002` seule (avant `0003` et `0004`), les `ALTER` inverses sont :

```sql
DROP INDEX IF EXISTS idx_operation_compte_check_date ON Operation; -- … et les 7 autres index de 0002
ALTER TABLE OperationRecurrente ADD UNIQUE KEY IDopRecu (IDopRecu);
ALTER TABLE Compte MODIFY bloque tinyint(1) DEFAULT NULL, MODIFY porte_feuille tinyint(1) DEFAULT NULL,
  MODIFY visible tinyint(1) DEFAULT NULL, MODIFY retraite tinyint(1) DEFAULT NULL;
-- Pour chaque table convertie (avec SET SESSION sql_mode = 'NO_AUTO_VALUE_ON_ZERO') :
ALTER TABLE Operation ENGINE = MyISAM, CONVERT TO CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;
```

Un retour en `utf8mb3` échoue si un libellé contient un emoji : préférer la restauration.

## Particularités du schéma de production

- Avant `0002_innodb_utf8mb4_indexes` : tables **MyISAM** (`Banque`, `Categorie`, `Compte`, `Operation`,
  `OperationRecurrente`, `User`, sans transactions) et colonnes `utf8mb3`. Après : InnoDB et `utf8mb4_unicode_ci` partout.
- Après `0003_decimal_columns` : plus aucun `FLOAT` (montants `DECIMAL(12,2)`, `TauxInteret` `DECIMAL(6,3)`,
  `Surface` `DECIMAL(8,2)`), lus comme des nombres (`decimalNumbers` côté `mysql2`).
- Après `0004_drop_legacy` : plus de tables `Stats` ni `UserCredentials`, plus de colonnes `User.id`, `realm`,
  `emailVerified`, `verificationToken`.
- `Categorie` et `Banque` contiennent une ligne de clé `0` (catégorie partagée « Aucune ») : toute copie ou
  restauration doit se faire avec `NO_AUTO_VALUE_ON_ZERO` (les dumps phpMyAdmin et `mysqldump` le positionnent).
- `User` : clé primaire `IDuser` (non auto-incrémenté).
- Les défauts SQL ne reprennent pas ceux des anciens modèles LoopBack : l'API applique ses propres défauts.
