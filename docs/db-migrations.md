# Migrations de base de données

Depuis la migration de l'API dans Nuxt (`server/`), le schéma MySQL est géré par des fichiers SQL versionnés
(`server/db/migrations/*.sql`), appliqués dans l'ordre alphabétique par `scripts/db-migrate.mjs`.
L'auto-migration LoopBack (`pnpm migrate`, `--rebuild`) n'existe plus.

La table de suivi `__migrations` (`name`, `applied_at`) mémorise les fichiers déjà joués.

## Configuration

Les scripts qui modifient la base (`db-migrate.mjs`, `hash-legacy-secrets.mjs`) lisent `DB_HOST`, `DB_PORT`,
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

1. Créer `server/db/migrations/0001_<description>.sql` (numéro suivant, SQL pur, rejouable de préférence).
2. Mettre à jour `server/db/schema.ts` si les tables ou colonnes changent.
3. Lancer `db:migrate` sur chaque environnement au moment du déploiement, **avant** de démarrer la nouvelle image.

Les migrations ne sont jamais jouées automatiquement au démarrage du serveur (évite les exécutions concurrentes).

## Particularités du schéma de production

- Tables **MyISAM** : `Banque`, `Categorie`, `Compte`, `Operation`, `OperationRecurrente`, `User` (pas de transactions).
  `Bien`, `Credit`, `Stats`, `UserCredentials` sont InnoDB. Convertir en InnoDB (`ALTER TABLE … ENGINE=InnoDB`)
  serait une migration utile, hors périmètre de la migration d'API.
- `User` : clé primaire `IDuser` (non auto-incrémenté).
- Les défauts SQL ne reprennent pas ceux des anciens modèles LoopBack : l'API applique ses propres défauts.
