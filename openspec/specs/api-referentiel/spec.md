# api-referentiel Specification

## Purpose
TBD - created by archiving change migrate-back-to-nuxt-server. Update Purpose after archive.
## Requirements
### Requirement: Banques
Les routes `/api/banques` SHALL fournir le CRUD standard de `Banque` (`IDbanque`, `NomBanque`). Les banques étant partagées (sans `IDuser`), leur comportement actuel (tout utilisateur authentifié lit et écrit) MUST être reproduit tel quel ; ce point est consigné comme écart connu dans `design.md`.

#### Scenario: Liste triée
- **WHEN** le front appelle `GET /api/banques?filter={"order":"NomBanque ASC"}`
- **THEN** les banques sont renvoyées triées par nom

### Requirement: Comptes scopés par utilisateur
Les routes `/api/comptes` SHALL fournir le CRUD standard de `Compte`, scopé par `IDuser`, avec `include: [{ relation: 'banque' }]` renvoyant la banque liée dans le champ `banque`. `IDuser` MUST être forcé à celui du JWT à la création. `GET /api/comptes/management-info` MUST renvoyer, pour chaque compte de l'utilisateur, `{ IDcompte, lastOpDate (nullable), hasReferences }` où `hasReferences` indique que le compte est référencé par une `Operation`, une `OperationRecurrente` ou un `Credit` (donc non supprimable), et `GET /api/comptes/{id}/banque` la banque d'un compte de l'utilisateur.

#### Scenario: Création
- **WHEN** `POST /api/comptes` est appelé avec `NomCompte`, `IDbanque` et les drapeaux (`bloque`, `joint`, `children`, `retraite`, `porte_feuille`, `visible`)
- **THEN** le compte est créé avec l'`IDuser` du JWT

#### Scenario: Liste avec banque
- **WHEN** `GET /api/comptes` est appelé avec `include` sur `banque`
- **THEN** chaque compte contient l'objet `banque`

#### Scenario: Banque d'un compte d'autrui
- **WHEN** `GET /api/comptes/{id}/banque` cible le compte d'un autre utilisateur
- **THEN** la réponse est 404

### Requirement: Catégories avec catégories partagées
Les routes `/api/categories` SHALL fournir le CRUD standard de `Categorie` (`IDcat`, `Nom`, `IDuser`, `Type` ∈ {`depense`,`revenu`,`transfert`}, défaut `depense`). La lecture MUST inclure les catégories de l'utilisateur et les catégories partagées (`IDuser = 0`) ; l'écriture (PATCH/PUT/DELETE) MUST être limitée aux catégories de l'utilisateur et refuser (404) les catégories partagées.

#### Scenario: Lecture mixte
- **WHEN** le front appelle `GET /api/categories?filter={"where":{"or":[{"IDuser":5},{"IDuser":0}]},"order":"Nom ASC"}`
- **THEN** les catégories de l'utilisateur 5 et les partagées sont renvoyées, jamais celles d'un autre utilisateur

#### Scenario: Modification d'une catégorie partagée
- **WHEN** l'utilisateur appelle `PATCH /api/categories/{id}` sur une catégorie `IDuser = 0`
- **THEN** la réponse est 404 et la catégorie est inchangée

