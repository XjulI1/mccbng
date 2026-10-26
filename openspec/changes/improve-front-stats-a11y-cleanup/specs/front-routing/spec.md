## MODIFIED Requirements

### Requirement: Pattern overlay conservé
Les routes enfants de formulaire SHALL rendre la vue `RouteOverTheContent` avec un `componentName` (déclaré dans la meta de la page) conservant les valeurs actuelles (`operation-form`, `transfert-form`, `search`, `operation-recurrente-form`, `compte-form`, `credit-form`, `bien-form`) par-dessus le contenu de la page parente, via `<NuxtPage />`. L'overlay MUST être exposé comme un dialogue modal (`role="dialog"`, `aria-modal="true"`, titre associé), MUST se fermer par la touche Échap, MUST placer le focus dans le formulaire à l'ouverture et MUST le rendre à l'élément déclencheur à la fermeture.

#### Scenario: Ouverture d'un formulaire
- **WHEN** l'utilisateur navigue vers `/newOperation`
- **THEN** la liste d'opérations reste affichée et `OperationForm` apparaît en overlay

#### Scenario: Fermeture d'un overlay
- **WHEN** l'utilisateur ferme l'overlay
- **THEN** il revient à la route parente sans rechargement de la page

#### Scenario: Fermeture au clavier
- **WHEN** l'utilisateur appuie sur Échap dans l'overlay ouvert depuis le bouton « Nouvelle opération »
- **THEN** il revient à la route parente et le focus est rendu au bouton « Nouvelle opération »
