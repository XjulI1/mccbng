## MODIFIED Requirements

### Requirement: Connexion par email et code
`POST /api/users/login` SHALL accepter `{ email, code }` (`email` ≤ 254 caractères, `code` de exactement 6 caractères), vérifier le code contre `User.secret_key` par bcrypt, poser le cookie de session et renvoyer `{ userId: <IDuser> }` sans le JWT dans le corps. Les identifiants invalides MUST produire 401 `Invalid email or code.` avec un temps de réponse comparable que l'email existe ou non : la comparaison factice MUST utiliser un hash de même coût que les hash réels.

#### Scenario: Connexion valide
- **WHEN** un utilisateur envoie son email et son code corrects
- **THEN** la réponse est 200 avec `userId` sans champ `id` contenant un JWT, et un en-tête `Set-Cookie` `mccbngAuth` est posé

#### Scenario: Email inconnu
- **WHEN** l'email n'existe pas
- **THEN** la réponse est 401 `Invalid email or code.` après une comparaison bcrypt factice de même coût que les hash réels

### Requirement: Migration paresseuse des secret_key en clair
Tant que des `secret_key` en clair subsistent en production, si `secret_key` ne commence pas par `$2`, le login SHALL l'accepter par comparaison à temps constant puis la re-hasher en bcrypt (coût 12) à la première connexion réussie ; un échec du re-hash MUST NOT faire échouer le login. Un script one-shot MUST permettre de hasher toutes les `secret_key` restantes ; une fois exécuté en production, le chemin legacy MUST être supprimé et toute `secret_key` non bcrypt MUST être refusée (401).

#### Scenario: Utilisateur legacy
- **WHEN** un utilisateur dont la `secret_key` est en clair se connecte avec le bon code avant l'exécution du script
- **THEN** le login réussit et la `secret_key` stockée devient un hash bcrypt

#### Scenario: Script de migration exécuté
- **WHEN** le script de hash des `secret_key` legacy a été exécuté
- **THEN** aucune `secret_key` ne reste en clair en base

### Requirement: JWT préservant IDuser
Le JWT SHALL être signé en `HS256` avec `JWT_SECRET` (secret aléatoire par processus si absent hors production, avec avertissement au démarrage), porter `iss` et `aud` égaux à `mccbng`, expirer après `JWT_TTL_SECONDS` (défaut 3600) et porter `{ id, name, email, IDuser, tv }` où `tv` est la `tokenVersion` de l'utilisateur. La vérification MUST imposer l'algorithme `HS256`, l'émetteur et l'audience. Un token invalide, expiré, d'une `tokenVersion` périmée ou d'un utilisateur qui n'existe plus MUST produire 401 avec le message générique `Invalid or expired token` ; la raison détaillée MUST n'être que journalisée côté serveur.

#### Scenario: Token valide
- **WHEN** une route protégée reçoit un JWT valide d'un utilisateur existant
- **THEN** `IDuser` numérique est disponible pour le scoping

#### Scenario: Token expiré
- **WHEN** le JWT a dépassé son TTL
- **THEN** la réponse est 401 `Invalid or expired token`

#### Scenario: Token signé par un autre secret
- **WHEN** le JWT a été signé avec une autre valeur de `JWT_SECRET`
- **THEN** la réponse est 401

#### Scenario: Algorithme non autorisé
- **WHEN** le JWT est signé avec un algorithme autre que `HS256`
- **THEN** la réponse est 401

#### Scenario: Utilisateur supprimé
- **WHEN** le JWT est valide mais l'`IDuser` n'existe plus en base
- **THEN** la réponse est 401

### Requirement: Cookie d'authentification HttpOnly
Le login SHALL poser `mccbngAuth=<jwt>; HttpOnly; SameSite=Strict; Path=/; Max-Age=<TTL>` (+ `Secure` si `NODE_ENV=production`), et ce cookie MUST être le support d'authentification des routes protégées. Le header `Authorization: Bearer` MUST rester accepté pendant une seule version de transition puis être retiré. Toute requête de méthode non sûre (`POST`, `PUT`, `PATCH`, `DELETE`) authentifiée par cookie MUST porter l'en-tête `X-Requested-With: mccbng` et, si l'en-tête `Origin` est présent, une origine égale à celle de l'application ; sinon la réponse MUST être 403. `POST /api/users/logout` (protégé, 204) MUST incrémenter la `tokenVersion` de l'utilisateur, ce qui invalide tous ses JWT émis, et effacer le cookie (`Max-Age=0`).

#### Scenario: Requête authentifiée par cookie
- **WHEN** le navigateur appelle `GET /api/comptes` avec le cookie `mccbngAuth` valide et sans header `Authorization`
- **THEN** la réponse est 200

#### Scenario: Requête cross-site
- **WHEN** une page d'une autre origine envoie `POST /api/operations` avec le cookie mais sans `X-Requested-With: mccbng`
- **THEN** la réponse est 403 et aucune opération n'est créée

#### Scenario: Déconnexion
- **WHEN** `POST /api/users/logout` est appelé avec une session valide
- **THEN** la réponse est 204, le cookie `mccbngAuth` est expiré et le JWT précédemment émis est refusé (401) s'il est rejoué

