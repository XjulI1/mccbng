## Context

L'API Nitro (`server/`) authentifie chaque route `/api/**` (sauf `GET /api/ping` et `POST /api/users/login`) par un JWT en `Authorization: Bearer`. Le front stocke ce JWT dans le cookie non-HttpOnly `userToken` (`app/services/auth.ts`). Le serveur pose en parallèle un cookie `HttpOnly` `mccbngAuth` qui n'est lu nulle part. Le login est un email + un code de 6 chiffres (bcrypt coût 12), limité à 5 essais / 15 min / IP par `nuxt-security`, qui lit l'IP via `getRequestIP(event, { xForwardedFor: true })`, c'est-à-dire la **première** valeur de `X-Forwarded-For`.

L'application est servie derrière le reverse proxy Synology DSM. Les utilisateurs, peu nombreux, sont créés et administrés par l'exploitant directement dans phpMyAdmin ; aucun écran du front n'appelle `POST /api/signup` ni ne modifie de banque.

Constats de l'audit du 2026-10-05 traités ici :

| Réf. audit | Constat | Gravité |
|---|---|---|
| S-H1 | `POST /api/signup` accepte `IDuser: 0` → propriétaire des catégories partagées ; ou l'`IDuser` d'un utilisateur supprimé → récupère ses données orphelines | Haute |
| S-H2 | Rate-limit contournable par `X-Forwarded-For` ; pas de lockout ; 10⁶ codes ; bcrypt = vecteur de DoS CPU | Haute |
| S-M1 | `IDcredit` non contrôlé à l'écriture ; `payments`/`remaining-balance` non scopés par compte | Moyenne |
| S-M2 | JWT lisible en JS ; cookie HttpOnly inutilisé ; logout sans révocation | Moyenne |
| S-M3 | Banques modifiables/supprimables par tous (`PATCH /api/banques` sans `where` renomme tout) | Moyenne |
| S-M4 | Énumération d'email par timing (hash factice coût 10 vs 12, clés legacy en clair) | Moyenne |
| S-B1 | `GET /api/constructor` → 500 (lookup via prototype) | Basse |
| S-B2 | `GET /api/ping` public renvoie les en-têtes de la requête | Basse |
| S-B3 | `jwt.verify` sans `algorithms`, pas d'`iss`/`aud`, message 401 détaillé, token valide après suppression de l'utilisateur | Basse |
| S-B4 | `IDcat` d'une catégorie privée d'autrui accepté en écriture | Basse |

Ainsi que le contenu de `docs/security-roadmap.md` : §1 (banques, signup admin, unicité `User.id`, InnoDB, rate-limit partagé), §2 (lockout + log des tentatives), §3 (refresh tokens, optionnel).

## Goals / Non-Goals

**Goals :**
- Fermer S-H1 et S-H2.
- Faire respecter partout le contrat d'isolation déjà écrit dans `api-server-foundation` (« les écritures MUST contrôler la propriété des `IDcompte` et `IDcredit` référencés »).
- Ne plus exposer de jeton de session à JavaScript.
- Réduire la surface d'API à ce que le front utilise réellement (pas de signup, pas d'écriture de banque).
- Mettre en œuvre les §1 et §2 de la roadmap.

**Non-Goals :**
- Conversion MyISAM → InnoDB et `DROP` de `User.id` / `UserCredentials` : portés par `harden-db-schema-and-cleanup`.
- Changement du facteur d'authentification : le code reste à 6 chiffres. Le lockout et le rate-limit sont jugés suffisants pour une poignée d'utilisateurs ; un code plus long, TOTP ou WebAuthn relèveraient d'un change dédié.
- Notion d'administrateur ou de rôles dans l'API : l'administration passe par phpMyAdmin.
- Refresh tokens (roadmap §3) : abandonnés au profit d'un TTL de 6 h.

## Decisions

### D1. Suppression de `POST /api/signup`
La route `server/api/signup.post.ts` et ses tests sont supprimés ; `UserCredentials` n'est plus écrite par personne. Un utilisateur est créé dans phpMyAdmin selon une procédure documentée dans `docs/db-migrations.md` (ou un `docs/exploitation.md`) : `IDuser` strictement positif et jamais attribué (vérifier `Compte`/`Categorie`/`Credit`/`Bien`), `email` unique, `secret_key` = hash bcrypt produit par `pnpm hash-code <code>`.
- *Alternatives écartées* : signup réservé à une liste `ADMIN_IDUSERS` avec `IDuser` attribué par le serveur (`MAX+1`, garde-fou orphelins, retente) ; script CLI de création. Les deux ajoutent du code pour un besoin rare que phpMyAdmin couvre déjà.

