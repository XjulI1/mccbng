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
À la création d'un crédit, le serveur SHALL créer une `OperationRecurrente` mensuelle nommée `Mensualité <NomCredit>` (`MontantOpRecu = MontantMensuel`, `JourOpRecu=1`, `JourNumOpRecu` = jour de `DateDebut`, `MoisOpRecu` = mois de `DateDebut` (indexé 0), `Frequence=3`, `IDcompte`, `IDcat`, `IDcredit`), puis renseigner `Credit.IDopRecu` avec son identifiant. `DernierDateOpRecu` MUST être initialisé à l'échéance théorique qui précède la première échéance postérieure ou égale à `max(aujourd'hui, DateDebut)`. Ainsi, la première mensualité d'un crédit futur est celle de `DateDebut`, et aucune mensualité passée n'est générée rétroactivement. Ces écritures MUST s'exécuter dans une même transaction : tout échec MUST laisser la base sans crédit ni récurrente.

#### Scenario: Création d'un crédit futur
- **WHEN** un crédit de 1 000 € / mois démarrant le 15 mars de l'année suivante est créé
- **THEN** une récurrente `Mensualité <nom>` liée existe avec `JourNumOpRecu=15` et `DernierDateOpRecu` au 15 février, le crédit pointe vers elle, et la première mensualité générée est datée du 15 mars

#### Scenario: Crédit démarré dans le passé
- **WHEN** un crédit démarrant le 10 janvier 2022 est créé le 5 octobre 2026
- **THEN** `DernierDateOpRecu` vaut le 10 septembre 2026 et l'auto-génération suivante ne crée que la mensualité du 10 octobre 2026, aucune antérieure

#### Scenario: Échec partiel
- **WHEN** la mise à jour de `Credit.IDopRecu` échoue après la création de la récurrente
- **THEN** la transaction est annulée : ni le crédit ni la récurrente ne sont persistés

