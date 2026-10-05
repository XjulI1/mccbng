# api-credits-biens Specification

## Purpose
TBD - created by archiving change migrate-back-to-nuxt-server. Update Purpose after archive.
## Requirements
### Requirement: CRUD des crédits
Les routes `/api/credits` SHALL fournir le CRUD standard de `Credit` scopé par `IDuser`. La création et le remplacement MUST vérifier que `IDcompte` appartient à l'utilisateur (404 sinon) ; `IDcredit`, `IDopRecu` et `IDuser` fournis par le client MUST être ignorés. Défauts : `Statut='actif'`, `IDcat=0`.

#### Scenario: Compte d'autrui
- **WHEN** `POST /api/credits` référence un `IDcompte` d'un autre utilisateur
- **THEN** la réponse est 404 `Compte <id> not found`

### Requirement: Création d'un crédit et de sa récurrente
À la création d'un crédit, le serveur SHALL créer une `OperationRecurrente` mensuelle nommée `Mensualité <NomCredit>` (`MontantOpRecu = MontantMensuel`, `JourOpRecu=1`, `JourNumOpRecu` = jour de `DateDebut`, `MoisOpRecu` = mois de `DateDebut` (indexé 0), `Frequence=3`, `IDcompte`, `IDcat`, `IDcredit`), puis renseigner `Credit.IDopRecu` avec son identifiant. `DernierDateOpRecu` MUST être initialisé à l'échéance théorique qui précède la première échéance postérieure ou égale à `max(aujourd'hui, DateDebut)`. Ainsi, la première mensualité d'un crédit futur est celle de `DateDebut`, et aucune mensualité passée n'est générée rétroactivement. Tout échec après la création de la récurrente MUST laisser la base sans crédit ni récurrente, y compris lorsque les tables ne sont pas transactionnelles (suppression compensatoire).

#### Scenario: Création d'un crédit futur
- **WHEN** un crédit de 1 000 € / mois démarrant le 15 mars de l'année suivante est créé
- **THEN** une récurrente `Mensualité <nom>` liée existe avec `JourNumOpRecu=15` et `DernierDateOpRecu` au 15 février, le crédit pointe vers elle, et la première mensualité générée est datée du 15 mars

#### Scenario: Crédit démarré dans le passé
- **WHEN** un crédit démarrant le 10 janvier 2022 est créé le 5 octobre 2026
- **THEN** `DernierDateOpRecu` vaut le 10 septembre 2026 et l'auto-génération suivante ne crée que la mensualité du 10 octobre 2026, aucune antérieure

#### Scenario: Échec partiel
- **WHEN** la mise à jour de `Credit.IDopRecu` échoue après la création de la récurrente
- **THEN** ni le crédit ni la récurrente ne sont persistés

