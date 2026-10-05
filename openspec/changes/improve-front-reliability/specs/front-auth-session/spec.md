## MODIFIED Requirements

### Requirement: Middleware d'authentification global
Un middleware de route global SHALL rediriger vers `/login` toute navigation vers une route autre que `/login` lorsque l'utilisateur n'est pas authentifié. Le force-push vers `/login` au démarrage d'`App.vue` MUST rester supprimé. En complément, toute réponse 401 de l'API reçue à n'importe quel moment de la session (hors `POST /api/users/login`) MUST purger la session locale et rediriger une seule fois vers `/login`. Seule une réponse 401 ou 403 de `GET /api/users/exists` MUST invalider la session : une erreur réseau ou une réponse 5xx MUST conserver la session et laisser l'application utilisable.

#### Scenario: Accès sans session
- **WHEN** un visiteur sans session ouvre `/stats`
- **THEN** il est redirigé vers `/login`

#### Scenario: Token invalide ou expiré
- **WHEN** un utilisateur ouvre l'application alors que `GET /api/users/exists` répond 401
- **THEN** la session locale est supprimée et l'utilisateur est redirigé vers `/login`

#### Scenario: Expiration en cours d'utilisation
- **WHEN** la PWA est restée ouverte au-delà du TTL du JWT et l'utilisateur change de compte
- **THEN** la réponse 401 redirige vers `/login` au lieu d'afficher une liste vide

#### Scenario: Requêtes parallèles en 401
- **WHEN** trois requêtes simultanées reçoivent 401
- **THEN** une seule redirection vers `/login` a lieu

#### Scenario: Ouverture hors ligne
- **WHEN** l'utilisateur ouvre la PWA sans réseau
- **THEN** il n'est pas déconnecté

#### Scenario: Utilisateur connecté sur /login
- **WHEN** un utilisateur authentifié ouvre `/login`
- **THEN** il est redirigé vers `/` sans boucle de redirection et sans second contrôle d'authentification dans `login.vue`
