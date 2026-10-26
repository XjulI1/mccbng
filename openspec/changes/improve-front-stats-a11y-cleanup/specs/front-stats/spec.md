## ADDED Requirements

### Requirement: Périodes des statistiques en dates locales
Les préréglages de période des statistiques SHALL calculer leurs bornes dans le fuseau local de l'appareil.

#### Scenario: Préréglage Année
- **WHEN** l'utilisateur, en France, choisit le préréglage « Année » le 1er janvier 2026 à 0 h 30
- **THEN** la plage envoyée commence le 2026-01-01 et se termine le 2026-12-31

### Requirement: Statistiques cohérentes avec la dernière sélection
Les écrans de statistiques SHALL n'afficher que la réponse correspondant à la dernière sélection de l'utilisateur (période, année, comparaison), et MUST s'afficher sans erreur lorsqu'une catégorie ou une série est absente.

#### Scenario: Changement rapide d'année
- **WHEN** l'utilisateur choisit 2024 puis immédiatement 2025, et la réponse de 2024 arrive en dernier
- **THEN** les graphiques affichent 2025

### Requirement: Graphiques sûrs
Chaque graphique SHALL être détruit lorsqu'il est recréé ou que son composant est démonté. Les libellés fournis par l'utilisateur (noms de catégorie) MUST être échappés avant leur insertion dans un formateur HTML.

#### Scenario: Libellé contenant du HTML
- **WHEN** une catégorie s'appelle `<b>Loisirs</b>`
- **THEN** l'infobulle du graphique affiche le texte `<b>Loisirs</b>` tel quel, sans l'interpréter
