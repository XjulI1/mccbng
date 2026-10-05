# api-auth Specification

## Purpose
TBD - created by archiving change migrate-back-to-nuxt-server. Update Purpose after archive.
## Requirements
### Requirement: Connexion par email et code
`POST /api/users/login` SHALL accepter `{ email, code }` (`email` ≤ 254 caractères, `code` de exactement 6 caractères), vérifier le code contre `User.secret_key` par bcrypt, poser le cookie de session et renvoyer `{ userId: <IDuser> }` sans le JWT dans le corps. Une `secret_key` qui n'est pas un hash bcrypt (préfixe `$2`) MUST être refusée. Les identifiants invalides MUST produire 401 `Invalid email or code.` avec un temps de réponse comparable que l'email existe ou non : la comparaison factice MUST utiliser un hash de même coût que les hash réels.

#### Scenario: Connexion valide
- **WHEN** un utilisateur envoie son email et son code corrects
- **THEN** la réponse est 200 avec `userId` sans champ `id` contenant un JWT, et un en-tête `Set-Cookie` `mccbngAuth` est posé

#### Scenario: Email inconnu
- **WHEN** l'email n'existe pas
- **THEN** la réponse est 401 `Invalid email or code.` après une comparaison bcrypt factice de même coût que les hash réels

#### Scenario: secret_key en clair
- **WHEN** un utilisateur dont la `secret_key` stockée est en clair se connecte avec ce code
- **THEN** la réponse est 401 `Invalid email or code.` et la `secret_key` n'est pas modifiée

### Requirement: JWT préservant IDuser
Le JWT SHALL être signé en `HS256` avec `JWT_SECRET` (secret aléatoire par processus si absent hors production, avec avertissement au démarrage), porter `iss` et `aud` égaux à `mccbng`, expirer après `JWT_TTL_SECONDS` (défaut 21600, soit 6 h) et porter `{ name, email, IDuser, tv }` où `tv` est la `tokenVersion` de l'utilisateur ; il MUST NOT porter la colonne `User.id`. La vérification MUST imposer l'algorithme `HS256`, l'émetteur et l'audience. Un token invalide, expiré, d'une `tokenVersion` périmée ou d'un utilisateur qui n'existe plus MUST produire 401 avec le message générique `Invalid or expired token` ; la raison détaillée MUST n'être que journalisée côté serveur.

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
Le login SHALL poser `mccbngAuth=<jwt>; HttpOnly; SameSite=Strict; Path=/; Max-Age=<TTL>` (+ `Secure` si `NODE_ENV=production`), et ce cookie MUST être le seul support d'authentification des routes protégées : le header `Authorization: Bearer` MUST NOT être accepté. Toute requête de méthode non sûre (`POST`, `PUT`, `PATCH`, `DELETE`) MUST porter l'en-tête `X-Requested-With: mccbng` et, si l'en-tête `Origin` est présent, une origine égale à celle de l'application ; sinon la réponse MUST être 403. `POST /api/users/logout` (protégé, 204) MUST incrémenter la `tokenVersion` de l'utilisateur, ce qui invalide tous ses JWT émis sur tous ses appareils, et effacer le cookie (`Max-Age=0`).

#### Scenario: Requête authentifiée par cookie
- **WHEN** le navigateur appelle `GET /api/comptes` avec le cookie `mccbngAuth` valide et sans header `Authorization`
- **THEN** la réponse est 200

#### Scenario: Bearer seul
- **WHEN** un client appelle `GET /api/comptes` avec `Authorization: Bearer <jwt valide>` et sans cookie
- **THEN** la réponse est 401

#### Scenario: Requête cross-site
- **WHEN** une page d'une autre origine envoie `POST /api/operations` avec le cookie mais sans `X-Requested-With: mccbng`
- **THEN** la réponse est 403 et aucune opération n'est créée

#### Scenario: Déconnexion
- **WHEN** `POST /api/users/logout` est appelé avec une session valide
- **THEN** la réponse est 204, le cookie `mccbngAuth` est expiré et le JWT précédemment émis est refusé (401) s'il est rejoué

#### Scenario: Déconnexion de tous les appareils
- **WHEN** un utilisateur connecté sur deux appareils se déconnecte sur l'un d'eux
- **THEN** le JWT de l'autre appareil est refusé (401) à sa requête suivante

