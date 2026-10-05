## MODIFIED Requirements

### Requirement: Isolation par utilisateur
Chaque route protégée SHALL résoudre l'utilisateur courant depuis le JWT (`IDuser` numérique) et appliquer le scoping : **direct** (`IDuser`) pour `Compte`, `Categorie`, `Credit`, `Bien` ; **hérité** (liste des `IDcompte` de l'utilisateur, filtre `inq`) pour `Operation` et `OperationRecurrente`. Une ressource appartenant à un autre utilisateur MUST produire un 404, jamais son contenu. Les écritures (création, remplacement, mise à jour unitaire et en masse) MUST contrôler la propriété des références fournies : `IDcompte` (compte de l'utilisateur), `IDcredit` (null ou crédit de l'utilisateur) et `IDcat` (0, catégorie partagée `IDuser = 0` ou catégorie de l'utilisateur) ; une référence non autorisée MUST produire 404 sans écriture.

#### Scenario: Lecture d'une ressource d'autrui
- **WHEN** l'utilisateur A appelle `GET /api/comptes/{id}` pour un compte de l'utilisateur B
- **THEN** la réponse est 404

#### Scenario: Écriture vers un compte d'autrui
- **WHEN** l'utilisateur A appelle `POST /api/operations` avec l'`IDcompte` d'un compte de B
- **THEN** la réponse est 404 et aucune opération n'est créée

#### Scenario: Rattachement au crédit d'autrui
- **WHEN** l'utilisateur B appelle `POST /api/operations` avec son propre `IDcompte` et l'`IDcredit` d'un crédit de A
- **THEN** la réponse est 404 et aucune opération n'est créée

#### Scenario: Catégorie privée d'autrui
- **WHEN** l'utilisateur B appelle `PATCH /api/operation-recurrentes/{id}` avec l'`IDcat` d'une catégorie privée de A
- **THEN** la réponse est 404 et la récurrente est inchangée

#### Scenario: Catégorie partagée
- **WHEN** l'utilisateur crée une opération avec l'`IDcat` d'une catégorie `IDuser = 0`
- **THEN** l'opération est créée

### Requirement: Endpoint de santé public
`GET /api/ping` SHALL rester public, sans nécessiter de JWT, et renvoyer un JSON de santé limité à `greeting`, `date` et `url`. Les en-têtes de la requête MUST NOT figurer dans la réponse.

#### Scenario: Ping sans authentification
- **WHEN** `GET /api/ping` est appelé sans session
- **THEN** la réponse est 200

#### Scenario: Pas d'écho des en-têtes
- **WHEN** `GET /api/ping` est appelé avec des en-têtes `X-Forwarded-For` et `User-Agent`
- **THEN** la réponse ne contient aucun champ `headers`

## ADDED Requirements

### Requirement: Résolution sûre des ressources génériques
Les routes génériques `/api/[resource]` SHALL ne résoudre que les ressources déclarées en propre dans le registre CRUD ; un nom inconnu, y compris une propriété héritée du prototype (`constructor`, `__proto__`, `toString`), MUST produire 404 au format d'erreur uniforme.

#### Scenario: Nom issu du prototype
- **WHEN** `GET /api/constructor` est appelé avec une session valide
- **THEN** la réponse est 404 et aucune erreur 500 n'est journalisée
