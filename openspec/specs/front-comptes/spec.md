# front-comptes Specification

## Purpose
Affichage et saisie des informations propres à un compte dans le front : plafond facultatif et jauge de remplissage sur l'en-tête du compte ouvert.
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

