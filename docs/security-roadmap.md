# Roadmap sécurité — connexion

Ce document liste les améliorations de sécurité **non encore déployées** sur
le flux d'authentification.

> Les points marqués **[harden-api-security]** sont implémentés par le change
> OpenSpec `openspec/changes/harden-api-security` (procédure de déploiement :
> `docs/exploitation.md`). Ils seront retirés de ce document à l'archivage du change.

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

- **[harden-api-security]** **`Banque` n'est pas scopée par utilisateur** : tout
  utilisateur authentifié peut lire, modifier et supprimer toutes les banques.
  → Lecture et création seules par l'API ; modification et suppression en base.
- **[harden-api-security]** **`POST /api/signup` est ouvert à tout utilisateur
  authentifié**. → Route supprimée ; création des utilisateurs dans phpMyAdmin.
- **[harden-api-security]** Le rate-limit lit l'IP dans `X-Forwarded-For`.
  → IP lue dans `X-Real-IP` (reverse proxy), à défaut l'adresse de la socket.
- **`User.id` n'est pas unique en production** (la clé primaire est `IDuser`).
  → Sans objet : la colonne n'est plus utilisée par l'API depuis
  `harden-api-security` ; sa suppression (avec `UserCredentials`) est portée par
  `harden-db-schema-and-cleanup`.
- **Tables MyISAM** (`Operation`, `OperationRecurrente`, `Compte`, `Categorie`,
  `Banque`, `User`) : les transactions de l'API n'ont aucun effet. Conversion en
  InnoDB portée par le change `harden-db-schema-and-cleanup` (migration versionnée).
- Rate-limit **partagé** (stockage externe) si l'application passe à plusieurs
  instances.

### 2. Verrouillage temporaire du compte (account lockout) — [harden-api-security]

Colonnes `failedLoginCount` + `lockedUntil` sur `User` (option A) : verrouillage
au 5ᵉ échec consécutif pendant 5 min, puis 30 min, 2 h et 24 h au maximum ;
remise à zéro après une connexion réussie. Chaque tentative produit une ligne de
log JSON (résultat, `IDuser`, IP, User-Agent, horodatage).

Option B (table `LoginAttempt` pour monitorer / alerter sur les patterns
suspects) : à reprendre si une détection automatisée devient nécessaire.

### 3. Refresh tokens — abandonné

Remplacé par un JWT de 6 h (`JWT_TTL_SECONDS=21600` par défaut), porté par le
cookie `HttpOnly` et révocable par `tokenVersion` au logout
**[harden-api-security]**.
