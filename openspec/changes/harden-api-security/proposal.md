## Why

L'audit de code du 2026-10-05 a mis en évidence deux failles exploitables par un utilisateur authentifié ou anonyme (prise de contrôle des catégories partagées via `POST /api/signup` avec `IDuser: 0`, force brute du code de connexion à 6 chiffres en contournant le rate-limit par `X-Forwarded-For`) et plusieurs écarts au contrat d'isolation (`IDcredit`/`IDcat` d'autrui acceptés en écriture, banques partagées modifiables par tous). `docs/security-roadmap.md` listait déjà une partie de ces chantiers (signup admin, banques, lockout, refresh tokens…) sans plan d'exécution : ce change les regroupe en un seul lot priorisé.

## What Changes

- **BREAKING** `POST /api/signup` est réservé aux administrateurs (liste `ADMIN_IDUSERS`) ; l'`IDuser` est attribué par le serveur et n'est plus accepté dans le corps. Un `IDuser ≤ 0` ne peut plus exister.
- Le rate-limit du login lit l'IP depuis un en-tête posé par le reverse proxy de confiance (et non la première valeur de `X-Forwarded-For`, contrôlée par le client) ; stockage partagé requis dès qu'il y a plusieurs instances (roadmap §1).
- **Verrouillage temporaire par compte** après N échecs avec délai croissant, et journal structuré des tentatives de connexion (roadmap §2).
- Durcissement de l'anti-énumération : hash factice au même coût que les vrais hash, migration forcée des `secret_key` encore en clair puis suppression du chemin legacy.
- **BREAKING (front)** Session portée par le cookie `HttpOnly` `mccbngAuth` (déjà posé, jamais lu) avec protection CSRF ; le JWT n'est plus écrit dans `document.cookie` ni renvoyé au front ; le logout révoque réellement la session.
- JWT : algorithme figé (`HS256`), `iss`/`aud`, message 401 générique, refus d'un token dont l'utilisateur n'existe plus.
- (Optionnel, phase 2) Refresh token rotatif en cookie `HttpOnly` séparé et route `POST /api/users/refresh` (roadmap §3).
- Contrôle de propriété de `IDcredit` et de `IDcat` à l'écriture des opérations, récurrentes et crédits ; `payments` et `remaining-balance` ne lisent que les opérations des comptes de l'utilisateur.
- **BREAKING** Banques : création et lecture ouvertes, mais modification/suppression réservées aux administrateurs ; suppression refusée (409) si la banque est référencée (roadmap §1).
- Unicité de `User.id` en base après dédoublonnage (roadmap §1).
- Robustesse : résolution des ressources CRUD génériques sans passer par le prototype (`/api/constructor` → 404 au lieu de 500) ; `GET /api/ping` ne renvoie plus les en-têtes de la requête.
- La conversion MyISAM → InnoDB de la roadmap (§1) est portée par le change `harden-db-schema-and-cleanup` (migration `0001`), dont ce change dépend pour l'atomicité de la création d'utilisateur.
- `docs/security-roadmap.md` est mis à jour pour pointer vers ce change ; les points réalisés en sont retirés à l'archivage.

## Capabilities

### New Capabilities
<!-- aucune -->

### Modified Capabilities
- `api-auth` : signup réservé aux admins avec `IDuser` serveur, rate-limit sur IP de confiance, lockout par compte, journal des tentatives, cookie HttpOnly comme support de session + CSRF, JWT durci, révocation au logout, refresh token, unicité de `User.id`, fin de la migration paresseuse.
- `api-server-foundation` : isolation étendue à `IDcredit`/`IDcat`, résolution sûre des ressources génériques, ping minimal.
- `api-referentiel` : écriture des banques réservée aux admins, suppression d'une banque référencée refusée.
- `api-credits-biens` : routes `payments`/`remaining-balance` limitées aux opérations des comptes de l'utilisateur.
- `front-auth-session` : plus de JWT lisible en JavaScript, déconnexion via l'API.

## Impact

- **Code serveur** : `server/api/signup.post.ts`, `server/api/users/{login,logout}.post.ts`, `server/utils/{auth,users,scope,resources}.ts`, `server/middleware/auth.ts`, `server/api/[resource]/*.ts`, `server/api/ping.get.ts`, `server/api/credits/[id]/*.get.ts`, `nuxt.config.ts` (rate-limiter, `ipHeader`).
- **Code front** : `app/services/{auth,http}.ts`, `app/middleware/auth.global.ts`, `app/pages/config.vue`, `app/pages/login.vue`.
- **Données** : migration SQL ajoutant `failedLoginCount`/`lockedUntil` (ou table `LoginAttempt`), `tokenVersion` sur `User`, contrainte `UNIQUE(User.id)`, table `RefreshToken` (phase 2).
- **Configuration** : nouvelle variable `ADMIN_IDUSERS` ; le reverse proxy doit poser `X-Real-IP` (ou écraser `X-Forwarded-For`) — à documenter dans `README.md`/`CLAUDE.md`.
- **Utilisateurs** : une reconnexion est nécessaire au déploiement (changement de support de session).
- **Dépendance** : `harden-db-schema-and-cleanup` (InnoDB) pour l'atomicité de la création d'utilisateur.
