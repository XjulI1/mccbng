# api-stats Specification

## Purpose
TBD - created by archiving change migrate-back-to-nuxt-server. Update Purpose after archive.
## Requirements
### Requirement: Évolution du solde
`GET /api/stats/evolutionSolde` SHALL renvoyer `{ soldeGlobal, soldeRetraite, soldeDispo, global, retraite, dispo }`, c'est-à-dire les soldes actuels et les séries journalières pour les trois regroupements de comptes. Les soldes actuels sont la somme des soldes d'ouverture (`Compte.solde`) du regroupement ; les séries sont les sommes journalières des opérations, que le front cumule à partir de ce solde. Ces valeurs sont calculées sans filtre de `Categorie.Type`, de sorte que les soldes correspondent à ceux de la banque. Les regroupements MUST être :
- `global` : comptes avec `retraite = 0` et `children = 0` ;
- `retraite` : comptes avec `retraite = 1` ;
- `dispo` : comptes avec `retraite = 0`, `children = 0` et `bloque = 0` (sous-ensemble de `global`).

Les requêtes SQL MUST être paramétrées et limitées aux comptes de l'utilisateur. Un drapeau de compte `NULL` (`bloque`, `retraite`, `children`, `porte_feuille`) MUST être interprété comme 0 et ne jamais exclure le compte des regroupements.

#### Scenario: Cohérence avec les agrégats
- **WHEN** l'utilisateur possède des comptes, dont un compte retraite et un compte enfant, avec opérations de tous types de catégorie
- **THEN** `soldeGlobal` égale la somme des soldes d'ouverture des comptes ni retraite ni enfant, et la série `global` totalise toutes leurs opérations, toutes catégories confondues

#### Scenario: Ancien compte sans drapeau
- **WHEN** un compte de l'utilisateur a `retraite = NULL` et `bloque = NULL`
- **THEN** il est inclus dans `soldeGlobal`, la série `global` et la série `dispo`

#### Scenario: Compte retraite non bloqué
- **WHEN** un compte de l'utilisateur a `retraite = 1` et `bloque = 0`
- **THEN** il est inclus dans `soldeRetraite` et la série `retraite`, mais ni dans `soldeDispo` ni dans la série `dispo`

#### Scenario: Compte enfant non bloqué
- **WHEN** un compte de l'utilisateur a `children = 1` et `bloque = 0`
- **THEN** il n'est inclus ni dans `global` ni dans `dispo`

### Requirement: Statistiques de dépenses
`GET /api/stats/yearComparison`, `topCategories`, `categoryHeatmap`, `incomeVsExpense` (série `expense`) et `topOperations` SHALL appliquer la même règle que les totaux mensuels : une opération compte selon le `Type` de sa catégorie, entrées comme sorties (`depense` en dépense, `revenu` en revenu pour `incomeVsExpense` et `topOperations`), et les transferts sont exclus. Il n'existe pas d'opération sans catégorie : `IDcat = 0` est la catégorie partagée par défaut « Aucune » (`Type='depense'`), comptée comme les autres. Aucune opération d'une catégorie de dépense ou de revenu MUST être masquée. `yearComparison` exige `yearA` et `yearB` (400 `yearA and yearB are required`). Les plages de dates (`from`, `to`) MUST être :
- obligatoires (400 `from and to are required`) ;
- au format `YYYY-MM-DD` (400 sinon) ;
- ordonnées (400 `from must be earlier than to`).

La borne `to` MUST inclure toute la journée. Le paramètre `limit` MUST être borné comme aujourd'hui.

#### Scenario: Années manquantes
- **WHEN** `yearComparison` est appelé sans `yearB`
- **THEN** la réponse est 400

#### Scenario: Plage inversée
- **WHEN** `from` est postérieur à `to`
- **THEN** la réponse est 400 `from must be earlier than to`

#### Scenario: Date invalide
- **WHEN** `from=2026-13-45`
- **THEN** la réponse est 400

#### Scenario: Borne de fin inclusive
- **WHEN** `to=2026-10-05` et une opération est datée du 5 octobre 2026 à 14 h
- **THEN** elle est incluse

#### Scenario: Catégorie « Aucune »
- **WHEN** des opérations de la plage sont en catégorie « Aucune » (`IDcat = 0`)
- **THEN** `topCategories` et `categoryHeatmap` les présentent sous le libellé `Aucune`, et `topOperations` les inclut

#### Scenario: Cohérence entre graphiques
- **WHEN** un mois contient des dépenses dans plusieurs catégories, dont une entrée en catégorie « Aucune »
- **THEN** la série `expense` de `incomeVsExpense`, `yearComparison`, `sumByUserByMonth` et la somme de `sumCategoriesByUserByMonth` donnent le même total pour ce mois

### Requirement: Revenus contre dépenses
`GET /api/stats/incomeVsExpense` SHALL regrouper par `Categorie.Type` (et non par signe de `MontantOp`) sur `Type IN ('depense','revenu')`, de sorte qu'un remboursement catégorisé en `depense` vienne en déduction de la dépense.

#### Scenario: Remboursement
- **WHEN** un remboursement positif est rangé dans une catégorie `depense`
- **THEN** il réduit le total des dépenses et n'augmente pas les revenus

### Requirement: Plus grosses opérations
`GET /api/stats/topOperations` SHALL renvoyer les plus grosses opérations des comptes de l'utilisateur avec `Type IN ('depense','revenu')` (transferts exclus), triées comme aujourd'hui.

#### Scenario: Transferts exclus
- **WHEN** un transfert de 5 000 € existe
- **THEN** il n'apparaît pas dans `topOperations`

### Requirement: Isolation des statistiques
Toutes les routes `/api/stats/*` SHALL exclure les données d'autres utilisateurs et répondre 401 sans JWT valide.

#### Scenario: Deux utilisateurs
- **WHEN** A et B ont des opérations
- **THEN** les statistiques de A ne contiennent aucune opération de B

