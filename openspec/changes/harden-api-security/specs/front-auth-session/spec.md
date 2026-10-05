## MODIFIED Requirements

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

### Requirement: Déconnexion
La déconnexion SHALL appeler `POST /api/users/logout`, supprimer le cookie `userID`, réinitialiser les stores et rediriger vers `/login`. Elle MUST ne supprimer du `localStorage` que les clés liées à la session et conserver les préférences (thème, mode debug, dernier email). Un échec réseau de l'appel de logout MUST NOT empêcher la déconnexion locale.

#### Scenario: Logout depuis Config
- **WHEN** l'utilisateur déclenche la déconnexion dans `/config`
- **THEN** `POST /api/users/logout` est appelé, le cookie `userID` est supprimé et `/login` s'affiche

#### Scenario: Préférences conservées
- **WHEN** l'utilisateur en thème sombre se déconnecte
- **THEN** la page de login s'affiche toujours en thème sombre