### Requirement: Rate-limiting du login
`POST /api/users/login` SHALL être limité à 5 tentatives par IP et par fenêtre de 15 minutes via la configuration de `nuxt-security`, sans middleware de rate-limit maison. L'IP MUST être lue depuis l'en-tête posé par le reverse proxy de confiance (`X-Real-IP`, posé par le proxy inversé Synology DSM à partir du `CF-Connecting-IP` de Cloudflare), avec repli sur l'adresse de la socket ; la valeur de `X-Forwarded-For` fournie par le client MUST NOT être utilisée. Une adresse IPv6 MUST être comptée par son préfixe `/64` (toutes les adresses d'un même `/64` partagent le compteur), une IPv4 mappée (`::ffff:a.b.c.d`) comme l'IPv4 correspondante ; le journal des tentatives MUST conserver l'adresse complète. Si l'application est déployée sur plusieurs instances, le compteur MUST utiliser un stockage partagé. Au-delà de la limite, la réponse MUST être 429 (corps par défaut de `nuxt-security`). Aucune autre route ne MUST être limitée par cette règle.

#### Scenario: Sixième échec
- **WHEN** une même IP enchaîne 6 logins invalides en 15 minutes
- **THEN** le sixième reçoit 429

#### Scenario: Rotation de X-Forwarded-For
- **WHEN** un client envoie 6 logins invalides en 15 minutes en changeant la valeur de `X-Forwarded-For` à chaque requête
- **THEN** le sixième reçoit 429

#### Scenario: Rotation d'adresses IPv6 dans un même /64
- **WHEN** un client envoie 6 logins invalides en 15 minutes depuis 6 adresses IPv6 différentes du même préfixe `/64`
- **THEN** le sixième reçoit 429, et une adresse d'un autre `/64` n'est pas limitée

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

### Requirement: Création manuelle d'utilisateur
L'API MUST NOT exposer de route de création d'utilisateur : `POST /api/signup` MUST répondre 404 au format d'erreur uniforme. Les utilisateurs SHALL être créés directement en base selon une procédure documentée. Une commande `pnpm hash-code <code>` MUST produire, pour un code de 6 caractères, un hash bcrypt de coût 12 utilisable tel quel comme `secret_key`, et refuser un code d'une autre longueur.

#### Scenario: Route supprimée
- **WHEN** un utilisateur authentifié appelle `POST /api/signup` avec `IDuser: 0`
- **THEN** la réponse est 404 et aucun utilisateur n'est créé

#### Scenario: Hash d'un code
- **WHEN** l'exploitant lance `pnpm hash-code 123456`
- **THEN** la commande affiche un hash `$2…$12$…` avec lequel le login accepte le code `123456`

### Requirement: Hash des secret_key legacy
Un script one-shot SHALL hasher en bcrypt (coût 12) toutes les `secret_key` qui ne sont pas déjà un hash bcrypt, en mode simulation par défaut. Il MUST être exécuté en production avant le déploiement de la version qui refuse les `secret_key` en clair.

#### Scenario: Script exécuté
- **WHEN** le script est lancé sans `--dry-run` sur une base contenant des `secret_key` en clair
- **THEN** aucune `secret_key` ne reste en clair et chaque utilisateur concerné se connecte avec son code habituel

### Requirement: Verrouillage temporaire du compte
Le serveur SHALL compter les échecs de connexion consécutifs par utilisateur et, au 5ᵉ échec, verrouiller le compte pendant 5 minutes ; chaque nouvel échec après un verrouillage MUST le prolonger au palier suivant (30 min, 2 h, puis 24 h au maximum). Pendant le verrouillage, le login MUST répondre 401 `Invalid email or code.`, même avec le bon code, sans exécuter de comparaison bcrypt et sans révéler le verrouillage. Une connexion réussie MUST remettre le compteur à zéro.

#### Scenario: Cinquième échec
- **WHEN** un compte cumule 5 échecs consécutifs
- **THEN** une tentative immédiate avec le bon code reçoit 401

#### Scenario: Palier suivant
- **WHEN** le premier verrouillage de 5 minutes est écoulé et une nouvelle tentative échoue
- **THEN** le compte est verrouillé pendant 30 minutes

#### Scenario: Fin du verrouillage
- **WHEN** le délai de verrouillage est écoulé et l'utilisateur saisit le bon code
- **THEN** le login réussit et le compteur d'échecs revient à 0

### Requirement: Journal des tentatives de connexion
Chaque tentative de connexion SHALL produire un log structuré côté serveur contenant le résultat (succès, échec, verrouillé), l'`IDuser` s'il est connu, l'IP de confiance, le User-Agent et l'horodatage. Le code saisi et la `secret_key` MUST NOT être journalisés.

#### Scenario: Échec journalisé
- **WHEN** une tentative de connexion échoue
- **THEN** une ligne de log indique l'échec, l'IP et l'horodatage, sans le code saisi

