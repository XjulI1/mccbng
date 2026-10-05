# api-server-foundation Specification

## Purpose
TBD - created by archiving change migrate-back-to-nuxt-server. Update Purpose after archive.
## Requirements
### Requirement: API hébergée dans le serveur Nitro
L'API SHALL être servie par les handlers Nitro de `server/api/**` sous le préfixe `/api`, dans le même processus que le front, sur le port 8080. Les URLs, méthodes HTTP et formes de réponse JSON MUST rester identiques à celles de l'API LoopBack (les ~79 routes recensées), de sorte que `app/` n'ait pas à changer. Aucun proxy vers un autre serveur MUST subsister.

#### Scenario: Route existante inchangée
- **WHEN** le front appelle `GET /api/comptes` avec un Bearer valide
- **THEN** la réponse est un tableau JSON de comptes au même format qu'avant la migration

#### Scenario: Aucun proxy résiduel
- **WHEN** l'application est construite
- **THEN** `server/api/[...path].ts` n'existe plus et aucune variable `API_URL` n'est lue

### Requirement: Connexion MySQL par variables d'environnement
Le serveur SHALL se connecter à MySQL via `mysql2` et Drizzle avec un pool configuré par `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` et `DB_NAME` (runtime config Nitro). Le fichier `mccb-mysql.datasource.config.json` MUST disparaître. Le serveur MUST refuser de démarrer en production si une de ces variables est absente.

#### Scenario: Configuration complète
- **WHEN** le serveur démarre avec toutes les variables `DB_*`
- **THEN** une requête `GET /api/ping` aboutit et les requêtes métier atteignent la base

#### Scenario: Configuration manquante
- **WHEN** le serveur démarre en production sans `DB_PASSWORD`
- **THEN** il s'arrête avec un message d'erreur explicite nommant la variable manquante

### Requirement: Schéma Drizzle fidèle à la base existante
Les tables `User`, `Banque`, `Compte`, `Operation`, `OperationRecurrente`, `Categorie`, `Credit` et `Bien` SHALL être décrites en TypeScript avec exactement les noms de tables, colonnes, types, nullabilités et index du schéma obtenu après application de toutes les migrations versionnées (`DECIMAL` pour les montants, le taux et la surface, `ENUM` pour `Categorie.Type`, drapeaux de compte `NOT NULL`, colonnes et tables legacy absentes). Les `.default()` du schéma Drizzle sont des défauts applicatifs, appliqués par l'API à l'insertion, et peuvent différer des défauts SQL. Les valeurs `DECIMAL` MUST être lues comme des nombres, et les montants renvoyés arrondis à 2 décimales aux endroits où LoopBack le faisait.

#### Scenario: Lecture d'une opération
- **WHEN** une opération existante est lue via `GET /api/operations/{id}`
- **THEN** ses champs (`IDop`, `NomOp`, `MontantOp`, `DateOp`, `CheckOp`, `IDcompte`, `IDcat`, `amortissement`, `IDcredit`) ont les mêmes noms et types JSON qu'avant

#### Scenario: Schéma aligné sur les migrations
- **WHEN** les migrations sont appliquées sur une base vide et le schéma Drizzle est comparé à `information_schema`
- **THEN** les tables, colonnes, types, nullabilités et index correspondent

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

### Requirement: Filtre de liste compatible LoopBack
Les routes de liste (`GET /api/<ressource>`) SHALL accepter le paramètre `filter` JSON utilisé par le front, avec au minimum : `where` (égalité, `and`, `or`, `inq`, `like`), `order` (chaîne `"COL ASC, COL DESC"`), `limit`, `skip` et `include: [{ relation: 'banque' }]` pour les comptes. Les noms de colonnes et opérateurs MUST être validés contre une liste blanche par ressource (jamais interpolés tels quels dans le SQL), et le filtre d'appartenance utilisateur MUST toujours être combiné par `and` au `where` fourni.

#### Scenario: Pagination des opérations
- **WHEN** le front appelle `GET /api/operations?filter={"where":{"IDcompte":3},"order":"CheckOp ASC, DateOp DESC","limit":35,"skip":35}`
- **THEN** la deuxième page de 35 opérations du compte 3 est renvoyée dans cet ordre

#### Scenario: Colonne inconnue
- **WHEN** un filtre référence une colonne absente de la liste blanche
- **THEN** la réponse est 400 et aucune requête SQL n'est exécutée