### Requirement: Suppression en cascade d'un crédit
À la suppression d'un crédit, le serveur SHALL supprimer l'`OperationRecurrente` associée si elle existe (son absence n'étant pas une erreur), mettre `IDcredit` à `NULL` sur les `Operation` et sur le `Bien` qui le référençaient, puis supprimer le crédit. La récurrente MUST être supprimée avant le crédit, de sorte qu'un échec intermédiaire ne laisse jamais une récurrente active rattachée à un crédit supprimé.

#### Scenario: Suppression
- **WHEN** un crédit avec récurrente et 12 opérations liées est supprimé
- **THEN** la récurrente disparaît, les 12 opérations restent avec `IDcredit` nul

#### Scenario: Suppression du crédit d'un bien
- **WHEN** le crédit qui finance un bien est supprimé
- **THEN** le bien reste, avec `IDcredit` nul, et peut toujours être modifié

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
Les routes `/api/biens` SHALL fournir le CRUD standard de `Bien` scopé par `IDuser` (défauts `Usage='principale'`, `FraisAgence=0`, `ApportCash=0`). Un `IDcredit` à `0` ou vide MUST être enregistré comme `NULL`, et toute autre valeur MUST être un entier positif (4xx sans écriture sinon). Lorsqu'un `IDcredit` est fourni (création, PATCH, PUT), le crédit MUST appartenir à l'utilisateur (404 sinon). Un crédit finance au plus un bien : un `IDcredit` déjà porté par un autre bien de l'utilisateur MUST être refusé (409 sans écriture), seuls les biens de l'utilisateur étant consultés, le bien qui le porte déjà pouvant être réenregistré. Le `PATCH` en masse (`PATCH /api/biens`) MUST être refusé (405). `IDuser` MUST être forcé à celui du JWT.

`LoyerMensuel` (loyer mensuel attendu, hors charges) est facultatif et nullable. Lorsqu'il est fourni, il MUST être un nombre positif ou nul (4xx sans écriture sinon).

`AbattementCharges` (part des charges incluses dans les loyers perçus, en %) est facultatif et nullable. Lorsqu'il est fourni, il MUST être compris entre 0 et 100 (4xx sans écriture sinon). Nul vaut 0.

`DateMiseEnLocation` (date de début de la location) est facultative et nullable. Lorsqu'elle est fournie, elle MUST être une date valide (4xx sans écriture sinon).

Un `PUT` qui omet `LoyerMensuel`, `AbattementCharges` ou `DateMiseEnLocation` MUST conserver leur valeur, pour qu'un client antérieur à ces colonnes ne les efface pas ; `null` les efface.

À la suppression d'un bien, le serveur SHALL remettre `IDbien` à `NULL` sur les `Operation` et `OperationRecurrente` qui le référençaient, puis supprimer le bien, dans une même transaction.

#### Scenario: Bien lié au crédit d'autrui
- **WHEN** `POST /api/biens` référence l'`IDcredit` d'un autre utilisateur
- **THEN** la réponse est 404 et aucun bien n'est créé

#### Scenario: Crédit déjà affecté à un autre bien
- **WHEN** `POST /api/biens`, `PUT` ou `PATCH /api/biens/{id}` donne à un bien l'`IDcredit` d'un crédit qui finance déjà un autre bien
- **THEN** la réponse est 409 et rien n'est écrit

#### Scenario: Réenregistrement du bien financé
- **WHEN** `PUT /api/biens/{id}` renvoie l'`IDcredit` que le bien porte déjà
- **THEN** la réponse est 204

#### Scenario: Bien sans crédit
- **WHEN** un bien est créé sans `IDcredit`
- **THEN** il est créé avec les valeurs par défaut et `LoyerMensuel` nul

#### Scenario: Loyer attendu
- **WHEN** `PATCH /api/biens/{id}` envoie `LoyerMensuel: 650`
- **THEN** la réponse est 204 et `GET /api/biens/{id}` renvoie `LoyerMensuel: 650`

#### Scenario: Loyer attendu négatif
- **WHEN** `PATCH /api/biens/{id}` envoie `LoyerMensuel: -10`
- **THEN** la réponse est 4xx et le bien est inchangé

#### Scenario: Date de mise en location
- **WHEN** `PATCH /api/biens/{id}` envoie `DateMiseEnLocation: '2021-08-01'`
- **THEN** la réponse est 204 et `GET /api/biens/{id}` renvoie cette date

#### Scenario: PUT d'un client antérieur
- **WHEN** `PUT /api/biens/{id}` remplace un bien loué sans envoyer `LoyerMensuel`, `AbattementCharges` ni `DateMiseEnLocation`
- **THEN** ces trois valeurs sont conservées

#### Scenario: Abattement hors bornes
- **WHEN** `PATCH /api/biens/{id}` envoie `AbattementCharges: 120`
- **THEN** la réponse est 4xx et le bien est inchangé

#### Scenario: Suppression d'un bien loué
- **WHEN** un bien référencé par une récurrente « Loyer » et 12 opérations est supprimé
- **THEN** la récurrente et les 12 opérations restent, avec `IDbien` nul

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

### Requirement: Flux d'un bien et période de calcul
Les routes de rentabilité SHALL ne prendre en compte que les opérations des comptes de l'utilisateur courant, datées d'aujourd'hui ou avant (une échéance générée par anticipation est ignorée), classées ainsi :
- une opération dont `IDcredit` est renseigné (ni `NULL` ni `0`, qui valent absence de crédit) n'est jamais un loyer ni une charge ;
- une opération liée au bien (`IDbien`) sans `IDcredit` est un **loyer** si `MontantOp > 0`, une **charge** (en valeur absolue) si `MontantOp < 0` ;
- une opération liée au crédit (`IDcredit`) est une **mensualité** (en valeur absolue) si `MontantOp < 0` ; une opération positive liée au crédit (déblocage, remboursement) est ignorée.

La **période** est la durée de la location : elle va du mois de début de la location au dernier mois civil complet (le mois courant est exclu), sans limite de durée. Le début de la location suit la même règle pour un bien et pour un crédit : c'est le mois de la `DateMiseEnLocation` (pour un crédit, celle du bien qu'il finance), et à défaut le mois du premier loyer. Les charges et les mensualités ne fixent jamais ce début. Sans date ni loyer, la location n'a pas commencé.