### Requirement: Suppression en cascade d'un crédit
À la suppression d'un crédit, le serveur SHALL supprimer l'`OperationRecurrente` associée si elle existe (son absence n'étant pas une erreur), mettre `IDcredit` à `NULL` sur les `Operation` qui le référençaient, puis supprimer le crédit. La récurrente MUST être supprimée avant le crédit, de sorte qu'un échec intermédiaire ne laisse jamais une récurrente active rattachée à un crédit supprimé.

#### Scenario: Suppression
- **WHEN** un crédit avec récurrente et 12 opérations liées est supprimé
- **THEN** la récurrente disparaît, les 12 opérations restent avec `IDcredit` nul

### Requirement: Solde restant et paiements
`GET /api/credits/{id}/remaining-balance` SHALL renvoyer `{ solde, paye, interets }` en simulant l'amortissement à partir de `MontantInitial` et `DateDebut`. La simulation porte sur les opérations liées au crédit dont `MontantOp < 0` et dont `DateOp` est antérieure ou égale à aujourd'hui, triées par `DateOp ASC`.
- Les intérêts courent au taux mensuel `TauxInteret/100/12` pour chaque **mois civil** écoulé entre le mois de référence et le mois du paiement. Le mois de référence est d'abord celui qui précède le premier paiement (la première échéance couvre un mois d'intérêts, comme dans un tableau d'amortissement bancaire ; les intérêts intercalaires entre `DateDebut` et le début de l'amortissement ne sont pas comptés), puis celui du dernier paiement traité. Le jour du paiement dans le mois n'a pas d'effet ; un mois sans paiement (suspension d'échéances) porte ses intérêts sur l'échéance suivante.
- Chaque paiement (valeur absolue) couvre d'abord les intérêts courus, puis réduit le principal (borné à `[0, solde]`).
- Les opérations positives (déblocage, remboursement) et futures MUST être ignorées.
- Les résultats MUST être arrondis à 2 décimales avec un arrondi correct des demi-centimes.

`GET /api/credits/{id}/payments` MUST renvoyer les opérations liées triées par `DateOp DESC`. Les deux routes MUST répondre 404 pour un crédit d'un autre utilisateur.

#### Scenario: Crédit sans intérêts
- **WHEN** un crédit de 1 000 € sans taux a 3 paiements passés de -100 €
- **THEN** `{ solde: 700, paye: 300, interets: 0 }`

#### Scenario: Première échéance après la signature
- **WHEN** un crédit signé le 28 juillet a sa première échéance le 5 septembre
- **THEN** cette échéance ne porte qu'un mois d'intérêts

#### Scenario: Suspension d'échéances
- **WHEN** aucune mensualité n'est payée pendant trois mois puis les paiements reprennent
- **THEN** l'échéance de reprise porte les intérêts des quatre mois écoulés depuis le paiement précédent

#### Scenario: Crédit avec intérêts
- **WHEN** un crédit a un taux > 0 et un paiement
- **THEN** `interets` > 0 et la part de principal remboursée est inférieure au montant du paiement

#### Scenario: Prélèvement avancé d'un jour
- **WHEN** un crédit démarre le 10 janvier et ses paiements sont datés du 9 février puis du 10 mars
- **THEN** exactement deux mois d'intérêts sont comptés, un par paiement

#### Scenario: Déblocage des fonds lié au crédit
- **WHEN** une opération de +200 000 € porte l'`IDcredit` du crédit
- **THEN** elle n'est pas comptée et le solde restant n'est pas modifié

#### Scenario: Deux paiements dans le même mois
- **WHEN** une mensualité et un remboursement anticipé sont datés du même mois civil
- **THEN** les intérêts de ce mois ne sont comptés qu'une fois

#### Scenario: Échéance future
- **WHEN** une mensualité générée par anticipation est datée de dans 10 jours
- **THEN** elle n'est pas déduite du solde

### Requirement: CRUD des biens
Les routes `/api/biens` SHALL fournir le CRUD standard de `Bien` scopé par `IDuser` (défauts `Usage='principale'`, `FraisAgence=0`, `ApportCash=0`). Lorsqu'un `IDcredit` est fourni (création, PATCH, PUT), le crédit MUST appartenir à l'utilisateur (404 sinon). `IDuser` MUST être forcé à celui du JWT.

#### Scenario: Bien lié au crédit d'autrui
- **WHEN** `POST /api/biens` référence l'`IDcredit` d'un autre utilisateur
- **THEN** la réponse est 404 et aucun bien n'est créé

#### Scenario: Bien sans crédit
- **WHEN** un bien est créé sans `IDcredit`
- **THEN** il est créé avec les valeurs par défaut

### Requirement: Opérations liées à un crédit cloisonnées
`GET /api/credits/{id}/payments` et `GET /api/credits/{id}/remaining-balance` SHALL ne prendre en compte que les opérations liées au crédit (`IDcredit = id`) **et** appartenant aux comptes de l'utilisateur courant. Une opération d'un autre utilisateur portant le même `IDcredit`, par exemple une donnée antérieure au contrôle de propriété, MUST être ignorée.

#### Scenario: Opération étrangère rattachée au crédit
- **WHEN** une opération d'un compte de B porte l'`IDcredit` d'un crédit de A
- **THEN** elle n'apparaît pas dans `payments` du crédit de A et n'entre pas dans son `remaining-balance`

### Requirement: Propagation des modifications d'un crédit
`PUT /api/credits/{id}` et `PATCH /api/credits/{id}` SHALL répercuter sur l'`OperationRecurrente` liée (`IDopRecu`, ou à défaut la récurrente portant l'`IDcredit` du crédit) les seuls champs modifiés parmi les changements de `MontantMensuel` (vers `MontantOpRecu`), `IDcompte`, `IDcat`, `NomCredit` (vers `NomOpRecu = "Mensualité <NomCredit>"`) et du jour de `DateDebut` (vers `JourNumOpRecu`). Lorsque `DateDebut` change et qu'aucune mensualité n'a encore été générée (`DernierDateOpRecu` antérieure à l'ancienne `DateDebut`), `DernierDateOpRecu` MUST être recalculé avec la règle de création appliquée à la nouvelle `DateDebut`. Sinon, il MUST rester inchangé. Les opérations déjà générées MUST rester inchangées. `PATCH /api/credits` (mise à jour en masse) MUST être refusé (405).

#### Scenario: Changement de mensualité
- **WHEN** `PATCH /api/credits/{id}` passe `MontantMensuel` de 850 à 900
- **THEN** la récurrente liée a `MontantOpRecu = 900` et les mensualités déjà générées restent à 850

#### Scenario: Jour de prélèvement différent de DateDebut
- **WHEN** un crédit signé le 28 a sa mensualité au 5 et que seul `MontantMensuel` est modifié
- **THEN** la récurrente garde `JourNumOpRecu = 5`

#### Scenario: Lien IDopRecu cassé
- **WHEN** `Credit.IDopRecu` désigne une récurrente inexistante et que le crédit est modifié puis supprimé
- **THEN** la récurrente portant son `IDcredit` est mise à jour, puis supprimée

#### Scenario: Changement de compte
- **WHEN** `PUT /api/credits/{id}` change `IDcompte` pour un autre compte de l'utilisateur
- **THEN** les prochaines mensualités sont générées sur le nouveau compte

#### Scenario: Report d'un crédit pas encore commencé
- **WHEN** un crédit futur démarrant le 15 mars, sans mensualité générée, est reporté au 20 juin
- **THEN** la récurrente a `JourNumOpRecu = 20` et `DernierDateOpRecu` au 20 mai, et aucune mensualité n'est générée avant le 20 juin

#### Scenario: Changement de date d'un crédit en cours
- **WHEN** `DateDebut` d'un crédit qui a déjà généré des mensualités passe du 10 au 12 du mois
- **THEN** seul `JourNumOpRecu` passe à 12 et `DernierDateOpRecu` est inchangé