### D2. IP de confiance pour le rate-limit
On configure `security.rateLimiter.ipHeader = 'x-real-ip'` (option de `nuxt-security`). Le reverse proxy Synology DSM pose `X-Real-IP $remote_addr` dans son modèle nginx par défaut ; c'est à **vérifier en staging** (en loguant l'IP vue par le serveur), et à ajouter comme en-tête personnalisé dans « Proxy inversé » si absent. En production, si l'en-tête est absent, on se replie sur l'adresse de la socket, jamais sur XFF.
- Le compteur reste en mémoire tant qu'il n'y a qu'une instance. On passe à un driver `unstorage` partagé (Redis) si l'application est un jour répliquée : exigence notée dans la spec, implémentation conditionnelle.
- Le test `tests/api/zz-rate-limit.spec.ts`, qui fait tourner les IP via XFF, est réécrit pour utiliser l'en-tête de confiance.

### D3. Lockout par compte (roadmap §2, option A)
On ajoute les colonnes `failedLoginCount INT NOT NULL DEFAULT 0` et `lockedUntil DATETIME NULL` sur `User`, mises à jour dans `verifyCredentials` (`server/utils/users.ts`).
- Au 5ᵉ échec consécutif, verrouillage de 5 min ; chaque nouvel échec après un verrouillage passe au palier suivant : 30 min, 2 h, puis 24 h (palier max).
- Remise à zéro sur succès.
- Pendant le verrouillage, la réponse est 401 `Invalid email or code.`. On ne répond pas 423, pour ne pas révéler l'existence du compte. Le bcrypt n'est pas exécuté (coupe le vecteur DoS).
- La comparaison factice reste exécutée pour les emails inconnus.
- Déverrouillage manuel : remettre `failedLoginCount = 0` et `lockedUntil = NULL` dans phpMyAdmin (procédure documentée).

Le journal des tentatives est un log structuré JSON (`event: 'login'`, `result: success|failure|locked`, `IDuser|null`, IP de confiance, UA, horodatage) émis par le serveur, sans table dédiée.
- *Alternative* : l'option B (table `LoginAttempt`) n'est retenue que si une détection automatisée est voulue plus tard.

### D4. Session par cookie HttpOnly + CSRF, bascule directe
- `requireAuth` lit **uniquement** `mccbngAuth`. Le header `Authorization: Bearer` n'est plus accepté, sans version de transition : les sessions en cours sont perdues au déploiement et les utilisateurs se reconnectent.
- `POST /api/users/login` ne renvoie plus le JWT : il renvoie `{ userId }`. Le front ne stocke plus `userToken`, seulement `userID`, qui n'est pas secret.
- Côté front, `userStore.token` devient un simple marqueur de session ouverte (`true | null`, `openSession`/`closeSession`). Les services continuent de recevoir ce paramètre `token` (une centaine d'appels), mais `app/services/http.ts` l'ignore. Le retirer de toutes les signatures est un nettoyage purement mécanique, laissé à un change ultérieur pour limiter le diff.
- Protection CSRF, en plus de `SameSite=Strict` : pour toute méthode non sûre (`POST`, `PUT`, `PATCH`, `DELETE`), le serveur exige l'en-tête `X-Requested-With: mccbng` et, si `Origin` est présent, une origine égale à celle de l'application. Le client HTTP du front ajoute l'en-tête systématiquement. `POST /api/users/login` est soumis à l'en-tête mais pas à la session.
- Révocation : on ajoute la colonne `tokenVersion INT NOT NULL DEFAULT 0` sur `User`, embarquée dans le JWT (`tv`). `POST /api/users/logout` incrémente `tokenVersion` et efface le cookie : **tous** les appareils de l'utilisateur sont déconnectés (choix assumé, qui sert aussi de « bouton panique » en cas de perte d'appareil). `requireAuth` relit `User` (par `IDuser`) et refuse un `tv` périmé ou un utilisateur supprimé. Cela coûte une requête par clé primaire par appel, acceptable pour l'application.
- *Alternative* : une liste de `jti` révoqués pour ne déconnecter que l'appareil courant. Elle demande un stockage et une purge, sans besoin exprimé.

### D5. JWT durci
- `jwt.verify(token, secret, { algorithms: ['HS256'], issuer: 'mccbng', audience: 'mccbng' })` et `jwt.sign(..., { algorithm: 'HS256', issuer, audience })`.
- Le payload devient `{ name, email, IDuser, tv }` : le claim `id` (colonne `User.id`, non unique, héritée de LoopBack) est retiré. `me.patch.ts` projette `IDuser` au lieu de `id`, et `users.id` disparaît de `server/db/schema.ts` (la colonne reste en base, `NOT NULL` sans défaut, jusqu'à son `DROP` dans `harden-db-schema-and-cleanup` ; aucune insertion n'est faite par l'API d'ici là).
- `JWT_TTL_SECONDS` passe à 21600 (6 h) par défaut, ce qui remplace les refresh tokens.
- Le message 401 devient `Invalid or expired token` ; la raison détaillée n'est journalisée que côté serveur. L'exigence existante, qui imposait `Error verifying token : <raison>`, est modifiée en conséquence.

### D6. Propriété des références à l'écriture
Le `validate` des ressources `Operation`, `OperationRecurrente` et `Credit` (`server/utils/resources.ts`) vérifie :
- `IDcredit` : null, ou un crédit de l'utilisateur, avec le même helper que pour `Bien` ;
- `IDcat` : 0 (sans catégorie), une catégorie partagée (`IDuser = 0`) ou une catégorie de l'utilisateur.

