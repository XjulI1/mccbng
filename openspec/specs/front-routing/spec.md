# front-routing Specification

## Purpose
TBD - created by archiving change migrate-front-to-nuxt. Update Purpose after archive.
## Requirements
### Requirement: Routes file-based à URLs inchangées
Les routes SHALL être générées depuis `app/pages/` et exposer exactement les mêmes URLs publiques qu'avant la migration : `/`, `/newOperation`, `/editOperation/:id`, `/search`, `/transfert`, `/retrait`, `/recurrOperation`, `/newRecurrOperation`, `/editRecurrOperation/:id`, `/amortissement`, `/gestion`, `/comptesGestion`, `/newCompte`, `/editCompte/:id`, `/credits`, `/newCredit`, `/editCredit/:id`, `/biens`, `/newBien`, `/editBien/:id`, `/stats`, `/login`, `/config`, `/editUser`.

#### Scenario: Accès direct à une URL existante
- **WHEN** un utilisateur authentifié ouvre `/editCredit/12`
- **THEN** la page Crédits s'affiche avec le formulaire d'édition du crédit 12 en overlay

#### Scenario: URL inconnue
- **WHEN** un utilisateur ouvre une URL non déclarée
- **THEN** il n'obtient pas de page applicative valide (comportement équivalent à l'actuel)

### Requirement: Pattern overlay conservé
Les routes enfants de formulaire SHALL rendre la vue `RouteOverTheContent` avec un `componentName` (déclaré dans la meta de la page) conservant les valeurs actuelles (`operation-form`, `transfert-form`, `search`, `operation-recurrente-form`, `compte-form`, `credit-form`, `bien-form`) par-dessus le contenu de la page parente, via `<NuxtPage />`.

#### Scenario: Ouverture d'un formulaire
- **WHEN** l'utilisateur navigue vers `/newOperation`
- **THEN** la liste d'opérations reste affichée et `OperationForm` apparaît en overlay

#### Scenario: Fermeture d'un overlay
- **WHEN** l'utilisateur ferme l'overlay
- **THEN** il revient à la route parente sans rechargement de la page

### Requirement: Meta disabledTotalHeader
Les pages qui masquent les totaux globaux de `AccountHeader` SHALL déclarer `disabledTotalHeader: true` dans leur meta de page, et `AccountHeader` MUST respecter cette valeur.

#### Scenario: Page sans totaux
- **WHEN** l'utilisateur affiche une page déclarant `disabledTotalHeader: true`
- **THEN** les totaux globaux ne sont pas affichés dans l'en-tête

### Requirement: Chargement paresseux des pages
Chaque page SHALL être chargée à la demande (code-splitting automatique de Nuxt).

#### Scenario: Navigation vers une page non visitée
- **WHEN** l'utilisateur navigue pour la première fois vers `/stats`
- **THEN** le code de la page est chargé à ce moment-là

### Requirement: Table de routes de référence testée
Une table de routes de référence, capturée depuis `router.ts` avant sa suppression, SHALL être versionnée dans `tests/fixtures/routes.ts` et un test d'intégration Vitest (`@nuxt/test-utils`, environnement `nuxt`) MUST vérifier que le routeur Nuxt généré la respecte exactement : chemin, nom de route, route parente, `componentName`, `disabledTotalHeader` (valeur effective, meta du parent incluse).

#### Scenario: Toutes les URLs de la table résolvent
- **WHEN** le test résout chaque URL de la table (paramètres dynamiques instanciés, ex. `/editCredit/12`)
- **THEN** la route est trouvée, son `params.id` vaut la valeur injectée, et elle se rattache à la route parente attendue

#### Scenario: Route enfant rendue dans son parent
- **WHEN** le test résout `/newOperation`
- **THEN** la chaîne `matched` contient la page `/` puis la page enfant, et `meta.componentName` vaut `operation-form`

#### Scenario: Meta des pages
- **WHEN** le test résout chacune des pages de la table
- **THEN** `meta.disabledTotalHeader` vaut `true` pour les pages qui le déclaraient et leurs overlays, et reste faux pour `/` et ses overlays

#### Scenario: Aucune route en trop
- **WHEN** le test énumère `router.getRoutes()` et exclut les routes internes de Nuxt
- **THEN** l'ensemble des chemins est égal à celui de la table (ni ajout, ni oubli)

#### Scenario: URL inconnue
- **WHEN** le test résout `/n-existe-pas`
- **THEN** aucune route applicative n'est trouvée

### Requirement: Noms de routes conservés
Chaque route SHALL conserver son nom actuel (ex. `Home`, `Login`, `Virement`, `Retrait`, `Nouvelle opération`), car le code applicatif s'appuie sur `route.name`.

#### Scenario: Navigation par nom
- **WHEN** le code navigue avec `router.replace({ name: 'Home' })`
- **THEN** l'utilisateur arrive sur `/`

#### Scenario: Libellé du formulaire de retrait
- **WHEN** l'utilisateur ouvre `/retrait`
- **THEN** `route.name` vaut `Retrait` et `TransfertForm` affiche le libellé correspondant

