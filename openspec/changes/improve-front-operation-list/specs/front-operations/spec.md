## ADDED Requirements

### Requirement: Regroupement des opérations
La liste des opérations du compte ouvert SHALL présenter les opérations en deux blocs, « À pointer » puis « Pointées », et, dans chaque bloc, regroupées par jour sous un en-tête qui reste visible pendant le défilement. Un bloc sans opération MUST NOT être affiché. Les résultats de recherche et les listes d'opérations des statistiques MUST être regroupés par jour sans séparation par pointage. Les opérations d'une page chargée ensuite MUST compléter le jour déjà affiché lorsqu'elles portent la même date.

#### Scenario: Compte avec opérations pointées et à pointer
- **WHEN** le compte ouvert a deux opérations à pointer le 21 octobre et une opération pointée le 20 octobre
- **THEN** la liste affiche le bloc « À pointer » avec un en-tête de jour pour le 21 octobre, puis le bloc « Pointées » avec un en-tête pour le 20 octobre

#### Scenario: Jour réparti sur deux pages
- **WHEN** la page suivante commence par des opérations de la même date que la dernière opération affichée
- **THEN** elles s'ajoutent sous l'en-tête de jour existant, sans nouvel en-tête

### Requirement: Libellés de jour
L'en-tête d'un jour SHALL afficher « Aujourd'hui » ou « Hier » pour ces deux jours, « À venir » suivi de la date pour une date future, et sinon le jour de la semaine et la date, l'année étant ajoutée lorsqu'elle diffère de l'année en cours. Les jours MUST être calculés dans le fuseau local de l'appareil.

#### Scenario: Opération générée en avance
- **WHEN** une opération récurrente est datée du 4 novembre et que l'on est le 27 octobre
- **THEN** son en-tête de jour indique « À venir » et la date du 4 novembre

#### Scenario: Année précédente
- **WHEN** une opération est datée du 21 octobre 2025 et que l'on est en 2026
- **THEN** son en-tête de jour indique l'année 2025

### Requirement: Ligne d'opération
Chaque opération SHALL afficher son libellé, sa catégorie, son montant signé aligné à droite en chiffres tabulaires et, le cas échéant, un indicateur de bien lié, de crédit ou de coût d'usage. Les couleurs des montants entrants et sortants MUST avoir un contraste d'au moins 4,5:1 avec le fond, en thème clair comme en thème sombre. En mode recherche, la ligne MUST indiquer le compte de l'opération.

#### Scenario: Opération catégorisée liée à un bien
- **WHEN** la liste contient l'opération « Loyer octobre » de +750 € en catégorie « Loyers », liée à un bien
- **THEN** la ligne affiche « Loyer octobre », la catégorie « Loyers », un indicateur de bien et « +750,00 € »

### Requirement: Pointer et modifier sont des actions distinctes
Toucher la ligne d'une opération SHALL ouvrir son formulaire d'édition. Le pointage MUST se faire uniquement par une case à cocher distincte, dont la zone tactile mesure au moins 44 × 44 px et dont le libellé accessible nomme l'action et l'opération. Toucher la case MUST NOT ouvrir l'édition. En lecture seule, la ligne MUST n'offrir ni case ni lien d'édition.

#### Scenario: Toucher le libellé
- **WHEN** l'utilisateur touche le libellé d'une opération à pointer
- **THEN** le formulaire d'édition de l'opération s'ouvre et l'opération reste à pointer

#### Scenario: Toucher la case
- **WHEN** l'utilisateur touche la case d'une opération à pointer
- **THEN** l'opération est pointée et le formulaire d'édition ne s'ouvre pas

#### Scenario: Lecteur d'écran
- **WHEN** un lecteur d'écran atteint la case de l'opération « Courses » non pointée
- **THEN** il annonce « Pointer Courses »

### Requirement: États de chargement, vide et erreur
Au premier chargement et pendant le chargement de la page suivante, la liste SHALL afficher des lignes squelettes. Un compte sans opération MUST afficher un message et un bouton « Nouvelle opération » ; une recherche sans résultat MUST afficher un message rappelant le terme cherché. Un échec de chargement MUST afficher un message et un bouton « Réessayer » qui relance le chargement en échec. Les animations MUST être désactivées lorsque l'appareil demande moins de mouvement.

#### Scenario: Compte vide
- **WHEN** l'utilisateur ouvre un compte sans opération
- **THEN** la liste affiche « Aucune opération sur ce compte » et un bouton « Nouvelle opération » qui ouvre le formulaire

#### Scenario: Coupure réseau pendant le défilement
- **WHEN** le chargement de la page suivante échoue
- **THEN** les opérations déjà affichées restent visibles, un message d'erreur et un bouton « Réessayer » s'affichent en bas de la liste