Les opérations antérieures au début de la location (usage personnel, achat) n'entrent pas dans la période, mais restent dans le cumul. La période est renvoyée sous la forme `{ debut, fin, mois }` : `debut` et `fin` au format `AAAA-MM` (inclus), `mois` le nombre de mois de la période ; lorsque `mois = 0` (location pas encore commencée, ou commencée ce mois-ci), `debut` et `fin` valent `null` et les moyennes et ratios de la période valent `null`. Le **cumul** porte sur toutes les opérations prises en compte, sans borne de début.

Les montants MUST être arrondis à 2 décimales avec un arrondi correct des demi-centimes, les ratios exprimés en pourcentage et arrondis à 2 décimales. Un ratio ou une moyenne dont le dénominateur est nul MUST valoir `null`.

#### Scenario: Échéance anticipée
- **WHEN** un loyer généré par anticipation est daté de dans 5 jours
- **THEN** il n'entre ni dans la période ni dans le cumul

#### Scenario: Mois courant exclu de la période
- **WHEN** nous sommes le 20 octobre 2026 et qu'un loyer a été perçu le 5 octobre 2026
- **THEN** la période s'arrête à `2026-09` et ce loyer n'est compté que dans le cumul

#### Scenario: Location récente
- **WHEN** nous sommes le 20 octobre 2026 et que le premier loyer lié au bien date du 5 juillet 2026
- **THEN** la période vaut `{ debut: '2026-07', fin: '2026-09', mois: 3 }`

#### Scenario: Ancien logement principal mis en location
- **WHEN** nous sommes le 20 octobre 2026, qu'un bien acheté en 2015 et occupé jusqu'en 2021 a `DateMiseEnLocation = 2021-08-01`, et que des dépenses et des entrées de 2015 à 2021 lui sont liées
- **THEN** la période vaut `{ debut: '2021-08', fin: '2026-09', mois: 62 }`, et les opérations de 2015 à 2021 ne sont comptées que dans le cumul

#### Scenario: Charges avant le premier loyer
- **WHEN** nous sommes le 20 octobre 2026, qu'un bien sans `DateMiseEnLocation` a une facture de travaux liée en avril 2026, puis des loyers de 650 € de juillet à septembre, et que son crédit est remboursé depuis avril
- **THEN** la rentabilité du bien et celle du crédit ont toutes deux la période `{ debut: '2026-07', fin: '2026-09', mois: 3 }` et un `loyerMensuelMoyen` de 650 ; les travaux ne sont comptés que dans le cumul

#### Scenario: Location pas encore commencée
- **WHEN** un bien sans `DateMiseEnLocation` n'a encore que des charges liées et un `LoyerMensuel` de 650, et que son crédit a déjà des mensualités
- **THEN** la rentabilité du bien et celle du crédit renvoient `periode.mois = 0`, `loyerMensuelMoyen = null`, et leurs valeurs `attendu`

#### Scenario: Location de plus de 12 mois
- **WHEN** un bien est loué depuis 3 ans, sans `DateMiseEnLocation`, et que son premier loyer lié date d'il y a 36 mois
- **THEN** la période couvre les 36 mois et non les 12 derniers

#### Scenario: Déblocage rattaché au bien
- **WHEN** une opération de +150 000 € porte l'`IDcredit` du crédit et l'`IDbien` du bien
- **THEN** elle n'est comptée ni comme loyer, ni comme mensualité

