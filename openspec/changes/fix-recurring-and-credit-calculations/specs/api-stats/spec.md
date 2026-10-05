## MODIFIED Requirements

### Requirement: Évolution du solde
`GET /api/stats/evolutionSolde` SHALL renvoyer `{ soldeGlobal, soldeRetraite, soldeDispo, global, retraite, dispo }` (soldes actuels et séries journalières pour les trois regroupements de comptes) sans filtre de `Categorie.Type`, de sorte que les soldes correspondent à ceux de la banque. Les requêtes SQL MUST être paramétrées et limitées aux comptes de l'utilisateur. Un drapeau de compte `NULL` (`bloque`, `retraite`, `children`, `porte_feuille`) MUST être interprété comme 0 et ne jamais exclure le compte des regroupements.

#### Scenario: Cohérence avec les agrégats
- **WHEN** l'utilisateur possède des comptes avec opérations de tous types de catégorie
- **THEN** `soldeGlobal` égale la somme des soldes de `sumAllCompteForUser`

#### Scenario: Ancien compte sans drapeau
- **WHEN** un compte de l'utilisateur a `retraite = NULL` et `bloque = NULL`
- **THEN** il est inclus dans `soldeGlobal`, la série `global` et la série `dispo`

### Requirement: Statistiques de dépenses
`GET /api/stats/yearComparison`, `topCategories` et `categoryHeatmap` SHALL considérer les catégories `Type='depense'` ainsi que les sorties non catégorisées (`MontantOp < 0` avec `IDcat` égal à 0, `NULL` ou inexistant), regroupées sous `IDcat = 0` et le libellé `Non catégorisé`. `yearComparison` exige `yearA` et `yearB` (400 `yearA and yearB are required`). Les plages de dates (`from`, `to`) MUST être obligatoires (400 `from and to are required`), au format `YYYY-MM-DD` (400 sinon) et ordonnées (400 `from must be earlier than to`) ; la borne `to` MUST inclure toute la journée. Le paramètre `limit` MUST être borné comme aujourd'hui.

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

#### Scenario: Dépense non catégorisée
- **WHEN** une sortie de -50 € sans catégorie est dans la plage
- **THEN** `topCategories` contient une entrée `Non catégorisé` d'au moins 50 €
