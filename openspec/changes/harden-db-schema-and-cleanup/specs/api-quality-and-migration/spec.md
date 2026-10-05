## MODIFIED Requirements

### Requirement: Migrations SQL versionnées avec baseline
Le schéma SHALL être géré par des fichiers SQL versionnés dans `server/db/migrations/`, appliqués dans l'ordre par une commande dédiée (`pnpm db:migrate`) qui enregistre les migrations jouées dans une table de suivi. La base de production actuelle MUST être la **baseline** : la migration `0000_baseline` reprend à l'identique le DDL de production (moteurs MyISAM/InnoDB, jeux de caractères et défauts compris), est marquée comme jouée sans être exécutée sur la production, et MUST permettre de recréer le schéma sur une base vide. Les anciennes migrations (`2026-05-02-create-bien.sql`, `2026-05-07-categorie-type.sql`) sont intégrées à la baseline. Aucun mode `--rebuild`/`DROP` MUST exister. La commande MUST prendre un verrou exclusif (`GET_LOCK`) pendant son exécution et échouer explicitement si une autre exécution le détient ; l'option `--baseline` MUST être refusée lorsque le schéma n'existe pas ; un échec pendant l'application d'un fichier MUST nommer le fichier et signaler qu'il peut être partiellement appliqué.

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

## ADDED Requirements

### Requirement: Schéma normalisé
Une migration versionnée SHALL convertir les tables `Operation`, `OperationRecurrente`, `Compte`, `Categorie`, `Banque` et `User` en `InnoDB` et toutes les tables métier en `utf8mb4`, remplacer les valeurs `NULL` des drapeaux de compte (`bloque`, `joint`, `children`, `retraite`, `porte_feuille` → 0, `visible` → 1) puis les déclarer `NOT NULL` avec ces défauts, et créer les index `Operation(IDcompte, CheckOp, DateOp)`, `Operation(IDcredit)`, `Operation(IDcat)`, `Compte(IDuser)`, `OperationRecurrente(IDcompte)`, `Categorie(IDuser)` et `Credit(IDuser)`.

#### Scenario: Transaction effective
- **WHEN** une écriture multi-tables de l'API échoue après sa première instruction
- **THEN** aucune des écritures de la transaction n'est persistée

#### Scenario: Libellé avec emoji
- **WHEN** `POST /api/operations` est appelé avec `NomOp: "Resto 🍕"`
- **THEN** l'opération est créée et relue avec le même libellé

#### Scenario: Index utilisé
- **WHEN** la liste paginée des opérations d'un compte est demandée
- **THEN** le plan d'exécution (`EXPLAIN`) utilise l'index `Operation(IDcompte, CheckOp, DateOp)`

### Requirement: Montants exacts
Une migration versionnée distincte SHALL convertir toutes les colonnes de montant (`Operation`, `OperationRecurrente`, `Compte`, `Credit`, `Bien`) de `FLOAT` en `DECIMAL(12,2)`. L'API MUST continuer de renvoyer ces montants comme des nombres JSON.

#### Scenario: Montant élevé
- **WHEN** un crédit de 150 000,01 € est enregistré puis relu
- **THEN** `MontantInitial` vaut exactement 150000.01

#### Scenario: Type JSON conservé
- **WHEN** une opération est lue via `GET /api/operations/{id}`
- **THEN** `MontantOp` est un nombre JSON et non une chaîne
