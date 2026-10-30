# front-biens-credits Specification

## Purpose
Saisie du lien opération → bien et des paramètres locatifs d'un bien (loyer attendu, date de mise en location, part des charges), et affichage de la rentabilité sur les cartes de crédit et de bien.
## Requirements
### Requirement: Choix du bien dans les formulaires d'opération
Les formulaires d'opération et d'opération récurrente SHALL proposer un champ « Bien » listant les biens de l'utilisateur, précédé de l'option « Aucun », lorsque l'utilisateur possède au moins un bien. Le champ MUST être absent lorsqu'il n'en possède aucun. Le formulaire MUST envoyer l'`IDbien` choisi, ou `null` pour « Aucun », à la création comme à la modification. Après la création d'une opération, le formulaire reste ouvert pour la saisie suivante : le champ « Bien » MUST alors revenir à « Aucun », pour qu'une opération ne soit jamais rattachée par mégarde au bien de la précédente. En édition, le champ MUST être prérempli avec le bien lié. Pour une récurrente gérée par un crédit, le champ MUST être affiché en lecture seule comme les autres champs.

#### Scenario: Lier la récurrente de loyer
- **WHEN** l'utilisateur modifie sa récurrente « Loyer » et choisit son appartement dans le champ « Bien »
- **THEN** la récurrente est enregistrée avec l'`IDbien` de l'appartement

#### Scenario: Saisies successives
- **WHEN** l'utilisateur crée un loyer de +650 € lié à l'appartement, puis saisit aussitôt une dépense de courses de -45 € dans le même formulaire
- **THEN** le champ « Bien » est revenu à « Aucun » et la dépense est enregistrée avec `IDbien: null`

#### Scenario: Aucun bien
- **WHEN** l'utilisateur ne possède aucun bien
- **THEN** le formulaire d'opération n'affiche pas le champ « Bien »

#### Scenario: Retirer le lien
- **WHEN** l'utilisateur choisit « Aucun » sur une opération liée à un bien et enregistre
- **THEN** l'opération est enregistrée avec `IDbien: null`

### Requirement: Loyer attendu dans le formulaire de bien
Le formulaire de bien SHALL proposer un champ facultatif « Loyer mensuel attendu (hors charges) », affiché lorsque l'usage est « Locatif ». Un champ vide MUST être envoyé comme `null`.

#### Scenario: Saisie du loyer attendu
- **WHEN** l'utilisateur saisit 650 dans « Loyer mensuel attendu » d'un bien locatif et enregistre
- **THEN** le bien est enregistré avec `LoyerMensuel: 650`

#### Scenario: Usage non locatif
- **WHEN** l'usage du bien est « Résidence principale »
- **THEN** le champ « Loyer mensuel attendu » n'est pas affiché

### Requirement: Date de mise en location dans le formulaire de bien
Le formulaire de bien SHALL proposer un champ date facultatif « Date de mise en location », affiché lorsque l'usage est « Locatif ». Un champ vide MUST être envoyé comme `null`.

#### Scenario: Ancien logement principal
- **WHEN** l'utilisateur saisit le 1er août 2021 dans « Date de mise en location » et enregistre
- **THEN** le bien est enregistré avec cette date et ses indicateurs sont calculés depuis août 2021

### Requirement: Un crédit par bien dans le formulaire de bien
Le champ « Crédit associé » du formulaire de bien SHALL ne proposer que les crédits qui ne financent pas déjà un autre bien, en plus du crédit déjà associé au bien édité.

#### Scenario: Crédit déjà pris
- **WHEN** le crédit « Immo » finance déjà l'appartement et que l'utilisateur édite le parking
- **THEN** « Immo » n'apparaît pas dans la liste des crédits du parking

### Requirement: Part des charges dans le formulaire de bien
Le formulaire de bien SHALL proposer un champ facultatif « Part des charges dans le loyer perçu (%) », de 0 à 100, affiché lorsque l'usage est « Locatif ». Un champ vide MUST être envoyé comme `null`.

#### Scenario: Saisie de l'abattement
- **WHEN** l'utilisateur saisit 10 dans « Part des charges dans le loyer perçu » d'un bien locatif et enregistre
- **THEN** le bien est enregistré avec `AbattementCharges: 10` et la couverture du crédit lié est recalculée sur 90 % des loyers

### Requirement: Rentabilité sur la carte d'un crédit
La carte d'un crédit SHALL afficher une ligne « Loyers · mensualités · couverture · effort » lorsque sa rentabilité a un bien lié et que des loyers ont été perçus (`cumul.loyers > 0`) ou qu'un loyer est attendu (`attendu.loyerMensuel` non nul). Lorsque `periode.mois > 0`, la ligne MUST utiliser les valeurs de la durée de la location (`loyerMensuelMoyen`, hors charges, `mensualiteMoyenne`, `tauxCouverture`, `cashFlowMensuel`) et indiquer son début (« depuis août 2021 ») ; sinon, elle MUST utiliser les valeurs `attendu`, signalées comme prévisionnelles. Un `cashFlowMensuel` négatif MUST être affiché comme un effort (montant positif) et un `cashFlowMensuel` positif ou nul comme un cash-flow. Un taux de couverture `null` MUST être omis.

