## ADDED Requirements

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
