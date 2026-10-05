# front-auth-session Specification

## Purpose
TBD - created by archiving change migrate-front-to-nuxt. Update Purpose after archive.
## Requirements
### Requirement: Session par cookies
La session SHALL reposer sur le cookie `HttpOnly` `mccbngAuth` posé par le serveur ; le JWT MUST NOT être lisible par JavaScript : le front MUST NOT écrire de cookie `userToken` ni conserver le JWT en mémoire ou en `localStorage`. Seul l'identifiant utilisateur non secret est conservé dans le cookie `userID` (JSON encodé en URI, `SameSite=Strict`, `Secure` en HTTPS). Le client HTTP MUST envoyer les requêtes avec les cookies (`credentials: 'same-origin'`) et l'en-tête `X-Requested-With: mccbng`. Un éventuel cookie `userToken` hérité MUST être supprimé au démarrage. `universal-cookie` MUST rester retiré et `useCookie` MUST NOT être appelé hors `setup`.

#### Scenario: Connexion réussie
- **WHEN** l'utilisateur saisit un code valide de 6 caractères sur `/login`
- **THEN** `POST /api/users/login` est appelé, le cookie `userID` est écrit, aucun cookie `userToken` n'est créé et l'utilisateur est redirigé vers `/`

#### Scenario: Jeton inaccessible au script
- **WHEN** un script de la page lit `document.cookie` après la connexion
- **THEN** il n'y trouve aucun JWT

#### Scenario: Cookie hérité
- **WHEN** un utilisateur ouvre l'application avec un ancien cookie `userToken`
- **THEN** ce cookie est supprimé

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
La déconnexion SHALL appeler `POST /api/users/logout`, supprimer le cookie `userID`, réinitialiser les stores et rediriger vers `/login`. Elle MUST ne supprimer du `localStorage` que les clés liées à la session et conserver les préférences (thème, mode debug, dernier email). Un échec réseau de l'appel de logout MUST NOT empêcher la déconnexion locale.

#### Scenario: Logout depuis Config
- **WHEN** l'utilisateur déclenche la déconnexion dans `/config`
- **THEN** `POST /api/users/logout` est appelé, le cookie `userID` est supprimé et `/login` s'affiche

#### Scenario: Préférences conservées
- **WHEN** l'utilisateur en thème sombre se déconnecte
- **THEN** la page de login s'affiche toujours en thème sombre