Sinon, la réponse est 404, comme pour `IDcompte`. Les routes `credits/[id]/payments` et `remaining-balance` ajoutent `compteScope(operations.IDcompte)` au filtre `IDcredit = :id`.

### D7. Banques en lecture et création seules
- Restent exposés : `GET /api/banques`, `GET /api/banques/{id}`, `POST /api/banques`.
- `PATCH /`, `PATCH /{id}`, `PUT /{id}` et `DELETE /{id}` sont retirés de la ressource `banques` (405 `MethodNotAllowedError` au format uniforme, via l'option `actions` de la définition de ressource). Renommer, fusionner ou supprimer une banque se fait dans phpMyAdmin.
- Le front ne modifie pas les banques aujourd'hui, donc aucun impact UI ; à vérifier dans les tâches.
- *Alternative écartée* : écriture réservée à `ADMIN_IDUSERS` avec 409 sur banque référencée. Sans signup, cette variable n'aurait servi qu'à ce cas.

### D8. `secret_key` exclusivement bcrypt
- `DUMMY_HASH` passe au même coût que les vrais hash (12).
- `scripts/hash-legacy-secrets.mjs` (one-shot, simulation par défaut, `--apply` pour écrire) hashe les `secret_key` encore en clair ; il est exécuté en production **avant** le déploiement.
- Le chemin legacy (comparaison en clair + re-hash paresseux) est supprimé dans la même livraison : toute `secret_key` non bcrypt est refusée (401).
- `scripts/hash-code.mjs`, exposé en `pnpm hash-code <code>`, valide le code (6 caractères) et affiche son hash bcrypt coût 12, à coller dans phpMyAdmin lors de la création d'un utilisateur ou d'un changement de code.
- Le 409 de `me.patch` (email déjà pris, appelant authentifié) est conservé : l'énumération y est jugée acceptable.

### D9. Robustesse
- `crudResources` est résolu par `Object.hasOwn` (ou converti en `Map`) : un nom inconnu, prototype compris, donne 404.
- `GET /api/ping` renvoie `{ greeting, date, url }` sans `headers` : aucun outil de supervision ne lit ce champ.

## Risks / Trade-offs

- [Reconnexion forcée de tous les utilisateurs au déploiement] → Bascule directe assumée : peu d'utilisateurs, TTL court ; communiquer la date.
- [Proxy mal configuré (`X-Real-IP` absent)] → Repli sur l'IP de socket en production. Toutes les requêtes partagent alors l'IP du proxy DSM, d'où un 429 global possible. On l'accepte, car c'est plus sûr qu'un contournement, et on vérifie le comportement en staging avant la production.
- [Lockout utilisé pour bloquer la victime (déni de service ciblé) ou auto-blocage jusqu'à 24 h] → Le rate-limit IP freine l'attaquant ; l'exploitant peut déverrouiller à la main dans phpMyAdmin (procédure documentée).
- [Logout = déconnexion de tous les appareils] → Choix assumé ; une déconnexion ponctuelle sur un appareil impose une reconnexion sur les autres.
- [JWT de 6 h volé reste valide jusqu'à expiration ou logout] → Le jeton n'est plus lisible en JS (HttpOnly) ; un logout révoque tous les jetons.
- [Une requête `User` de plus par appel (D4)] → Recherche par clé primaire `IDuser`, négligeable. On peut ajouter un cache mémoire de quelques secondes si besoin.
- [CSRF : l'en-tête `Origin` est absent sur certains clients] → On accepte l'absence d'`Origin` si `X-Requested-With` est présent, puisqu'un formulaire cross-site ne peut pas poser cet en-tête, et on rejette un `Origin` différent.
- [Création manuelle d'utilisateur dans phpMyAdmin (erreur d'`IDuser` réutilisé, clé en clair)] → Procédure documentée avec requêtes de contrôle ; une clé en clair est refusée au login, donc l'erreur se voit tout de suite.

## Migration Plan

Une seule livraison.

1. **Avant le déploiement** :
   - en staging, vérifier que DSM pose `X-Real-IP` (sinon l'ajouter dans « Proxy inversé ») ;
   - en production, exécuter les requêtes d'audit (aucun `User.IDuser ≤ 0`, références `IDcredit`/`IDcat` croisées) et corriger à la main ;
   - exécuter `scripts/hash-legacy-secrets.mjs` (dry-run, puis réel).
2. Appliquer la migration SQL (`failedLoginCount`, `lockedUntil`, `tokenVersion`) via `pnpm db:migrate`.
3. Déployer l'image : tous les utilisateurs se reconnectent.

Rollback : redéploiement de l'image précédente. Les colonnes ajoutées sont tolérées par l'ancien code (valeurs par défaut) ; les `secret_key` hashées restent compatibles (l'ancien code sait lire le bcrypt).

## Open Questions

<!-- aucune : cadrage terminé le 2026-10-05 -->
