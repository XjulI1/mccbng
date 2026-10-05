## 1. Création d'utilisateur (S-H1, roadmap §1)

- [x] 1.1 Supprimer `server/api/signup.post.ts`, ses tests et tout code devenu mort (écriture de `UserCredentials`, helpers associés) ; vérifier que `tests/integration/routes.spec.ts` et la doc ne le référencent plus
- [x] 1.2 Écrire `scripts/hash-code.mjs` et le script `pnpm hash-code <code>` : validation 6 caractères, affichage du hash bcrypt coût 12
- [x] 1.3 Documenter la procédure phpMyAdmin de création d'utilisateur (choix d'un `IDuser` > 0 jamais attribué, requêtes de contrôle sur `Compte`/`Categorie`/`Credit`/`Bien`, `email` unique, `secret_key` via `pnpm hash-code`, valeur de `id` tant que la colonne existe)
- [ ] 1.4 Vérifier en base de production qu'aucun `User.IDuser ≤ 0` n'existe (requête documentée dans `docs/db-migrations.md`) — requête dans `docs/exploitation.md` (à exécuter en production)

## 2. Rate-limit et verrouillage (S-H2, roadmap §1-§2)

- [x] 2.1 Configurer `security.rateLimiter.ipHeader` sur `x-real-ip` pour `/api/users/login`, avec repli sur l'IP de socket ; documenter la configuration du reverse proxy Synology DSM (« Proxy inversé » → en-tête `X-Real-IP $http_cf_connecting_ip`, Cloudflare étant devant DSM) dans `README.md` et `CLAUDE.md`
- [x] 2.2 Vérifier en staging que l'IP vue par le serveur est bien celle du client (et non celle du NAS) — validé le 2026-10-05 après passage de DSM à `$http_cf_connecting_ip` (IP Cloudflare `104.23.229.94` avant, IP client ensuite)
- [ ] 2.9 Vérifier que le NAS n'est joignable que par Cloudflare (port 443 limité aux plages Cloudflare, ou Cloudflare Tunnel), sans quoi `CF-Connecting-IP` est forgeable
- [x] 2.10 Rate-limit IPv6 par préfixe `/64` (`rateLimitKey` dans `server/utils/client-ip.ts`), IP complète conservée pour le journal ; tests unitaires et test d'API (6 adresses d'un même `/64` → 429)
- [x] 2.3 Réécrire `tests/api/zz-rate-limit.spec.ts` : la rotation de `X-Forwarded-For` ne contourne plus la limite
- [x] 2.4 Migration SQL : `User.failedLoginCount INT NOT NULL DEFAULT 0`, `User.lockedUntil DATETIME NULL` ; mettre à jour `server/db/schema.ts`
- [x] 2.5 `verifyCredentials` (`server/utils/users.ts`) : refuser sans bcrypt tant que `lockedUntil > now`, incrémenter et poser le palier (5 échecs → 5 min, puis 30 min, 2 h, 24 h max), remettre à zéro sur succès
- [x] 2.6 Log structuré JSON de chaque tentative (`success`/`failure`/`locked`, `IDuser`, IP de confiance, UA, horodatage, jamais le code)
- [x] 2.7 Tests API : lockout au 5ᵉ échec, bon code refusé pendant le verrouillage, paliers successifs, déverrouillage après délai (horloge simulée), remise à zéro sur succès
- [x] 2.8 Documenter la procédure de déverrouillage manuel (phpMyAdmin) et la condition « stockage partagé du rate-limit si plusieurs instances »

## 3. Contrôle des références (S-M1, S-B4)

