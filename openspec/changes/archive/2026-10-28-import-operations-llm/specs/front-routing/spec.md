## MODIFIED Requirements

### Requirement: Pattern overlay conservé
Les routes enfants de formulaire SHALL rendre la vue `RouteOverTheContent` avec un `componentName` (déclaré dans la meta de la page) conservant les valeurs actuelles (`operation-form`, `transfert-form`, `search`, `operation-recurrente-form`, `compte-form`, `credit-form`, `bien-form`) et la nouvelle valeur `import-form` (route `/import`, nom `Import d'opérations`, parente `/operations`, `disabledTotalHeader` faux), par-dessus le contenu de la page parente, via `<NuxtPage />`. La table de référence `tests/fixtures/routes.ts` MUST inclure la route `/import`.

#### Scenario: Ouverture d'un formulaire
- **WHEN** l'utilisateur navigue vers `/newOperation`
- **THEN** la liste d'opérations reste affichée et `OperationForm` apparaît en overlay

#### Scenario: Fermeture d'un overlay
- **WHEN** l'utilisateur ferme l'overlay
- **THEN** il revient à la route parente sans rechargement de la page

#### Scenario: Ouverture de l'import
- **WHEN** l'utilisateur navigue vers `/import`
- **THEN** la liste d'opérations reste affichée, `route.name` vaut `Import d'opérations` et `ImportForm` apparaît en overlay
