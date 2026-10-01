## ADDED Requirements

### Requirement: Connexion par email et code
`POST /api/users/login` SHALL accepter `{ email, code }` (`email` ≤ 254 caractères, `code` de exactement 6 caractères), vérifier le code contre `User.secret_key` par bcrypt, et renvoyer `{ id: <jwt>, userId: <IDuser> }`. Les identifiants invalides MUST produire 401 `Invalid email or code.` avec un temps de réponse comparable que l'email existe ou non (comparaison bcrypt factice).

#### Scenario: Connexion valide
- **WHEN** un utilisateur envoie son email et son code corrects
- **THEN** la réponse est 200 avec `id` (JWT) et `userId`, et un en-tête `Set-Cookie` est posé

#### Scenario: Email inconnu
- **WHEN** l'email n'existe pas
- **THEN** la réponse est 401 `Invalid email or code.` après une comparaison bcrypt factice

### Requirement: Migration paresseuse des secret_key en clair
Si `secret_key` ne commence pas par `$2` (legacy en clair), le login SHALL l'accepter par égalité directe puis le re-hasher en bcrypt (coût 12) à la première connexion réussie ; un échec du re-hash MUST NOT faire échouer le login.

#### Scenario: Utilisateur legacy
- **WHEN** un utilisateur dont la `secret_key` est en clair se connecte avec le bon code
- **THEN** le login réussit et la `secret_key` stockée devient un hash bcrypt

### Requirement: JWT préservant IDuser
Le JWT SHALL être signé avec `JWT_SECRET` (secret aléatoire par processus si absent, avec avertissement au démarrage), expirer après `JWT_TTL_SECONDS` (défaut 3600) et porter `{ id, name, email, IDuser }`. Un token invalide ou expiré MUST produire 401 `Error verifying token : <raison>` sur toute route protégée.

#### Scenario: Token valide
- **WHEN** une route protégée reçoit `Authorization: Bearer <jwt>` valide
- **THEN** `IDuser` numérique est disponible pour le scoping

#### Scenario: Token expiré
- **WHEN** le JWT a dépassé son TTL
- **THEN** la réponse est 401

#### Scenario: Token signé par un autre secret
- **WHEN** le JWT a été signé avec une autre valeur de `JWT_SECRET`
- **THEN** la réponse est 401

### Requirement: Cookie d'authentification HttpOnly
Le login SHALL poser `mccbngAuth=<jwt>; HttpOnly; SameSite=Strict; Path=/; Max-Age=<TTL>` (+ `Secure` si `NODE_ENV=production`) ; `POST /api/users/logout` (protégé, 204) MUST l'effacer (`Max-Age=0`). L'authentification des routes protégées reste fondée sur le header `Authorization: Bearer` (comportement actuel).

#### Scenario: Déconnexion
- **WHEN** `POST /api/users/logout` est appelé avec un Bearer valide
- **THEN** la réponse est 204 et le cookie `mccbngAuth` est expiré

### Requirement: Rate-limiting du login
`POST /api/users/login` SHALL être limité à 5 tentatives par IP et par fenêtre de 15 minutes via la configuration de `nuxt-security`, sans middleware de rate-limit maison. Le décompte des connexions réussies dépend des capacités du module (non garanti de les exclure). Au-delà, la réponse MUST être 429 (corps par défaut de `nuxt-security`). Aucune autre route ne MUST être limitée par cette règle.

#### Scenario: Sixième échec
- **WHEN** une même IP enchaîne 6 logins invalides en 15 minutes
- **THEN** le sixième reçoit 429

#### Scenario: Autres routes non limitées
- **WHEN** une IP appelle massivement `GET /api/comptes`
- **THEN** la règle de rate-limit du login ne s'applique pas

### Requirement: Profil utilisateur
`GET /api/users/whoAmI` SHALL renvoyer `{ favoris, warningTotal, warningCompte, IDuser, email, username }` ; `GET /api/users/exists` MUST renvoyer `true` pour un token valide ; `PATCH /api/users/me` MUST accepter uniquement `email`, `username`, `warningTotal`, `warningCompte`, `favoris` (champs inconnus rejetés) et renvoyer 409 `A user with this email already exists` si l'email appartient à un autre utilisateur (204 sinon).

#### Scenario: Email déjà pris
- **WHEN** l'utilisateur modifie son email pour celui d'un autre
- **THEN** la réponse est 409

#### Scenario: Champ interdit
- **WHEN** `PATCH /api/users/me` contient `secret_key`
- **THEN** la requête est rejetée (4xx) et la valeur n'est pas modifiée

### Requirement: Création d'utilisateur
`POST /api/signup` SHALL rester réservé aux utilisateurs authentifiés (comportement actuel), exiger `secret_key` de 6 caractères (400 sinon), refuser un `email` ou `IDuser` déjà utilisé (409), hasher `secret_key` (bcrypt coût 12) et le `password` (bcrypt) dans `UserCredentials`, et ne jamais renvoyer `secret_key` en clair.

#### Scenario: IDuser en doublon
- **WHEN** `POST /api/signup` fournit un `IDuser` existant
- **THEN** la réponse est 409 `IDuser is already in use`

#### Scenario: Appel anonyme
- **WHEN** `POST /api/signup` est appelé sans token
- **THEN** la réponse est 401
