## ADDED Requirements

### Requirement: CRUD des crédits
Les routes `/api/credits` SHALL fournir le CRUD standard de `Credit` scopé par `IDuser`. La création et le remplacement MUST vérifier que `IDcompte` appartient à l'utilisateur (404 sinon) ; `IDcredit`, `IDopRecu` et `IDuser` fournis par le client MUST être ignorés. Défauts : `Statut='actif'`, `IDcat=0`.

#### Scenario: Compte d'autrui
- **WHEN** `POST /api/credits` référence un `IDcompte` d'un autre utilisateur
- **THEN** la réponse est 404 `Compte <id> not found`

### Requirement: Création d'un crédit et de sa récurrente
À la création d'un crédit, le serveur SHALL créer, dans la même transaction, une `OperationRecurrente` mensuelle nommée `Mensualité <NomCredit>` (`MontantOpRecu = MontantMensuel`, `JourOpRecu=1`, `JourNumOpRecu` = jour de `DateDebut`, `MoisOpRecu` = mois de `DateDebut` (indexé 0), `Frequence=3`, `DernierDateOpRecu = DateDebut` en ISO, `IDcompte`, `IDcat`, `IDcredit`), puis renseigner `Credit.IDopRecu` avec son identifiant.

#### Scenario: Création
- **WHEN** un crédit de 1 000 € / mois démarrant le 15 mars est créé
- **THEN** une récurrente `Mensualité <nom>` liée existe avec `JourNumOpRecu=15` et le crédit pointe vers elle

#### Scenario: Échec partiel
- **WHEN** la création de la récurrente échoue
- **THEN** aucun crédit n'est persisté (transaction annulée)

### Requirement: Suppression en cascade d'un crédit
À la suppression d'un crédit, le serveur SHALL supprimer l'`OperationRecurrente` associée si elle existe (son absence n'étant pas une erreur), mettre `IDcredit` à `NULL` sur les `Operation` passées qui le référençaient, puis supprimer le crédit, dans une transaction.

#### Scenario: Suppression
- **WHEN** un crédit avec récurrente et 12 opérations liées est supprimé
- **THEN** la récurrente disparaît, les 12 opérations restent avec `IDcredit` nul

### Requirement: Solde restant et paiements
`GET /api/credits/{id}/remaining-balance` SHALL renvoyer `{ solde, paye, interets }` en simulant l'amortissement sur les opérations liées triées par `DateOp ASC` : taux mensuel `TauxInteret/100/12`, chaque paiement (valeur absolue) couvre d'abord les intérêts de la période puis réduit le principal (borné à `[0, solde]`), résultats arrondis à 2 décimales. `GET /api/credits/{id}/payments` MUST renvoyer les opérations liées triées par `DateOp DESC`. Les deux routes MUST répondre 404 pour un crédit d'un autre utilisateur.

#### Scenario: Crédit sans intérêts
- **WHEN** un crédit de 1 000 € sans taux a 3 paiements de 100 €
- **THEN** `{ solde: 700, paye: 300, interets: 0 }`

#### Scenario: Crédit avec intérêts
- **WHEN** un crédit a un taux > 0 et un paiement
- **THEN** `interets` > 0 et `paye` est inférieur au montant du paiement

### Requirement: CRUD des biens
Les routes `/api/biens` SHALL fournir le CRUD standard de `Bien` scopé par `IDuser` (défauts `Usage='principale'`, `FraisAgence=0`, `ApportCash=0`). Lorsqu'un `IDcredit` est fourni (création, PATCH, PUT), le crédit MUST appartenir à l'utilisateur (404 sinon). `IDuser` MUST être forcé à celui du JWT.

#### Scenario: Bien lié au crédit d'autrui
- **WHEN** `POST /api/biens` référence l'`IDcredit` d'un autre utilisateur
- **THEN** la réponse est 404 et aucun bien n'est créé

#### Scenario: Bien sans crédit
- **WHEN** un bien est créé sans `IDcredit`
- **THEN** il est créé avec les valeurs par défaut
