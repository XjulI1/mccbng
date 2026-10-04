## ADDED Requirements

### Requirement: Évolution du solde
`GET /api/stats/evolutionSolde` SHALL renvoyer `{ soldeGlobal, soldeRetraite, soldeDispo, global, retraite, dispo }` (soldes actuels et séries journalières pour les trois regroupements de comptes) sans filtre de `Categorie.Type`, de sorte que les soldes correspondent à ceux de la banque. Les requêtes SQL MUST être paramétrées et limitées aux comptes de l'utilisateur.

#### Scenario: Cohérence avec les agrégats
- **WHEN** l'utilisateur possède des comptes avec opérations de tous types de catégorie
- **THEN** `soldeGlobal` égale la somme des soldes de `sumAllCompteForUser`

### Requirement: Statistiques de dépenses
`GET /api/stats/yearComparison`, `topCategories` et `categoryHeatmap` SHALL ne considérer que les catégories `Type='depense'`. `yearComparison` exige `yearA` et `yearB` (400 `yearA and yearB are required`). Les plages de dates (`from`, `to`) MUST être obligatoires (400 `from and to are required`) et ordonnées (400 `from must be earlier than to`). Le paramètre `limit` MUST être borné comme aujourd'hui.

#### Scenario: Années manquantes
- **WHEN** `yearComparison` est appelé sans `yearB`
- **THEN** la réponse est 400

#### Scenario: Plage inversée
- **WHEN** `from` est postérieur à `to`
- **THEN** la réponse est 400 `from must be earlier than to`

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
