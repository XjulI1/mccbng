## Context

L'API Nitro (`server/`) authentifie chaque route `/api/**` (sauf `GET /api/ping` et `POST /api/users/login`) par un JWT en `Authorization: Bearer`. Le front stocke ce JWT dans le cookie non-HttpOnly `userToken` (`app/services/auth.ts`). Le serveur pose en parallèle un cookie `HttpOnly` `mccbngAuth` qui n'est lu nulle part. Le login est un email + un code de 6 chiffres (bcrypt coût 12), limité à 5 essais / 15 min / IP par `nuxt-security`, qui lit l'IP via `getRequestIP(event, { xForwardedFor: true })`, c'est-à-dire la **première** valeur de `X-Forwarded-For`.

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
- Fermer S-H1 et S-H2 en priorité, dans une première livraison indépendante.
- Faire respecter partout le contrat d'isolation déjà écrit dans `api-server-foundation` (« les écritures MUST contrôler la propriété des `IDcompte` et `IDcredit` référencés »).
- Ne plus exposer de jeton de session à JavaScript.
- Mettre en œuvre les §1 et §2 de la roadmap. Le §3 est livré en phase 2 optionnelle.

**Non-Goals :**
- Conversion MyISAM → InnoDB : portée par `harden-db-schema-and-cleanup`.
- Changement du facteur d'authentification (code plus long, TOTP, WebAuthn) : il est seulement évoqué dans les questions ouvertes.
- Gestion des rôles au-delà d'une liste d'administrateurs.

## Decisions

### D1. Administrateurs = variable `ADMIN_IDUSERS`
Une liste d'`IDuser` séparés par des virgules, lue au runtime comme les autres variables. Un helper `requireAdmin(event)` répond 403 hors liste.
- *Alternative* : une colonne `role` sur `User`. Plus propre, mais il faut une migration et une UI pour une application qui compte une poignée d'utilisateurs. La variable est réversible et suffit.

### D2. `IDuser` attribué par le serveur
`POST /api/signup` ignore et rejette (`strictObject`) tout `IDuser` du corps. Le serveur calcule `MAX(IDuser) + 1`, en démarrant à 1, puis vérifie qu'aucune ligne `Compte`/`Categorie`/`Credit`/`Bien` ne porte déjà cet `IDuser` avant l'insertion (garde-fou contre les orphelins). La transaction est réelle une fois `User` passée en InnoDB. D'ici là, l'insert de `User` vient en dernier.
- *Alternative* : passer `IDuser` en `AUTO_INCREMENT`. C'est un changement de schéma sur une colonne de production non auto-incrémentée ; on le reporte.

### D3. IP de confiance pour le rate-limit
On configure `security.rateLimiter.ipHeader = 'x-real-ip'` (option de `nuxt-security`). Le reverse proxy pose `X-Real-IP` (ou écrase `X-Forwarded-For`), et la contrainte est documentée dans le README. En production, si l'en-tête est absent, on se replie sur l'adresse de la socket, jamais sur XFF.
- Le compteur reste en mémoire tant qu'il n'y a qu'une instance. On passe à un driver `unstorage` partagé (Redis) si l'application est un jour répliquée : exigence notée dans la spec, implémentation conditionnelle.
- Le test `tests/api/zz-rate-limit.spec.ts`, qui fait tourner les IP via XFF, est réécrit pour utiliser l'en-tête de confiance.

### D4. Lockout par compte (roadmap §2, option A)
On ajoute les colonnes `failedLoginCount INT NOT NULL DEFAULT 0` et `lockedUntil DATETIME NULL` sur `User`, mises à jour dans `verifyCredentials` (`server/utils/users.ts`).
- Après 10 échecs, verrouillage de 1 min, puis 5 min, 30 min et 1 h (palier max) à chaque nouvel échec.
- Remise à zéro sur succès.
- Pendant le verrouillage, la réponse est 401 `Invalid email or code.`. On ne répond pas 423, pour ne pas révéler l'existence du compte. Le bcrypt n'est pas exécuté (coupe le vecteur DoS).
- La comparaison factice reste exécutée pour les emails inconnus.

Le journal des tentatives est un log structuré JSON (`event: 'login'`, `success`, `IDuser|null`, IP de confiance, UA, horodatage) émis par le serveur, sans table dédiée.
- *Alternative* : l'option B (table `LoginAttempt`) n'est retenue que si une détection automatisée est voulue plus tard.

### D5. Session par cookie HttpOnly + CSRF
- `requireAuth` lit `mccbngAuth` en priorité. Le Bearer reste accepté pendant **une** version de transition (tokens déjà distribués), puis est retiré (tâche dédiée).
- `POST /api/users/login` ne renvoie plus le JWT : il renvoie `{ userId }`. Le front ne stocke plus `userToken`, seulement `userID`, qui n'est pas secret.
- Protection CSRF, en plus de `SameSite=Strict` : pour toute méthode non sûre (`POST`, `PUT`, `PATCH`, `DELETE`), le serveur exige l'en-tête `X-Requested-With: mccbng` et un `Origin` égal à l'origine de l'application. Le client HTTP du front ajoute l'en-tête systématiquement.
- Révocation : on ajoute la colonne `tokenVersion INT NOT NULL DEFAULT 0` sur `User`, embarquée dans le JWT (`tv`). `POST /api/users/logout` incrémente `tokenVersion` et efface le cookie. `requireAuth` relit `User` (par `IDuser`) et refuse un `tv` périmé ou un utilisateur supprimé. Cela coûte une requête indexée par appel, acceptable pour l'application.
- *Alternative* : une liste de `jti` révoqués. Elle demande un stockage et une purge, sans gain ici.

