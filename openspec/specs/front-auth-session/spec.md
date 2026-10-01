# front-auth-session Specification

## Purpose
TBD - created by archiving change migrate-front-to-nuxt. Update Purpose after archive.
## Requirements
### Requirement: Session par cookies
Le token et l'identifiant utilisateur SHALL être stockés dans les cookies `userToken` et `userID` via `document.cookie` (JSON encodé en URI, `SameSite=Strict`, `Secure` en HTTPS, même format que `useCookie`), avec les mêmes noms qu'avant la migration. `universal-cookie` MUST être retiré et `useCookie` MUST NOT être appelé hors `setup` (un ref + watcher par appel).

#### Scenario: Connexion réussie
- **WHEN** l'utilisateur saisit un code valide de 6 caractères sur `/login`
- **THEN** `POST /api/users/login` est appelé, les cookies `userToken` et `userID` sont écrits et l'utilisateur est redirigé vers `/`

#### Scenario: Session existante après migration
- **WHEN** un utilisateur disposant des cookies `userToken`/`userID` posés avant la migration ouvre l'application
- **THEN** ces cookies sont reconnus sans nouvelle saisie du code, tant que le token est valide

### Requirement: Middleware d'authentification global
Un middleware de route global SHALL rediriger vers `/login` toute navigation vers une route autre que `/login` lorsque l'utilisateur n'est pas authentifié. Le force-push vers `/login` au démarrage d'`App.vue` MUST être supprimé.

#### Scenario: Accès sans cookie
- **WHEN** un visiteur sans cookie `userToken` ouvre `/stats`
- **THEN** il est redirigé vers `/login`

#### Scenario: Token invalide ou expiré
- **WHEN** un utilisateur avec un cookie `userToken` ouvre l'application alors que `GET /api/users/exists` indique une session invalide (ex. redémarrage du back régénérant le secret JWT)
- **THEN** les cookies sont supprimés et l'utilisateur est redirigé vers `/login`

#### Scenario: Utilisateur connecté sur /login
- **WHEN** un utilisateur authentifié ouvre `/login`
- **THEN** il est redirigé vers `/` sans boucle de redirection et sans second contrôle d'authentification dans `login.vue`

### Requirement: Chargement des données avant l'affichage
Après authentification (middleware ou login), l'application SHALL charger l'utilisateur, la liste des comptes et les catégories (`hydrateSession`) avant d'afficher la page demandée, liens profonds compris. En cas d'échec du chargement, les cookies MUST être supprimés et l'utilisateur redirigé vers `/login`.

#### Scenario: Arrivée sur l'accueil
- **WHEN** l'utilisateur authentifié arrive sur `/`
- **THEN** la liste des comptes et les catégories sont récupérées, le compte favori est sélectionné et affiché

#### Scenario: Rechargement sur un lien profond
- **WHEN** l'utilisateur recharge la page sur `/editOperation/12`
- **THEN** les stores sont chargés avant le formulaire, qui affiche l'opération sans erreur

#### Scenario: Échec du chargement de l'utilisateur
- **WHEN** `GET /api/users/:id` échoue pendant la réhydratation
- **THEN** les cookies sont supprimés et `/login` s'affiche

### Requirement: Déconnexion
La déconnexion SHALL supprimer les cookies `userToken` et `userID` et rediriger vers `/login`.

#### Scenario: Logout depuis Config
- **WHEN** l'utilisateur déclenche la déconnexion dans `/config`
- **THEN** les cookies sont supprimés et `/login` s'affiche

