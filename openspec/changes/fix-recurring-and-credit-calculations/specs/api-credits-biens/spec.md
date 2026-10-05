## MODIFIED Requirements

### Requirement: Création d'un crédit et de sa récurrente
À la création d'un crédit, le serveur SHALL créer une `OperationRecurrente` mensuelle nommée `Mensualité <NomCredit>` (`MontantOpRecu = MontantMensuel`, `JourOpRecu=1`, `JourNumOpRecu` = jour de `DateDebut`, `MoisOpRecu` = mois de `DateDebut` (indexé 0), `Frequence=3`, `IDcompte`, `IDcat`, `IDcredit`), puis renseigner `Credit.IDopRecu` avec son identifiant. `DernierDateOpRecu` MUST être initialisé à la dernière échéance théorique antérieure ou égale à aujourd'hui, ou à la veille de `DateDebut` si le crédit démarre dans le futur, de sorte qu'aucune mensualité passée ne soit générée rétroactivement. Tout échec après la création de la récurrente MUST laisser la base sans crédit ni récurrente, y compris lorsque les tables ne sont pas transactionnelles (suppression compensatoire).

#### Scenario: Création
- **WHEN** un crédit de 1 000 € / mois démarrant le 15 mars de l'année suivante est créé
- **THEN** une récurrente `Mensualité <nom>` liée existe avec `JourNumOpRecu=15` et le crédit pointe vers elle

#### Scenario: Crédit démarré dans le passé
- **WHEN** un crédit démarrant le 10 janvier 2022 est créé le 5 octobre 2026
- **THEN** `DernierDateOpRecu` vaut le 10 septembre 2026 et l'auto-génération suivante ne crée aucune mensualité antérieure à octobre 2026

#### Scenario: Échec partiel
- **WHEN** la mise à jour de `Credit.IDopRecu` échoue après la création de la récurrente
- **THEN** ni le crédit ni la récurrente ne sont persistés

### Requirement: Suppression en cascade d'un crédit
À la suppression d'un crédit, le serveur SHALL supprimer l'`OperationRecurrente` associée si elle existe (son absence n'étant pas une erreur), mettre `IDcredit` à `NULL` sur les `Operation` qui le référençaient, puis supprimer le crédit. La récurrente MUST être supprimée avant le crédit, de sorte qu'un échec intermédiaire ne laisse jamais une récurrente active rattachée à un crédit supprimé.

#### Scenario: Suppression
- **WHEN** un crédit avec récurrente et 12 opérations liées est supprimé
- **THEN** la récurrente disparaît, les 12 opérations restent avec `IDcredit` nul

### Requirement: Solde restant et paiements
`GET /api/credits/{id}/remaining-balance` SHALL renvoyer `{ solde, paye, interets }` en simulant l'amortissement à partir de `MontantInitial` et `DateDebut` sur les opérations liées au crédit dont `MontantOp < 0` et `DateOp` est antérieure ou égale à aujourd'hui, triées par `DateOp ASC` : les intérêts courent au taux mensuel `TauxInteret/100/12` pour chaque mois entier écoulé depuis la date de référence précédente (`DateDebut` puis date du paiement précédent), chaque paiement (valeur absolue) couvre d'abord les intérêts courus puis réduit le principal (borné à `[0, solde]`). Les opérations positives (déblocage, remboursement) et futures MUST être ignorées. Les résultats MUST être arrondis à 2 décimales avec un arrondi correct des demi-centimes. `GET /api/credits/{id}/payments` MUST renvoyer les opérations liées triées par `DateOp DESC`. Les deux routes MUST répondre 404 pour un crédit d'un autre utilisateur.

#### Scenario: Crédit sans intérêts
- **WHEN** un crédit de 1 000 € sans taux a 3 paiements passés de -100 €
- **THEN** `{ solde: 700, paye: 300, interets: 0 }`

#### Scenario: Crédit avec intérêts
- **WHEN** un crédit a un taux > 0 et un paiement un mois après `DateDebut`
- **THEN** `interets` > 0 et la part de principal remboursée est inférieure au montant du paiement

#### Scenario: Déblocage des fonds lié au crédit
- **WHEN** une opération de +200 000 € porte l'`IDcredit` du crédit
- **THEN** elle n'est pas comptée et le solde restant n'est pas modifié

#### Scenario: Deux paiements dans le même mois
- **WHEN** une mensualité et un remboursement anticipé sont datés du même mois
- **THEN** les intérêts de ce mois ne sont comptés qu'une fois

#### Scenario: Échéance future
- **WHEN** une mensualité générée par anticipation est datée de dans 10 jours
- **THEN** elle n'est pas déduite du solde

## ADDED Requirements

### Requirement: Propagation des modifications d'un crédit
`PUT /api/credits/{id}` et `PATCH /api/credits/{id}` SHALL répercuter sur l'`OperationRecurrente` liée (`IDopRecu`) les changements de `MontantMensuel` (vers `MontantOpRecu`), `IDcompte`, `IDcat`, `NomCredit` (vers `NomOpRecu = "Mensualité <NomCredit>"`) et du jour de `DateDebut` (vers `JourNumOpRecu`). Les opérations déjà générées MUST rester inchangées. `PATCH /api/credits` (mise à jour en masse) MUST être refusé (4xx).

#### Scenario: Changement de mensualité
- **WHEN** `PATCH /api/credits/{id}` passe `MontantMensuel` de 850 à 900
- **THEN** la récurrente liée a `MontantOpRecu = 900` et les mensualités déjà générées restent à 850

#### Scenario: Changement de compte
- **WHEN** `PUT /api/credits/{id}` change `IDcompte` pour un autre compte de l'utilisateur
- **THEN** les prochaines mensualités sont générées sur le nouveau compte