### D6. JWT durci
On utilise `jwt.verify(token, secret, { algorithms: ['HS256'], issuer: 'mccbng', audience: 'mccbng' })` et `jwt.sign(..., { algorithm: 'HS256', issuer, audience })`. Le message 401 devient `Invalid or expired token` ; la raison détaillée n'est journalisée que côté serveur. L'exigence existante, qui imposait `Error verifying token : <raison>`, est modifiée en conséquence.

### D7. Propriété des références à l'écriture
Le `validate` des ressources `Operation`, `OperationRecurrente` et `Credit` (`server/utils/resources.ts`) vérifie :
- `IDcredit` : null, ou un crédit de l'utilisateur, avec le même helper que pour `Bien` ;
- `IDcat` : 0 (sans catégorie), une catégorie partagée (`IDuser = 0`) ou une catégorie de l'utilisateur.

Sinon, la réponse est 404, comme pour `IDcompte`. Les routes `credits/[id]/payments` et `remaining-balance` ajoutent `compteScope(operations.IDcompte)` au filtre `IDcredit = :id`.

### D8. Banques
- Ouvert à tous : `GET` et `POST`.
- Réservé à `requireAdmin` : `PATCH /`, `PATCH /{id}`, `PUT /{id}` et `DELETE /{id}`.
- `DELETE` répond 409 si un `Compte` référence la banque.
- Le front ne modifie pas les banques aujourd'hui, donc aucun impact UI ; à vérifier dans les tâches.

### D9. Anti-énumération
- `DUMMY_HASH` passe au même coût que les vrais hash (12).
- Un script `scripts/hash-legacy-secrets.mjs` (one-shot) hashe les `secret_key` encore en clair.
- Une fois exécuté en production, on supprime le chemin legacy de `verifyCredentials` et l'exigence de migration paresseuse.
- Les 409 de `signup` (admin) et de `me.patch` (authentifié) sont conservés : ils sont réservés à des appelants authentifiés, l'énumération y est jugée acceptable.

### D10. Unicité de `User.id`
Une migration SQL vérifie d'abord les doublons. Elle échoue avec un message explicite s'il en reste. Elle ajoute ensuite `UNIQUE KEY (id)`. Le dédoublonnage manuel est documenté dans `docs/db-migrations.md`.

### D11. Robustesse
- `crudResources` est résolu par `Object.hasOwn` (ou converti en `Map`) : un nom inconnu, prototype compris, donne 404.
- `GET /api/ping` renvoie `{ greeting, date, url }` sans `headers`. On vérifie au préalable qu'aucun consommateur (monitoring) ne lit `headers`.

### D12. Refresh tokens (phase 2, optionnelle)
- Access token court : 15 min.
- Refresh token opaque de 32 octets aléatoires, stocké hashé (SHA-256) dans une table `RefreshToken(id, IDuser, hash, expiresAt, revokedAt, replacedBy)`.
- Cookie `mccbngRefresh`, `HttpOnly`, `SameSite=Strict`, `Path=/api/users/refresh`.
- `POST /api/users/refresh` fait tourner le jeton. Réutiliser un jeton déjà tourné révoque toute la famille.
- Le logout révoque la famille.

## Risks / Trade-offs

- [Reconnexion forcée de tous les utilisateurs au déploiement de D5] → Période de transition où Bearer et cookie sont acceptés ; communiquer la date.
- [Proxy mal configuré (XFF non écrasé, `X-Real-IP` absent)] → Repli sur l'IP de socket en production. Toutes les requêtes partagent alors l'IP du proxy, d'où un 429 global possible. On l'accepte, car c'est plus sûr qu'un contournement, et on vérifie le comportement en staging avant la production.
- [Lockout utilisé pour bloquer la victime (déni de service ciblé)] → Paliers plafonnés à 1 h, remise à zéro sur succès. Combiné au rate-limit IP, le coût pour l'attaquant reste élevé.
- [Une requête `User` de plus par appel (D5)] → Recherche par clé primaire `IDuser`, négligeable. On peut ajouter un cache mémoire de quelques secondes si besoin.
- [CSRF : l'en-tête `Origin` est absent sur certains clients] → On accepte l'absence d'`Origin` si `X-Requested-With` est présent, puisqu'un formulaire cross-site ne peut pas poser cet en-tête, et on rejette un `Origin` différent.
- [Le calcul `MAX+1` d'`IDuser` en concurrence] → Signup admin, rare. La clé primaire rejette le doublon, et on retente une fois.

## Migration Plan

1. **Livraison 1 (urgente, sans changement de session)** : D1, D2, D3, D4, D7, D8, D9 (hash factice), D11. Une migration ajoute `failedLoginCount`/`lockedUntil`. Il faut configurer le proxy et `ADMIN_IDUSERS` avant le déploiement.
2. Exécuter `scripts/hash-legacy-secrets.mjs` en production, puis supprimer le chemin legacy (D9).
3. Migration `UNIQUE(User.id)` après dédoublonnage (D10).
4. **Livraison 2** : D5 + D6, avec la migration `tokenVersion` ; Bearer accepté en transition.
5. **Livraison 3** : retrait du Bearer.
6. **Phase 2 optionnelle** : D12.

Rollback : chaque livraison est réversible par redéploiement de l'image précédente. Les colonnes ajoutées sont tolérées par l'ancien code (valeurs par défaut).

## Open Questions

- Faut-il allonger le code de connexion (8 caractères, alphanumérique) ? Cela imposerait de changer le clavier numérique de `login.vue` et de redéfinir les codes existants.
- Liste exacte des administrateurs et procédure de création d'utilisateur, par l'UI ou par un script.
- Un outil de supervision consomme-t-il les `headers` de `GET /api/ping` ?