#### Scenario: Loyer historique à IDcredit = 0
- **WHEN** un loyer lié au bien porte `IDcredit = 0` (donnée historique)
- **THEN** il est compté comme un loyer

#### Scenario: Opération d'un autre utilisateur
- **WHEN** une opération d'un compte de B porte l'`IDbien` d'un bien de A
- **THEN** elle n'entre dans aucun calcul de rentabilité de A

### Requirement: Rentabilité d'un bien
`GET /api/biens/{id}/rentabilite` SHALL renvoyer, pour un bien de l'utilisateur et selon les règles de flux et de période :

```
{
  periode: { debut, fin, mois },
  loyers, charges,
  loyerMensuelMoyen,
  attendu: { loyerMensuel },
  cumul: { loyers, charges },
  bilan: { plusValue, loyersNets, interets, gainTotal, mensualites, partCreditLoyers }
}
```

- `loyerMensuelMoyen` = `loyers × (1 − AbattementCharges / 100) / mois` : le loyer moyen hors charges sur la durée de la location ;
- `attendu.loyerMensuel` = `LoyerMensuel` du bien, `null` s'il n'est pas renseigné.

La route ne calcule aucun rendement. Les mensualités du crédit lié n'entrent pas dans les loyers et charges.

`bilan` est le bilan de l'investissement depuis l'achat :
- `plusValue` = `ValeurActuelle − prixTotal`, avec `prixTotal = PrixBienNu + FraisNotaire + FraisAgence` (`FraisAgence` nul compté 0), et 0 si `ValeurActuelle` est nul ou vaut 0 (non renseigné, comme sur la carte du bien) ;
- `loyersNets` = `cumul.loyers − cumul.charges` ;
- `interets` = intérêts versés sur le crédit lié, calculés comme `remaining-balance` ; 0 sans crédit lié ;
- `gainTotal` = `plusValue + loyersNets − interets` ;
- `mensualites` = mensualités payées sur le crédit lié (sorties passées, en valeur absolue) ; `null` sans crédit lié ;
- `partCreditLoyers` = `cumul.loyers × (1 − AbattementCharges / 100) / mensualites × 100` ; `null` sans crédit lié ou sans mensualité payée. L'abattement retire des loyers perçus, saisis charges comprises, la part qui rembourse des charges : il ne s'applique qu'à ce ratio, jamais à `loyersNets` ni à `gainTotal`, qui reposent sur l'argent réellement encaissé et payé.

Un `IDcredit` qui ne désigne pas un crédit de l'utilisateur est traité comme une absence de crédit. La route MUST répondre 404 pour un bien d'un autre utilisateur ou inexistant.

#### Scenario: Bien loué toute l'année
- **WHEN** un bien de 150 000 € + 10 000 € de frais de notaire a reçu un loyer de +650 € chaque mois des 12 derniers mois civils et une taxe foncière de -840 € liée au bien
- **THEN** la route renvoie `loyers: 7800`, `charges: 840` et `loyerMensuelMoyen: 650`

#### Scenario: Bien sans opération liée
- **WHEN** un bien a `LoyerMensuel = 650`, un prix total de 160 000 € et aucune opération liée
- **THEN** `periode.mois` vaut 0, `loyerMensuelMoyen` vaut `null` et `attendu` vaut `{ loyerMensuel: 650 }`

#### Scenario: Mensualité liée au bien
- **WHEN** une mensualité de -830 € porte l'`IDcredit` du crédit et l'`IDbien` du bien
- **THEN** elle n'est pas comptée dans les charges du bien

#### Scenario: Bilan d'un bien loué à crédit
- **WHEN** un bien de prix total 160 000 €, estimé 185 000 €, seul sur son crédit, a perçu 46 800 € de loyers et payé 5 000 € de charges, et que le crédit a reçu 59 760 € de mensualités dont 18 000 € d'intérêts
- **THEN** `bilan` vaut `{ plusValue: 25000, loyersNets: 41800, interets: 18000, gainTotal: 48800, mensualites: 59760, partCreditLoyers: 78.31 }`