#### Scenario: Crédit d'un bien loué
- **WHEN** la rentabilité du crédit renvoie `periode = { debut: '2021-08', mois: 62 }`, `loyerMensuelMoyen = 650`, `mensualiteMoyenne = 830`, `tauxCouverture = 78.31` et `cashFlowMensuel = -180`
- **THEN** la carte affiche « Loyers 650,00 €/mois · mensualités 830,00 €/mois · couverture 78 % · effort 180,00 €/mois » avec la mention « depuis août 2021 »

#### Scenario: Location pas encore commencée
- **WHEN** `periode.mois = 0` et `attendu` vaut `{ loyerMensuel: 650, tauxCouverture: 78.31, cashFlowMensuel: -180 }`
- **THEN** la carte affiche les valeurs attendues avec la mention « prévu »

#### Scenario: Crédit sans bien loué
- **WHEN** aucun bien n'est lié au crédit
- **THEN** la carte n'affiche pas la ligne

### Requirement: Part des loyers dans la barre de remboursement d'un crédit
Lorsque la rentabilité d'un crédit a un bien lié et un `partCreditLoyers` non nul et non zéro, la carte du crédit SHALL dessiner cette part en bleu à l'intérieur de la barre verte « remboursé », en pourcentage de la partie verte, plafonné à 100 %, et afficher la légende « X% des mensualités payées par les loyers » (arrondi à l'unité). Sinon, la barre et la légende MUST rester celles d'un crédit sans loyers.

#### Scenario: Crédit d'un bien loué
- **WHEN** la rentabilité du crédit renvoie `bien = 12` et `partCreditLoyers = 78.31`
- **THEN** 78,31 % de la barre verte sont en bleu et la carte affiche « 78% des mensualités payées par les loyers »

#### Scenario: Loyers supérieurs aux mensualités
- **WHEN** `partCreditLoyers = 112.5`
- **THEN** toute la barre verte est en bleu et la légende indique « 100% des mensualités payées par les loyers »

#### Scenario: Crédit sans loyer
- **WHEN** `bien` vaut `null` ou `partCreditLoyers` vaut `null` ou 0
- **THEN** la barre reste entièrement verte, sans légende

### Requirement: Rentabilité sur la carte d'un bien
La carte d'un bien dont l'usage est « Locatif » SHALL afficher un bloc « Rentabilité » avec le loyer moyen hors charges sur la durée de la location et le début de la location (« Loyer moyen depuis août 2021 »), lorsque `periode.mois > 0`. Sinon, si un loyer est attendu, le bloc MUST afficher le loyer attendu, signalé comme prévisionnel. Le bloc MUST être absent lorsqu'aucune de ces valeurs n'est disponible. Aucun rendement n'est affiché.

#### Scenario: Bien loué depuis plusieurs années
- **WHEN** la rentabilité du bien renvoie `periode = { debut: '2021-08', mois: 62 }` et `loyerMensuelMoyen = 650`
- **THEN** le bloc affiche « Loyer moyen depuis août 2021 » et « 650,00 €/mois »

#### Scenario: Bien locatif sans loyer
- **WHEN** un bien locatif n'a ni opération liée ni `LoyerMensuel`
- **THEN** la carte n'affiche pas le bloc « Rentabilité »

### Requirement: Bilan sur la carte d'un bien
La carte d'un bien, quel que soit son usage, SHALL afficher un bloc « Bilan depuis l'achat » avec les lignes « Plus-value », « Loyers et dépenses » (loyers moins toutes les dépenses liées au bien, y compris pendant l'usage personnel), « Intérêts d'emprunt » (présente seulement si le bien a un crédit lié) et « Gain total », chacune en montant signé, suivies de « Crédit payé par les loyers : X % » lorsque `partCreditLoyers` n'est pas nul. Lorsque la valeur actuelle du bien n'est pas renseignée, la ligne « Plus-value » MUST l'indiquer. Pour un bien dont l'usage n'est pas « Locatif », la ligne « Loyers et dépenses » MUST s'intituler « Dépenses », la ligne « Gain total » MUST s'intituler « Bilan » et « Crédit payé par les loyers » MUST être absent. Le bloc MUST être absent lorsque les loyers nets, les intérêts et la plus-value sont tous nuls et que la valeur actuelle n'est pas renseignée.

#### Scenario: Bien loué à crédit
- **WHEN** le bilan vaut `{ plusValue: 25000, loyersNets: 41800, interets: 18000, gainTotal: 48800, partCreditLoyers: 78.31 }`
- **THEN** la carte affiche « Plus-value +25 000,00 € », « Loyers et dépenses +41 800,00 € », « Intérêts d'emprunt -18 000,00 € », « Gain total +48 800,00 € » et « Crédit payé par les loyers : 78 % »

#### Scenario: Valeur actuelle non renseignée
- **WHEN** le bien n'a pas de valeur actuelle et a perçu des loyers
- **THEN** la ligne « Plus-value » indique « valeur non renseignée »

#### Scenario: Résidence principale à crédit
- **WHEN** un bien d'usage « Résidence principale » a un bilan `{ plusValue: 25000, loyersNets: -12000, interets: 18000, gainTotal: -5000 }`
- **THEN** la carte affiche « Plus-value +25 000,00 € », « Dépenses -12 000,00 € », « Intérêts d'emprunt -18 000,00 € », « Bilan -5 000,00 € » et aucune part du crédit payée par les loyers

#### Scenario: Bien locatif sans historique
- **WHEN** un bien locatif sans crédit ni valeur actuelle n'a aucune opération liée
- **THEN** la carte n'affiche pas le bloc « Bilan depuis l'achat »

