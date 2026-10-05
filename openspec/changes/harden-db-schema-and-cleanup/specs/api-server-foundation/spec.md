## MODIFIED Requirements

### Requirement: Schéma Drizzle fidèle à la base existante
Les tables `User`, `Banque`, `Compte`, `Operation`, `OperationRecurrente`, `Categorie`, `Credit` et `Bien` SHALL être décrites en TypeScript avec exactement les noms de tables, colonnes, types, nullabilités, valeurs par défaut et index du schéma obtenu après application de toutes les migrations versionnées (`DECIMAL` pour les montants, le taux et la surface, `ENUM` pour `Categorie.Type`, drapeaux de compte `NOT NULL`, colonnes et tables legacy absentes). Les valeurs `DECIMAL` MUST être lues comme des nombres, et les montants renvoyés arrondis à 2 décimales aux endroits où LoopBack le faisait.

#### Scenario: Lecture d'une opération
- **WHEN** une opération existante est lue via `GET /api/operations/{id}`
- **THEN** ses champs (`IDop`, `NomOp`, `MontantOp`, `DateOp`, `CheckOp`, `IDcompte`, `IDcat`, `amortissement`, `IDcredit`) ont les mêmes noms et types JSON qu'avant

#### Scenario: Schéma aligné sur les migrations
- **WHEN** les migrations sont appliquées sur une base vide et le schéma Drizzle est comparé à `information_schema`
- **THEN** les tables, colonnes, types, nullabilités et défauts correspondent
