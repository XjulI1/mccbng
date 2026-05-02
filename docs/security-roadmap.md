# Roadmap sécurité — connexion

Ce document liste les améliorations de sécurité **non encore implémentées** sur
le flux d'authentification, à reprendre dans une prochaine itération.

État courant (après PR `claude/secure-connection-keys-7SAhm`) :

- `secret_key` est désormais **hashée en bcrypt** en base.
- Login = `email` + `code` (l'email est stocké en `localStorage` côté front pour
  ne pas avoir à le retaper).
- **Rate-limiting** sur `POST /api/users/login` (5 tentatives / 15 min / IP) via
  `express-rate-limit`.
- Cookie d'auth `mccbngAuth` posé par le backend en `HttpOnly` + `SameSite=Strict`
  (+ `Secure` en production).
- TTL JWT explicite (`JWT_TTL_SECONDS`, défaut 1h) ; secret optionnellement
  persistant via `JWT_SECRET`.

## Reste à faire

### 1. Helmet + en-têtes de sécurité

Ajouter `helmet` au pipeline Express (via `this.expressMiddleware(...)` dans
`src/application.ts`) pour activer par défaut :

- `Strict-Transport-Security` (HSTS)
- `Content-Security-Policy` (à calibrer, surtout pour `/explorer`)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy` minimaliste

Penser à exclure ou adapter la CSP pour le Swagger Explorer (`/explorer`) qui
charge des assets externes.

### 2. Verrouillage temporaire du compte (account lockout)

Le rate-limiter actuel agit **par IP**. Compléter avec un compteur **par
utilisateur** (clé = `email` ou `IDuser`) qui :

- Incrémente à chaque échec sur `verifyCredentials`.
- Verrouille le compte après N échecs (ex. 10) pendant un délai croissant
  (1 min, 5 min, 30 min, 1 h…).
- Réinitialise le compteur après une connexion réussie.

Implémentation possible :

- Option A — colonnes `failedLoginCount` + `lockedUntil` sur `User`, mises à
  jour dans `MyUserService.verifyCredentials`.
- Option B — table dédiée `LoginAttempt` (`userId`, `ip`, `success`, `at`) qui
  permet aussi de monitorer / alerter sur les patterns suspects.

Combiner avec un log structuré des tentatives (succès / échec, IP, UA,
horodatage) pour permettre la détection d'attaques par password spraying.

### 3. (Optionnel) Refresh tokens

Aujourd'hui, le JWT expire au bout d'1 h et l'utilisateur doit se reconnecter.
Pour améliorer l'UX sans dégrader la sécurité, ajouter :

- Un **refresh token** long-lived stocké en cookie `HttpOnly` séparé.
- Une route `POST /api/users/refresh` qui échange le refresh token contre un
  nouveau access token court-lived.
- Une rotation du refresh token à chaque utilisation, avec révocation côté
  serveur (table `RefreshToken`).