### Requirement: Rate-limiting du login
`POST /api/users/login` SHALL être limité à 5 tentatives par IP et par fenêtre de 15 minutes via la configuration de `nuxt-security`, sans middleware de rate-limit maison. L'IP MUST être lue depuis l'en-tête posé par le reverse proxy de confiance (`X-Real-IP`), avec repli sur l'adresse de la socket ; la valeur de `X-Forwarded-For` fournie par le client MUST NOT être utilisée. Si l'application est déployée sur plusieurs instances, le compteur MUST utiliser un stockage partagé. Au-delà de la limite, la réponse MUST être 429 (corps par défaut de `nuxt-security`). Aucune autre route ne MUST être limitée par cette règle.

#### Scenario: Sixième échec
- **WHEN** une même IP enchaîne 6 logins invalides en 15 minutes
- **THEN** le sixième reçoit 429

#### Scenario: Rotation de X-Forwarded-For
- **WHEN** un client envoie 6 logins invalides en 15 minutes en changeant la valeur de `X-Forwarded-For` à chaque requête
- **THEN** le sixième reçoit 429

#### Scenario: Autres routes non limitées
- **WHEN** une IP appelle massivement `GET /api/comptes`
- **THEN** la règle de rate-limit du login ne s'applique pas

### Requirement: Création d'utilisateur
`POST /api/signup` SHALL être réservé aux administrateurs, c'est-à-dire aux `IDuser` listés dans la variable `ADMIN_IDUSERS` (403 pour tout autre utilisateur authentifié, 401 sans session). Le corps MUST NOT contenir `IDuser` (rejet 4xx) : l'`IDuser` MUST être attribué par le serveur, strictement positif, et ne pas être déjà référencé par une ligne de `User`, `Compte`, `Categorie`, `Credit` ou `Bien`. La route MUST exiger `secret_key` de 6 caractères (400 sinon), refuser un `email` déjà utilisé (409), hasher `secret_key` (bcrypt coût 12) et le `password` (bcrypt) dans `UserCredentials`, et ne jamais renvoyer `secret_key`.

#### Scenario: Utilisateur non administrateur
- **WHEN** un utilisateur authentifié absent de `ADMIN_IDUSERS` appelle `POST /api/signup`
- **THEN** la réponse est 403 et aucun utilisateur n'est créé

#### Scenario: IDuser fourni par le client
- **WHEN** un administrateur envoie `POST /api/signup` avec `IDuser: 0`
- **THEN** la requête est rejetée (4xx) et aucun utilisateur n'est créé

#### Scenario: IDuser attribué par le serveur
- **WHEN** un administrateur crée un utilisateur valide
- **THEN** l'utilisateur reçoit un `IDuser` strictement positif qu'aucune donnée existante ne référence

#### Scenario: Appel anonyme
- **WHEN** `POST /api/signup` est appelé sans session
- **THEN** la réponse est 401

## ADDED Requirements

### Requirement: Verrouillage temporaire du compte
Le serveur SHALL compter les échecs de connexion consécutifs par utilisateur et, à partir de 10 échecs, verrouiller le compte pendant un délai croissant à chaque nouvel échec (1 min, 5 min, 30 min, puis 1 h au maximum). Pendant le verrouillage, le login MUST répondre 401 `Invalid email or code.`, même avec le bon code, sans exécuter de comparaison bcrypt et sans révéler le verrouillage. Une connexion réussie MUST remettre le compteur à zéro.

#### Scenario: Dixième échec
- **WHEN** un compte cumule 10 échecs consécutifs
- **THEN** une tentative immédiate avec le bon code reçoit 401

#### Scenario: Fin du verrouillage
- **WHEN** le délai de verrouillage est écoulé et l'utilisateur saisit le bon code
- **THEN** le login réussit et le compteur d'échecs revient à 0

### Requirement: Journal des tentatives de connexion
Chaque tentative de connexion SHALL produire un log structuré côté serveur contenant le résultat (succès, échec, verrouillé), l'`IDuser` s'il est connu, l'IP de confiance, le User-Agent et l'horodatage. Le code saisi et la `secret_key` MUST NOT être journalisés.

#### Scenario: Échec journalisé
- **WHEN** une tentative de connexion échoue
- **THEN** une ligne de log indique l'échec, l'IP et l'horodatage, sans le code saisi

### Requirement: Unicité de User.id
La colonne `User.id` SHALL être unique en base. La migration qui ajoute la contrainte MUST échouer avec un message explicite listant les valeurs en doublon s'il en existe, sans modifier la table.

#### Scenario: Doublons présents
- **WHEN** la migration est lancée alors que deux utilisateurs partagent le même `id`
- **THEN** elle échoue en nommant la valeur en doublon et la table est inchangée

### Requirement: Rafraîchissement de session
En phase 2 optionnelle, `POST /api/users/refresh` SHALL échanger un refresh token opaque, stocké hashé côté serveur et transmis dans un cookie `HttpOnly` dédié limité à ce chemin, contre un nouveau JWT de courte durée et un nouveau refresh token (rotation). La réutilisation d'un refresh token déjà utilisé MUST révoquer tous les refresh tokens de cette session, et la déconnexion MUST révoquer le refresh token courant.

#### Scenario: Rotation
- **WHEN** le front appelle `POST /api/users/refresh` avec un refresh token valide
- **THEN** un nouveau cookie de session et un nouveau refresh token sont posés, et l'ancien refresh token est invalidé

#### Scenario: Rejeu d'un refresh token
- **WHEN** un refresh token déjà utilisé est présenté
- **THEN** la réponse est 401 et tous les refresh tokens de la session sont révoqués
