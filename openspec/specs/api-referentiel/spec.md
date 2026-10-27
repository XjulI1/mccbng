# api-referentiel Specification

## Purpose
TBD - created by archiving change migrate-back-to-nuxt-server. Update Purpose after archive.
## Requirements
### Requirement: Banques
Les routes `/api/banques` SHALL fournir la lecture (`GET /`, `GET /{id}`) et la création (`POST /`) de `Banque` (`IDbanque`, `NomBanque`). Les banques restent partagées (sans `IDuser`) : tout utilisateur authentifié MUST pouvoir les lire et en créer. La modification (`PATCH /`, `PATCH /{id}`, `PUT /{id}`) et la suppression (`DELETE /{id}`) MUST NOT être exposées par l'API : ces requêtes MUST être refusées (404 ou 405 au format d'erreur uniforme) sans rien modifier. Ces opérations se font directement en base par l'exploitant.

#### Scenario: Liste triée
- **WHEN** le front appelle `GET /api/banques?filter={"order":"NomBanque ASC"}`
- **THEN** les banques sont renvoyées triées par nom

#### Scenario: Renommage en masse
- **WHEN** un utilisateur authentifié appelle `PATCH /api/banques` avec `{ "NomBanque": "x" }`
- **THEN** la requête est refusée et aucune banque n'est modifiée

#### Scenario: Suppression
- **WHEN** un utilisateur authentifié appelle `DELETE /api/banques/{id}`
- **THEN** la requête est refusée et la banque est conservée

#### Scenario: Création par un utilisateur
- **WHEN** un utilisateur authentifié appelle `POST /api/banques`
- **THEN** la banque est créée

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

### Requirement: Plafond d'un compte
Un `Compte` SHALL porter un champ facultatif `Plafond` (`DECIMAL(12,2)`, `null` par défaut), renvoyé comme nombre JSON. `POST`, `PATCH` et `PUT /api/comptes` MUST accepter un nombre positif ou nul, ou `null` pour l'effacer, et MUST refuser une valeur négative (422). Un `PUT` qui omet `Plafond` MUST le conserver. Le plafond est indicatif : il MUST NOT modifier un solde ni une statistique, et un solde au-delà du plafond reste accepté.

#### Scenario: Plafond d'un livret
- **WHEN** `PATCH /api/comptes/{id}` est appelé avec `{ "Plafond": "22950" }`
- **THEN** la réponse est 204 et `GET /api/comptes/{id}` renvoie `Plafond: 22950`

#### Scenario: Plafond négatif
- **WHEN** `POST /api/comptes` ou `PATCH /api/comptes/{id}` est appelé avec `Plafond: -1`
- **THEN** la réponse est 422 et rien n'est modifié

#### Scenario: PUT d'une ancienne version du front
- **WHEN** `PUT /api/comptes/{id}` est appelé sans `Plafond` sur un compte dont le plafond vaut 22950
- **THEN** le plafond vaut toujours 22950

#### Scenario: Effacement
- **WHEN** `PUT /api/comptes/{id}` est appelé avec `Plafond: null`
- **THEN** le compte n'a plus de plafond

