# Roadmap sécurité — connexion

Ce document liste les améliorations de sécurité **non encore implémentées** sur
le flux d'authentification, à reprendre dans une prochaine itération.

État courant (API hébergée dans le serveur Nitro de Nuxt, `server/`) :

- `secret_key` est **hashée en bcrypt** en base (migration paresseuse des valeurs
  en clair à la première connexion réussie).
- Login = `email` + `code` (l'email est stocké en `localStorage` côté front pour
  ne pas avoir à le retaper).
- **Rate-limiting** sur `POST /api/users/login` (5 tentatives / 15 min / IP) via
  `nuxt-security`. Limites : compteur en mémoire (une seule instance), les
  connexions réussies sont comptées, et l'IP vient de `X-Forwarded-For` — le
  reverse proxy doit **écraser** cet en-tête, sinon la limite est contournable.
- Cookie d'auth `mccbngAuth` posé par le serveur en `HttpOnly` + `SameSite=Strict`
  (+ `Secure` en production).
- TTL JWT explicite (`JWT_TTL_SECONDS`, défaut 1h) ; `JWT_SECRET` obligatoire en
  production.
- **En-têtes de sécurité** (`nuxt-security`) : HSTS, `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, et une
  **Content-Security-Policy appliquée** (le mode `report-only` est inutile sans
  point de collecte `report-to`).
- Validation systématique des entrées avec Zod, filtre de liste à liste blanche,
  isolation par utilisateur testée (une ressource d'autrui répond 404).

## Reste à faire

### 1. Durcir le périmètre existant

- **`Banque` n'est pas scopée par utilisateur** : tout utilisateur authentifié peut
  lire, modifier et supprimer toutes les banques.
- **`POST /api/signup` est ouvert à tout utilisateur authentifié** : le réserver à
  un rôle administrateur.
- **`User.id` n'est pas unique en production** (la clé primaire est `IDuser`) :
  ajouter une contrainte d'unicité après avoir corrigé les doublons éventuels.
- **Tables MyISAM** (`Operation`, `OperationRecurrente`, `Compte`, `Categorie`,
  `Banque`, `User`) : les transactions de l'API n'ont aucun effet. Les convertir en
  InnoDB (`ALTER TABLE … ENGINE=InnoDB`) via une migration versionnée.
- Rate-limit **partagé** (stockage externe) si l'application passe à plusieurs
  instances.

### 2. Verrouillage temporaire du compte (account lockout)

Le rate-limiter actuel agit **par IP**. Compléter avec un compteur **par
utilisateur** (clé = `email` ou `IDuser`) qui :

- Incrémente à chaque échec sur `verifyCredentials`.
- Verrouille le compte après N échecs (ex. 10) pendant un délai croissant
  (1 min, 5 min, 30 min, 1 h…).
- Réinitialise le compteur après une connexion réussie.

Implémentation possible :

- Option A — colonnes `failedLoginCount` + `lockedUntil` sur `User`, mises à
  jour dans `verifyCredentials` (`server/utils/users.ts`).
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
