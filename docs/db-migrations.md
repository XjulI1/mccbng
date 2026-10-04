# Migrations de base de données

Depuis la migration de l'API dans Nuxt (`front/server/`), le schéma MySQL est géré par des fichiers SQL versionnés
(`front/server/db/migrations/*.sql`), appliqués dans l'ordre alphabétique par `front/scripts/db-migrate.mjs`.
L'auto-migration LoopBack (`pnpm migrate`, `--rebuild`) n'existe plus.

La table de suivi `__migrations` (`name`, `applied_at`) mémorise les fichiers déjà joués.

## Configuration

```bash
export DB_HOST=… DB_PORT=3306 DB_USER=… DB_PASSWORD=… DB_NAME=…
```

## Commandes

```bash
pnpm --filter @mccbng/front db:migrate              # applique les migrations en attente
pnpm --filter @mccbng/front db:migrate -- --baseline  # marque 0000_baseline comme jouée SANS l'exécuter
```

## Première mise en service sur la base de production existante (baseline)

`0000_baseline.sql` reprend à l'identique le DDL de production (MyISAM / InnoDB, utf8mb3, index, défauts).
La base de production le possède déjà : il ne faut **pas** l'exécuter, seulement l'enregistrer.

1. Sauvegarder la base (`mysqldump`).
2. Lancer **une seule fois** : `pnpm --filter @mccbng/front db:migrate -- --baseline`.
   La commande crée `__migrations` et y inscrit `0000_baseline.sql` ; aucune table métier n'est modifiée.
3. Vérifier : `SELECT * FROM __migrations;` doit lister `0000_baseline.sql`.

Sans `--baseline`, le runner refuse de continuer s'il trouve la table `User` sans suivi de migrations
(protection contre un rejeu accidentel sur une base existante).

## Base vide (développement, CI, nouvelle instance)

`pnpm --filter @mccbng/front db:migrate` (sans option) exécute la baseline puis les migrations suivantes.

## Ajouter une migration

1. Créer `front/server/db/migrations/0001_<description>.sql` (numéro suivant, SQL pur, rejouable de préférence).
2. Mettre à jour `front/server/db/schema.ts` si les tables ou colonnes changent.
3. Lancer `db:migrate` sur chaque environnement au moment du déploiement, **avant** de démarrer la nouvelle image.

Les migrations ne sont jamais jouées automatiquement au démarrage du serveur (évite les exécutions concurrentes).

## Particularités du schéma de production

- Tables **MyISAM** : `Banque`, `Categorie`, `Compte`, `Operation`, `OperationRecurrente`, `User` (pas de transactions).
  `Bien`, `Credit`, `Stats`, `UserCredentials` sont InnoDB. Convertir en InnoDB (`ALTER TABLE … ENGINE=InnoDB`)
  serait une migration utile, hors périmètre de la migration d'API.
- `User` : clé primaire `IDuser` (non auto-incrémenté).
- Les défauts SQL ne reprennent pas ceux des anciens modèles LoopBack : l'API applique ses propres défauts.