#### Scenario: Tentative de contourner le scope
- **WHEN** un utilisateur envoie `where: { IDuser: <autre utilisateur> }` sur `/api/comptes`
- **THEN** le résultat est vide (le scope utilisateur est appliqué en plus)

### Requirement: Routes CRUD standard
Chaque ressource CRUD SHALL exposer : `POST /` (200, entité créée), `GET /count` (`{ count }`), `GET /` (liste), `PATCH /` (mise à jour en masse, `{ count }`), `GET /{id}`, `PATCH /{id}` (204), `PUT /{id}` (204) et `DELETE /{id}` (204), selon les mêmes conventions de statut que LoopBack, y compris pour les ressources qui n'exposent aujourd'hui qu'une partie de ces routes.

#### Scenario: Suppression
- **WHEN** `DELETE /api/categories/{id}` est appelé sur une catégorie de l'utilisateur
- **THEN** la réponse est 204 sans corps

### Requirement: Validation des entrées avec Zod
Les corps, paramètres de chemin et paramètres de requête SHALL être validés par des schémas Zod. Une entrée invalide MUST produire 422 ou 400 (au même code que LoopBack lorsqu'il est connu) avec un message explicite, sans appel à la base. Les champs gérés par le serveur (`IDuser`, clés auto-incrémentées, `IDopRecu` d'un crédit) MUST être ignorés ou rejetés s'ils sont fournis par le client.

#### Scenario: Corps invalide
- **WHEN** `POST /api/operations` est appelé avec `MontantOp: "abc"`
- **THEN** la réponse est une erreur 4xx au format d'erreur uniforme

#### Scenario: Usurpation d'IDuser
- **WHEN** `POST /api/credits` contient `IDuser` d'un autre utilisateur
- **THEN** le crédit est créé avec l'`IDuser` du JWT, pas celui du corps

### Requirement: Format d'erreur uniforme
Toutes les erreurs de l'API SHALL être renvoyées en JSON `{ "error": { "statusCode": <n>, "name": "<ErreurHttp>", "message": "<texte>" } }`. Les erreurs inattendues MUST renvoyer 500 avec un message générique, sans stack ni détail SQL, et être journalisées côté serveur.

#### Scenario: Ressource introuvable
- **WHEN** `GET /api/credits/999` cible un crédit inexistant
- **THEN** la réponse est 404 avec `error.statusCode = 404`

#### Scenario: Erreur SQL
- **WHEN** une requête échoue côté MySQL
- **THEN** la réponse est 500 `Internal Server Error` sans fuite du SQL ni de la stack

### Requirement: Endpoint de santé public
`GET /api/ping` SHALL rester public, sans nécessiter de JWT, et renvoyer un JSON de santé limité à `greeting`, `date` et `url`. Les en-têtes de la requête MUST NOT figurer dans la réponse.

#### Scenario: Ping sans authentification
- **WHEN** `GET /api/ping` est appelé sans session
- **THEN** la réponse est 200

#### Scenario: Pas d'écho des en-têtes
- **WHEN** `GET /api/ping` est appelé avec des en-têtes `X-Forwarded-For` et `User-Agent`
- **THEN** la réponse ne contient aucun champ `headers`

### Requirement: En-têtes de sécurité
Le serveur SHALL activer `nuxt-security` avec des en-têtes de sécurité (HSTS en production, `X-Content-Type-Options: nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, CSP calibrée) pour l'application Nuxt (SPA, PWA, Highcharts, Eruda lazy) comme pour l'API. La CSP MUST NOT casser le service worker, les styles inline requis ni Highcharts.

#### Scenario: En-têtes présents
- **WHEN** une page ou une route `/api` est requêtée
- **THEN** la réponse contient `X-Content-Type-Options: nosniff` et `Referrer-Policy`

#### Scenario: Application fonctionnelle sous CSP
- **WHEN** l'application est chargée en production avec la CSP active
- **THEN** aucun blocage CSP n'apparaît dans la console pour les parcours principaux (login, liste d'opérations, stats)

### Requirement: Résolution sûre des ressources génériques
Les routes génériques `/api/[resource]` SHALL ne résoudre que les ressources déclarées en propre dans le registre CRUD ; un nom inconnu, y compris une propriété héritée du prototype (`constructor`, `__proto__`, `toString`), MUST produire 404 au format d'erreur uniforme.

#### Scenario: Nom issu du prototype
- **WHEN** `GET /api/constructor` est appelé avec une session valide
- **THEN** la réponse est 404 et aucune erreur 500 n'est journalisée

