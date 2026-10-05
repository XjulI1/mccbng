## Why

L'audit de code du 2026-10-05 a mis en évidence deux failles exploitables par un utilisateur authentifié ou anonyme (prise de contrôle des catégories partagées via `POST /api/signup` avec `IDuser: 0`, force brute du code de connexion à 6 chiffres en contournant le rate-limit par `X-Forwarded-For`) et plusieurs écarts au contrat d'isolation (`IDcredit`/`IDcat` d'autrui acceptés en écriture, banques partagées modifiables par tous). `docs/security-roadmap.md` listait déjà une partie de ces chantiers (signup admin, banques, lockout, refresh tokens…) sans plan d'exécution : ce change les regroupe en un seul lot, livré en une fois.

## What Changes

- **BREAKING** `POST /api/signup` est **supprimé** (ainsi que l'écriture dans `UserCredentials`) : les utilisateurs sont créés à la main dans phpMyAdmin, avec une `secret_key` déjà hashée par une commande documentée (`pnpm hash-code`).
- Le rate-limit du login lit l'IP depuis `X-Real-IP`, posé par le reverse proxy Synology DSM (et non la première valeur de `X-Forwarded-For`, contrôlée par le client) ; stockage partagé requis dès qu'il y a plusieurs instances (roadmap §1).
- **Verrouillage temporaire par compte** après 5 échecs avec délai croissant (5 min → 30 min → 2 h → 24 h), et journal structuré des tentatives de connexion (roadmap §2).
- Durcissement de l'anti-énumération : hash factice au même coût que les vrais hash, hash one-shot des `secret_key` encore en clair avant le déploiement et suppression du chemin legacy.
- **BREAKING (front)** Session portée uniquement par le cookie `HttpOnly` `mccbngAuth` (déjà posé, jamais lu) avec protection CSRF ; le JWT n'est plus écrit dans `document.cookie` ni renvoyé au front ; le Bearer est retiré sans période de transition ; le logout révoque toutes les sessions de l'utilisateur.
- JWT : algorithme figé (`HS256`), `iss`/`aud`, message 401 générique, refus d'un token dont l'utilisateur n'existe plus, claim `id` retiré, TTL par défaut porté à 6 h (`JWT_TTL_SECONDS=21600`).
- Contrôle de propriété de `IDcredit` et de `IDcat` à l'écriture des opérations, récurrentes et crédits ; `payments` et `remaining-balance` ne lisent que les opérations des comptes de l'utilisateur.
- **BREAKING** Banques : seules la lecture et la création restent exposées ; `PATCH`, `PUT` et `DELETE` sont supprimés (modifications via phpMyAdmin) (roadmap §1).
- La colonne `User.id` (non unique, héritée de LoopBack) n'est plus utilisée par le code ; sa suppression en base, avec celle de la table `UserCredentials`, est portée par `harden-db-schema-and-cleanup`. L'exigence d'unicité de la roadmap devient sans objet.
- Robustesse : résolution des ressources CRUD génériques sans passer par le prototype (`/api/constructor` → 404 au lieu de 500) ; `GET /api/ping` ne renvoie plus les en-têtes de la requête.
- Les refresh tokens (roadmap §3) sont abandonnés au profit d'un TTL de 6 h.
- `docs/security-roadmap.md` est mis à jour pour pointer vers ce change ; les points réalisés en sont retirés à l'archivage.

## Capabilities

### New Capabilities
<!-- aucune -->

### Modified Capabilities
- `api-auth` : suppression du signup, rate-limit sur IP de confiance, lockout par compte, journal des tentatives, cookie HttpOnly comme unique support de session + CSRF, JWT durci sans `id`, révocation globale au logout, fin de la migration paresseuse au profit d'une commande de hash.
- `api-server-foundation` : isolation étendue à `IDcredit`/`IDcat`, résolution sûre des ressources génériques, ping minimal.
- `api-referentiel` : banques en lecture et création seules.
- `api-credits-biens` : routes `payments`/`remaining-balance` limitées aux opérations des comptes de l'utilisateur.
- `front-auth-session` : plus de JWT lisible en JavaScript, déconnexion via l'API.

## Impact

- **Code serveur** : suppression de `server/api/signup.post.ts` ; `server/api/users/{login,logout,me}.*.ts`, `server/utils/{auth,users,scope,resources,config}.ts`, `server/middleware/auth.ts`, `server/api/[resource]/*.ts`, `server/api/ping.get.ts`, `server/api/credits/[id]/*.get.ts`, `server/db/schema.ts`, `nuxt.config.ts` (rate-limiter, `ipHeader`).
- **Code front** : `app/services/{auth,http}.ts`, `app/stores/user.ts`, `app/middleware/auth.global.ts`, `app/pages/config.vue`, `app/pages/login.vue`.
- **Scripts** : `scripts/hash-code.mjs` (`pnpm hash-code <code>`), `scripts/hash-legacy-secrets.mjs` (one-shot).
- **Données** : migration SQL ajoutant `failedLoginCount`, `lockedUntil` et `tokenVersion` sur `User`. Le `DROP` de `User.id` et de `UserCredentials` est fait par `harden-db-schema-and-cleanup`.
- **Configuration** : aucune nouvelle variable ; `JWT_TTL_SECONDS` passe à 21600 par défaut ; le reverse proxy DSM doit poser `X-Real-IP` = `$http_cf_connecting_ip` (Cloudflare est devant DSM) et le NAS ne doit être joignable que par Cloudflare.
- **Exploitation** : procédure phpMyAdmin documentée pour créer un utilisateur, modifier une banque et déverrouiller un compte.
- **Utilisateurs** : une reconnexion est nécessaire au déploiement (changement de support de session) ; un logout déconnecte tous les appareils.
- **Dépendance** : aucune (la création d'utilisateur ayant disparu, l'atomicité InnoDB n'est plus requise ici).
