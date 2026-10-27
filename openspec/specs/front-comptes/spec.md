# front-comptes Specification

## Purpose
Affichage et saisie des informations propres à un compte dans le front : en-tête du compte ouvert (soldes, mise en page mobile et desktop), plafond facultatif et jauge de remplissage.
## Requirements
### Requirement: Plafond dans le formulaire de compte
Le formulaire de compte SHALL proposer un champ « Plafond (optionnel) ». Un champ vide ou à 0 MUST être enregistré comme `null` (pas de plafond). Une valeur saisie MUST être arrondie au centime lorsque le champ perd le focus. À l'édition, le champ MUST être prérempli avec le plafond du compte.

#### Scenario: Plafond saisi
- **WHEN** l'utilisateur saisit 22950,456, quitte le champ puis enregistre le compte
- **THEN** le champ affiche 22950,46 et le compte est enregistré avec `Plafond: 22950.46`

#### Scenario: Champ vidé
- **WHEN** l'utilisateur vide le champ ou y saisit 0 puis enregistre
- **THEN** le compte est enregistré avec `Plafond: null`

### Requirement: Jauge de plafond sur l'en-tête du compte
Lorsque le compte ouvert a un plafond strictement positif et que l'en-tête affiche les soldes, l'en-tête SHALL afficher, à côté du nom du compte, la part du plafond utilisée par le solde total (pointé et non pointé) arrondie à l'unité inférieure, au-delà de 100 % lorsqu'il est dépassé, ainsi qu'une jauge (`role="meter"`) remplie dans la limite de 0 à 100 %. L'info-bulle de la jauge MUST indiquer « Plafond X € : reste Y € » ou, une fois le plafond dépassé, « Plafond X € : dépassé de Y € ». Sans plafond, ni le pourcentage ni la jauge ne MUST être affichés. Le plafond affiché MUST être à jour dès la modification du compte.

#### Scenario: Livret à moitié rempli
- **WHEN** le compte ouvert a `Plafond = 22950` et un solde de 11475 €
- **THEN** l'en-tête affiche « 50 % » à côté du nom, la jauge est remplie à moitié et l'info-bulle indique « Plafond 22 950,00 € : reste 11 475,00 € »

#### Scenario: Plafond dépassé
- **WHEN** le compte ouvert a `Plafond = 10000` et un solde de 12000 €
- **THEN** l'en-tête affiche « 120 % », la jauge est pleine et l'info-bulle indique « dépassé de 2 000,00 € »

#### Scenario: Compte sans plafond
- **WHEN** le compte ouvert n'a pas de plafond, ou un plafond à 0
- **THEN** l'en-tête n'affiche ni pourcentage ni jauge

### Requirement: En-tête du compte ouvert
Lorsque la page affiche les soldes, l'en-tête SHALL afficher le nom du compte ouvert sur une première ligne, puis sur une seconde ligne le solde total (pointé et non pointé) mis en avant et le solde pointé précédé du libellé « Pointé ». Lorsque les deux soldes sont égaux au centime près, la mention « Tout pointé » MUST remplacer le solde pointé. Tant que les soldes ne sont pas chargés, l'en-tête MUST afficher « … » au lieu d'un montant. Un solde total négatif MUST être affiché dans la couleur de danger du thème. Sur une page dont la meta `disabledTotalHeader` vaut vrai, seul le titre MUST être affiché, centré.

#### Scenario: Compte avec des opérations à pointer
- **WHEN** le compte ouvert a un solde total de 1 234,56 € et un solde pointé de 1 100,00 €
- **THEN** l'en-tête affiche 1 234,56 € en grand et « Pointé 1 100,00 € »

#### Scenario: Compte entièrement pointé
- **WHEN** le solde total et le solde pointé du compte ouvert valent tous deux 500,00 €
- **THEN** l'en-tête affiche 500,00 € et « Tout pointé »

#### Scenario: Soldes en cours de chargement
- **WHEN** l'utilisateur ouvre un compte dont les soldes ne sont pas encore reçus
- **THEN** l'en-tête affiche le nom du compte et « … », jamais 0,00 €

#### Scenario: Page sans compte réel
- **WHEN** l'utilisateur ouvre la page Stats
- **THEN** l'en-tête n'affiche que le titre « Stats », centré

### Requirement: En-tête adapté au mobile
Sur un écran de largeur inférieure au point de rupture desktop, l'en-tête SHALL occuper toute la largeur de l'écran avec une marge de 8 px de chaque côté, MUST tronquer un nom de compte trop long par des points de suspension sans jamais tronquer les montants, et MUST se placer sous la zone non sûre du haut de l'écran (encoche). Sur desktop, l'en-tête MUST être centré horizontalement sur le panneau des opérations. La hauteur de l'en-tête MUST rester fixe.

#### Scenario: Nom long sur un petit écran
- **WHEN** l'utilisateur ouvre, sur un écran de 320 px de large, le compte « Compte joint vacances et travaux maison » dont le solde est de -12 345,67 €
- **THEN** le nom est tronqué par des points de suspension et les deux montants restent entiers

#### Scenario: PWA sur iPhone à encoche
- **WHEN** l'application est ouverte en PWA sur un iPhone à encoche
- **THEN** l'en-tête s'affiche entièrement sous l'encoche
