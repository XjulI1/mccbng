# front-state Specification

## Purpose
TBD - created by archiving change migrate-front-to-nuxt. Update Purpose after archive.
## Requirements
### Requirement: Stores Pinia remplaçant Vuex
Chacun des 9 modules Vuex (`user`, `compte`, `operation`, `category`, `stats`, `display`, `credit`, `bien`, `banque`) SHALL être remplacé par un store Pinia équivalent dans `app/stores/`. Les paquets `vuex` et l'instance `store/index.ts` MUST être supprimés.

#### Scenario: Aucune référence Vuex résiduelle
- **WHEN** le code source est analysé après migration
- **THEN** aucun import de `vuex`, `useStore()` Vuex ni `store.state.*` ne subsiste

### Requirement: Parité fonctionnelle des stores
Chaque store SHALL exposer les mêmes états, getters et actions (mêmes noms et sémantique) que le module Vuex correspondant, y compris `maskAmount`, les getters de totaux de `compte`, la pagination par 35 de `operation`, le chargement paresseux de `category`, et les soldes restants de `credit`.

#### Scenario: Totaux par type de compte
- **WHEN** la liste des comptes contient des comptes `retraite`, `bloque`, `joint` et `children`
- **THEN** `totalGlobal`, `totalRetraite`, `totalAvailable`, `totalJoint` et `totalChildren` renvoient les mêmes valeurs qu'avec Vuex

#### Scenario: Pagination des opérations
- **WHEN** l'utilisateur fait défiler la liste jusqu'au bas
- **THEN** `loadMoreOperations()` charge 35 opérations supplémentaires tant que `hasMoreOperations` est vrai

#### Scenario: Masquage des montants
- **WHEN** `toggleMaskAmount()` est appelé
- **THEN** tous les montants affichés via `<Currency>` sont masqués

#### Scenario: Catégories déjà chargées
- **WHEN** `fetchCategoryList()` est appelé alors que la liste est déjà peuplée
- **THEN** aucune requête réseau n'est émise

### Requirement: Séparation I/O et état
Les appels HTTP SHALL rester dans `services/` ; les actions des stores orchestrent sans mutation d'état dans les services.

#### Scenario: Action de chargement
- **WHEN** une action de store charge des données
- **THEN** elle appelle une fonction de `services/` puis met à jour l'état du store avec le résultat

### Requirement: Instanciation des stores à l'usage
Les stores SHALL être instanciés via `useXStore()` à l'intérieur des fonctions/actions et non au niveau module, afin d'éviter l'usage d'une instance Pinia inactive et les dépendances cycliques entre stores.

#### Scenario: Appel inter-stores
- **WHEN** l'action de `compte` a besoin de données d'`operation`
- **THEN** elle appelle `useOperationStore()` dans le corps de l'action