#### Scenario: Intérêts identiques au restant dû
- **WHEN** un bien est financé par un crédit
- **THEN** `bilan.interets` est égal à `interets` renvoyé par `GET /api/credits/{id}/remaining-balance`

#### Scenario: Bilan avec abattement pour charges
- **WHEN** le bien de l'exemple précédent a `AbattementCharges = 10`
- **THEN** `partCreditLoyers` vaut `46800 × 0,9 / 59760 × 100 = 70.48` et `loyersNets` comme `gainTotal` sont inchangés

#### Scenario: Bien acheté comptant sans valeur estimée
- **WHEN** un bien sans crédit ni `ValeurActuelle` a perçu 7 800 € de loyers et payé 840 € de charges
- **THEN** `bilan` vaut `{ plusValue: 0, loyersNets: 6960, interets: 0, gainTotal: 6960, mensualites: null, partCreditLoyers: null }`

#### Scenario: Bien d'autrui
- **WHEN** A appelle `GET /api/biens/{id}/rentabilite` sur un bien de B
- **THEN** la réponse est 404

### Requirement: Rentabilité d'un crédit
`GET /api/credits/{id}/rentabilite` SHALL renvoyer, pour un crédit de l'utilisateur, les loyers du bien qu'il finance (le bien de l'utilisateur dont `IDcredit = id`) et les mensualités du crédit, selon les règles de flux et de période. Les charges du bien n'entrent pas dans la rentabilité d'un crédit : elles relèvent du bien (bilan).

```
{
  bien: IDbien | null,
  periode: { debut, fin, mois },
  loyers, mensualites,
  loyerMensuelMoyen, mensualiteMoyenne, cashFlowMensuel, tauxCouverture,
  attendu: { loyerMensuel, mensualite, cashFlowMensuel, tauxCouverture },
  cumul: { loyers, mensualites },
  partCreditLoyers
}
```

- `loyersCouverts` = loyers de la période × `(1 − AbattementCharges / 100)` du bien ;
- `loyerMensuelMoyen` = `loyersCouverts / mois` : le loyer moyen hors charges sur la durée de la location ;
- `mensualiteMoyenne` = `mensualites / mois` : la mensualité moyenne réellement payée (changement de mensualité et report d'échéances compris) ;
- `cashFlowMensuel` = `(loyersCouverts − mensualites) / mois` : une valeur négative est l'effort mensuel, la part de la mensualité que les loyers ne couvrent pas, de sorte que `loyerMensuelMoyen − cashFlowMensuel = mensualiteMoyenne` ;
- `tauxCouverture` = `loyersCouverts / mensualites × 100` ;
- `loyers` et `cumul.loyers` sont les loyers perçus, charges comprises, sans abattement ;
- `attendu.loyerMensuel` = `LoyerMensuel` du bien (`null` s'il n'est pas renseigné ou sans bien) ; `attendu.mensualite` = valeur absolue de `MontantMensuel` (le formulaire de crédit l'enregistre en négatif) si le crédit est `actif` et que `DateFin` n'est pas passée, 0 sinon ; `attendu.cashFlowMensuel` = `loyerMensuel − mensualite` et `attendu.tauxCouverture` = `loyerMensuel / mensualite × 100`, `null` si `loyerMensuel` est nul ;
- `partCreditLoyers` = `cumul.loyers × (1 − AbattementCharges / 100) / cumul.mensualites × 100` : la part de toutes les mensualités payées depuis le début du crédit couverte par tous les loyers perçus, hors période de location ; `null` sans bien lié ou sans mensualité payée ;

Une opération qui est à la fois une mensualité et liée à un bien MUST n'être comptée qu'une fois, comme mensualité. Un crédit sans bien renvoie `bien: null` et des loyers nuls. Les loyers MUST NOT modifier `remaining-balance` ni `payments`. La route MUST répondre 404 pour un crédit d'un autre utilisateur ou inexistant.

#### Scenario: Investissement locatif
- **WHEN** sur une location de 12 mois civils, un crédit a eu 12 mensualités de -830 € et son bien 12 loyers de +650 € et une taxe foncière de -840 €
- **THEN** la route renvoie `loyers: 7800`, `mensualites: 9960`, `loyerMensuelMoyen: 650`, `mensualiteMoyenne: 830`, `cashFlowMensuel: -180` et `tauxCouverture: 78.31`, sans tenir compte de la taxe foncière

#### Scenario: Mensualité qui a changé
- **WHEN** sur une location de 62 mois, le crédit a eu 18 mensualités de 1 150 €, 41 de 1 400 € et 3 mois de report d'échéances
- **THEN** `mensualiteMoyenne` vaut `(18 × 1150 + 41 × 1400) / 62 = 1259.68` et `loyerMensuelMoyen − cashFlowMensuel` vaut `mensualiteMoyenne`

#### Scenario: Prévision
- **WHEN** un crédit actif de `MontantMensuel = -830` (saisi par le formulaire) ou `830` finance un bien de `LoyerMensuel = 650`
- **THEN** `attendu` vaut `{ loyerMensuel: 650, mensualite: 830, cashFlowMensuel: -180, tauxCouverture: 78.31 }`

#### Scenario: Abattement pour charges
- **WHEN** un bien loué 750 € charges comprises avec `AbattementCharges = 10` a perçu 12 loyers sur la période, et que le crédit a reçu 12 mensualités de 830 €
- **THEN** `loyers` vaut 9000, `loyerMensuelMoyen` vaut 675, `tauxCouverture` vaut 81.33 et `cashFlowMensuel` vaut `(8100 − 9960) / 12 = -155`

#### Scenario: Location récente sur un crédit ancien
- **WHEN** nous sommes le 20 octobre 2026, qu'un crédit de 830 € par mois est remboursé depuis 2020 et que son bien est loué 650 € depuis juillet 2026
- **THEN** la période vaut `{ debut: '2026-07', fin: '2026-09', mois: 3 }`, `cashFlowMensuel` vaut -180 et `tauxCouverture` 78.31

#### Scenario: Date de mise en location du bien
- **WHEN** le bien lié au crédit a `DateMiseEnLocation = 2021-08-01` et que le crédit est remboursé depuis 2015
- **THEN** la période du crédit commence en `2021-08`, et les mensualités antérieures n'entrent ni dans `cashFlowMensuel` ni dans `tauxCouverture`

#### Scenario: Restant dû inchangé
- **WHEN** des loyers sont liés au bien financé par le crédit
- **THEN** `GET /api/credits/{id}/remaining-balance` renvoie le même résultat qu'avant leur saisie

#### Scenario: Crédit sans bien
- **WHEN** aucun bien n'est lié au crédit
- **THEN** `bien` vaut `null`, `loyers` vaut 0, `attendu.loyerMensuel` vaut `null` et `partCreditLoyers` vaut `null`

#### Scenario: Part du crédit payée par les loyers
- **WHEN** depuis le début du crédit, 72 mensualités de 830 € ont été payées (`cumul.mensualites = 59760`) et le bien, avec `AbattementCharges = 10`, a perçu 52 000 € de loyers, dont une partie avant `DateMiseEnLocation`
- **THEN** `partCreditLoyers` vaut `52000 × 0,9 / 59760 × 100 = 78.31`, calculé sur les cumuls et non sur la période de location

#### Scenario: Crédit d'autrui
- **WHEN** A appelle `GET /api/credits/{id}/rentabilite` sur un crédit de B
- **THEN** la réponse est 404

