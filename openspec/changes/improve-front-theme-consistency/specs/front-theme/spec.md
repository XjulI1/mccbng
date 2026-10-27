## ADDED Requirements

### Requirement: Couleurs issues des tokens du thème
Toute couleur de l'interface SHALL provenir d'un token CSS défini dans `app/assets/styles/theme.css` pour le thème clair et pour le thème sombre. Les composants et pages MUST NOT contenir de couleur littérale (hexadécimale, `rgb()`, `rgba()`), sauf exemption commentée et justifiée. Une vérification automatique MUST échouer lorsqu'une couleur littérale apparaît hors de `theme.css`.

#### Scenario: Couleur codée en dur ajoutée
- **WHEN** un composant déclare `color: #ff0000`
- **THEN** `pnpm lint:check` échoue en indiquant le fichier et la ligne

#### Scenario: Passage en thème sombre
- **WHEN** l'utilisateur passe en thème sombre et ouvre la page Gestion
- **THEN** aucun texte, fond ou bordure de la page ne garde une couleur du thème clair

### Requirement: Contraste minimal
Dans les deux thèmes, le texte SHALL avoir un contraste d'au moins 4,5:1 avec son fond, et les éléments graphiques porteurs d'information (icônes seules, bordures de champs, jauges) d'au moins 3:1. Les montants entrants et sortants MUST utiliser les tokens dédiés qui respectent ces seuils. Les paires de tokens texte / fond MUST être vérifiées automatiquement par les tests.

#### Scenario: Montant sortant en thème clair
- **WHEN** une opération de -42,00 € s'affiche sur fond blanc
- **THEN** la couleur du montant a un contraste d'au moins 4,5:1 avec le fond

### Requirement: Typographie unique
L'application SHALL utiliser une seule pile de polices (polices système) et la couleur de texte du thème. Tous les montants MUST être affichés en chiffres tabulaires. Les textes d'interface MUST avoir une taille d'au moins 11 px.

#### Scenario: Colonne de montants
- **WHEN** la liste affiche 1 111,11 € au-dessus de 888,88 €
- **THEN** les chiffres des deux montants sont alignés verticalement

### Requirement: Icônes homogènes
Les pictogrammes d'interface SHALL être des icônes Font Awesome ; les emojis MUST NOT être utilisés comme pictogrammes. Une icône accompagnée d'un texte MUST être masquée aux lecteurs d'écran ; un bouton composé d'une icône seule MUST avoir un libellé accessible.

#### Scenario: Type de compte
- **WHEN** l'utilisateur ouvre la gestion des comptes et qu'un compte est joint
- **THEN** son badge affiche l'icône `handshake` et le texte « Joint », sans emoji

### Requirement: Dock lisible et adapté à l'iPhone
La barre de navigation et le bouton d'action flottant SHALL reposer sur un fond semi-opaque issu du thème, lisible quel que soit le contenu qui défile dessous. Le bouton d'action flottant MUST être masqué lorsqu'aucune action n'est disponible dans le contexte. Le dock MUST rester au-dessus de la zone non sûre du bas de l'écran.

#### Scenario: Page sans action
- **WHEN** l'utilisateur ouvre la page Stats
- **THEN** le bouton d'action flottant n'est pas affiché

#### Scenario: iPhone sans bouton physique
- **WHEN** l'application est ouverte en PWA sur un iPhone avec barre d'accueil
- **THEN** le dock s'affiche au-dessus de la barre d'accueil