- [x] 3.1 Dans `server/utils/resources.ts`, valider `IDcredit` (null ou crédit de l'utilisateur) pour `Operation` et `OperationRecurrente`, en mutualisant le helper déjà utilisé par `Bien`
- [x] 3.2 Valider `IDcat` (0, catégorie partagée ou de l'utilisateur) pour `Operation`, `OperationRecurrente` et `Credit`, en création, remplacement et mise à jour unitaire ou en masse
- [x] 3.3 Ajouter `compteScope(operations.IDcompte)` dans `server/api/credits/[id]/payments.get.ts` et `remaining-balance.get.ts`
- [ ] 3.4 Requête d'audit en production : lister les `Operation`/`OperationRecurrente` dont l'`IDcredit` ou l'`IDcat` appartient à un autre utilisateur que celui du compte, puis corriger à la main — requêtes dans `docs/exploitation.md` (à exécuter en production)
- [x] 3.5 Tests API : opération avec `IDcredit` d'autrui → 404 ; `IDcat` privé d'autrui → 404 ; catégorie partagée acceptée ; opération étrangère ignorée par `payments`/`remaining-balance`

## 4. Banques (S-M3, roadmap §1)

- [x] 4.1 Retirer `PATCH /`, `PATCH /{id}`, `PUT /{id}` et `DELETE /{id}` de la ressource `banques` (option de méthodes autorisées dans la définition de ressource, réponse 404/405 au format uniforme)
- [x] 4.2 Vérifier qu'aucun écran du front ne modifie ni ne supprime de banque ; adapter le cas échéant
- [x] 4.3 Tests API : `PATCH /api/banques`, `PATCH`/`PUT`/`DELETE /api/banques/{id}` refusés sans modification ; `GET` et `POST` → 200
- [x] 4.4 Documenter la modification/suppression d'une banque via phpMyAdmin (contrôle préalable des `Compte` qui la référencent)

## 5. Anti-énumération et `secret_key` (S-M4)

- [x] 5.1 Générer `DUMMY_HASH` au coût 12 dans `server/utils/users.ts`
- [x] 5.2 Écrire `scripts/hash-legacy-secrets.mjs` (hash bcrypt coût 12 des `secret_key` non `$2…`, simulation par défaut, `--apply` pour écrire)
- [ ] 5.4 Exécuter `scripts/hash-legacy-secrets.mjs` en production avant le déploiement (procédure dans `docs/exploitation.md`)
- [x] 5.3 Supprimer le chemin legacy de `verifyCredentials` (clé non bcrypt → 401) et le test associé ; ajouter le test « clé en clair refusée »

## 6. Robustesse (S-B1, S-B2)

- [x] 6.1 Résoudre `crudResources` par `Object.hasOwn` (ou `Map`) dans `server/utils/resources.ts` et `server/api/[resource]/*.ts` ; test `GET /api/constructor` → 404
- [x] 6.2 Retirer `headers` de la réponse de `server/api/ping.get.ts` ; mettre à jour le test

## 7. Session HttpOnly, CSRF et JWT (S-M2, S-B3)

- [x] 7.1 Migration SQL : `User.tokenVersion INT NOT NULL DEFAULT 0` (même fichier que 2.4) ; mettre à jour le schéma Drizzle
- [x] 7.2 `server/utils/auth.ts` : signature et vérification `HS256` avec `issuer`/`audience` `mccbng`, payload `{ name, email, IDuser, tv }` sans `id`, message 401 générique (raison journalisée) ; `JWT_TTL_SECONDS` par défaut à 21600
- [x] 7.3 Retirer `users.id` de `server/db/schema.ts` et de `server/api/users/me.patch.ts` ; adapter les fixtures de `tests/api` qui insèrent des utilisateurs
- [x] 7.4 `requireAuth` : lire uniquement `mccbngAuth` (Bearer refusé), relire `User` par `IDuser` et refuser un `tv` périmé ou un utilisateur absent
- [x] 7.5 Middleware CSRF : pour `POST`/`PUT`/`PATCH`/`DELETE`, exiger `X-Requested-With: mccbng` et un `Origin` égal à l'origine de l'application s'il est présent (403 sinon), en exemptant `POST /api/users/login` du contrôle de session mais pas de l'en-tête
- [x] 7.6 `POST /api/users/login` : ne plus renvoyer le JWT dans le corps (`{ userId }`) ; `logout` : incrémenter `tokenVersion` puis effacer le cookie
- [x] 7.7 Front `app/services/http.ts` : `credentials: 'same-origin'`, en-tête `X-Requested-With: mccbng`, suppression de l'en-tête `Authorization`
- [x] 7.8 Front `app/services/auth.ts`, `app/stores/user.ts` et `app/middleware/auth.global.ts` : ne plus écrire ni lire `userToken` ni de jeton en store, supprimer un `userToken` hérité, détecter la session via `GET /api/users/exists`
- [x] 7.9 Front `app/pages/config.vue` : appeler `POST /api/users/logout`, réinitialiser les stores et ne retirer du `localStorage` que les clés de session ; un échec réseau n'empêche pas la déconnexion locale
- [x] 7.10 Tests : session par cookie seul, Bearer seul → 401, 403 CSRF sans en-tête, jeton rejoué après logout → 401 (y compris un second jeton du même utilisateur), utilisateur supprimé → 401, algorithme `none` ou `HS512` → 401 ; tests front de `services/auth`
- [x] 7.11 Mettre à jour `CLAUDE.md` (section « How It All Connects », TTL par défaut 6 h) et `docs/architecture.md`

## 8. Documentation et suites

- [x] 8.1 Mettre à jour `docs/security-roadmap.md` : renvoyer vers ce change, puis retirer à l'archivage les points réalisés (signup, banques, lockout) ; noter les refresh tokens comme abandonnés (TTL 6 h) et l'unicité de `User.id` comme sans objet (colonne supprimée) ; la conversion InnoDB renvoie vers `harden-db-schema-and-cleanup`
- [x] 8.2 Ajouter à `harden-db-schema-and-cleanup` la migration `DROP COLUMN User.id` et `DROP TABLE UserCredentials`, à déployer après ce change
- [x] 8.3 Rassembler les procédures phpMyAdmin (création d'utilisateur, changement de code, déverrouillage, banques) dans un même document d'exploitation
