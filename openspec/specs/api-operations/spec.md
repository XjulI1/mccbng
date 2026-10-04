# api-operations Specification

## Purpose
TBD - created by archiving change migrate-back-to-nuxt-server. Update Purpose after archive.
## Requirements
### Requirement: CRUD des opérations par compte
Les routes `/api/operations` SHALL fournir le CRUD standard d'`Operation` avec scoping hérité (`IDcompte ∈ comptes de l'utilisateur`). La création et le remplacement MUST vérifier que l'`IDcompte` appartient à l'utilisateur (404 sinon). Les défauts `CheckOp=false`, `IDcat=0`, `amortissement=false` MUST être conservés. Le filtre doit supporter la pagination (`limit`/`skip`), l'ordre `CheckOp ASC, DateOp DESC`, et la recherche `or` de `like` sur `NomOp` et `MontantOp` couplée à `IDcompte inq`.

#### Scenario: Pointage
- **WHEN** `PATCH /api/operations/{id}` met `CheckOp` à `true` sur une opération de l'utilisateur
- **THEN** la réponse est 204 et la valeur est persistée

#### Scenario: Recherche transverse
- **WHEN** le front cherche « loyer » sur tous ses comptes
- **THEN** seules les opérations de ses comptes dont le nom ou le montant correspond sont renvoyées

### Requirement: Agrégats de soldes
`GET /api/operations/sumAllCompteForUser` SHALL renvoyer, par compte, les totaux pointés/non pointés (`TotalNotChecked`, etc.) sans filtre de catégorie ; `GET /api/operations/sumForACompte?id=` SHALL faire de même pour un compte de l'utilisateur (404 si autre utilisateur). Les clés et arrondis MUST être identiques à l'existant.

#### Scenario: Solde d'un compte
- **WHEN** `GET /api/operations/sumForACompte?id=3` est appelé sur un compte de l'utilisateur
- **THEN** les totaux pointé et non pointé sont renvoyés, toutes catégories confondues

### Requirement: Totaux mensuels de dépenses
`GET /api/operations/sumByUserByMonth?monthNumber&yearNumber&IDCompte` et `GET /api/operations/sumCategoriesByUserByMonth?monthNumber&yearNumber` SHALL ne considérer que les catégories `Type='depense'` et ne couvrir que les comptes de l'utilisateur.

#### Scenario: Exclusion des revenus
- **WHEN** un mois contient des opérations `revenu` et `depense`
- **THEN** seules les `depense` sont additionnées

### Requirement: Suggestion de catégories
`GET /api/operations/suggestCategories?operationName&limit` SHALL classer les catégories par fréquence des opérations passées de l'utilisateur dont le nom correspond (`LIKE`), `limit` par défaut 5 borné à [1, 50], nom d'au moins 2 caractères, sans filtre de `Type`.

#### Scenario: Nom trop court
- **WHEN** `operationName` fait 1 caractère
- **THEN** la liste renvoyée est vide (ou l'erreur actuelle de l'API, à reproduire)

#### Scenario: Limite hors bornes
- **WHEN** `limit=500`
- **THEN** au plus 50 suggestions sont renvoyées

### Requirement: Opérations récurrentes
Les routes `/api/operation-recurrentes` SHALL fournir le CRUD standard d'`OperationRecurrente` avec scoping hérité, vérification de propriété de `IDcompte` à la création/remplacement, et défauts `JourNumOpRecu=1`, `MoisOpRecu=1`, `Frequence=3`, `IDcat=0`.

#### Scenario: Récurrente sur compte d'autrui
- **WHEN** `POST /api/operation-recurrentes` référence le compte d'un autre utilisateur
- **THEN** la réponse est 404

### Requirement: Auto-génération des récurrentes
`POST /api/operation-recurrentes/auto-generation` SHALL, pour chaque récurrente des comptes de l'utilisateur, insérer au plus une `Operation` (non pointée, `IDcredit` repris) puis mettre à jour `DernierDateOpRecu` : `Frequence=3` lorsque `DernierDateOpRecu` date de plus de 15 jours (nouvelle date = +1 mois), `Frequence=7` lorsqu'elle date de plus de 335 jours (+1 an). Elle MUST renvoyer `{}` et rester idempotente tant que le délai n'est pas atteint. La génération MUST être transactionnelle par récurrente.

#### Scenario: Mensuelle échue
- **WHEN** une récurrente mensuelle a un `DernierDateOpRecu` vieux de 20 jours
- **THEN** une opération est créée à la date +1 mois et `DernierDateOpRecu` est mis à jour

#### Scenario: Mensuelle récente
- **WHEN** une récurrente mensuelle a été générée il y a 5 jours
- **THEN** aucune opération n'est créée

#### Scenario: Plusieurs mois de retard
- **WHEN** le dernier traitement date de 3 mois
- **THEN** une seule opération est générée par appel (comportement actuel conservé et documenté ; les appels suivants rattrapent le retard)

