## 1. Création d'utilisateur (S-H1, roadmap §1)

- [ ] 1.1 Ajouter `ADMIN_IDUSERS` à `server/utils/config.ts` (liste d'entiers > 0, vide par défaut) et un helper `requireAdmin(event)` (403)
- [ ] 1.2 `server/api/signup.post.ts` : `requireAdmin`, schéma `strictObject` sans `IDuser`, calcul serveur de `MAX(IDuser)+1` (≥ 1), refus si l'`IDuser` est déjà référencé dans `Compte`/`Categorie`/`Credit`/`Bien`, retente unique en cas de collision de clé primaire
- [ ] 1.3 Tests API : non-admin → 403, `IDuser` dans le corps → 4xx, `IDuser` attribué > 0 et sans données orphelines, anonyme → 401
- [ ] 1.4 Vérifier en base de production qu'aucun `User.IDuser ≤ 0` n'existe (requête documentée dans `docs/db-migrations.md`)

## 2. Rate-limit et verrouillage (S-H2, roadmap §1-§2)

- [ ] 2.1 Configurer `security.rateLimiter.ipHeader` sur `x-real-ip` pour `/api/users/login`, avec repli sur l'IP de socket ; documenter la configuration du reverse proxy (pose de `X-Real-IP` / écrasement de `X-Forwarded-For`) dans `README.md` et `CLAUDE.md`
- [ ] 2.2 Réécrire `tests/api/zz-rate-limit.spec.ts` : la rotation de `X-Forwarded-For` ne contourne plus la limite
- [ ] 2.3 Migration SQL : `User.failedLoginCount INT NOT NULL DEFAULT 0`, `User.lockedUntil DATETIME NULL` ; mettre à jour `server/db/schema.ts`
- [ ] 2.4 `verifyCredentials` (`server/utils/users.ts`) : refuser sans bcrypt tant que `lockedUntil > now`, incrémenter et poser le palier (10 échecs → 1 min, 5 min, 30 min, 1 h max), remettre à zéro sur succès
- [ ] 2.5 Log structuré JSON de chaque tentative (résultat, `IDuser`, IP de confiance, UA, horodatage, jamais le code)
- [ ] 2.6 Tests API : lockout au 10ᵉ échec, bon code refusé pendant le verrouillage, déverrouillage après délai (horloge simulée), remise à zéro sur succès
- [ ] 2.7 Documenter dans la spec ou le README la condition « stockage partagé du rate-limit si plusieurs instances »

## 3. Contrôle des références (S-M1, S-B4)

- [ ] 3.1 Dans `server/utils/resources.ts`, valider `IDcredit` (null ou crédit de l'utilisateur) pour `Operation` et `OperationRecurrente`, en mutualisant le helper déjà utilisé par `Bien`
- [ ] 3.2 Valider `IDcat` (0, catégorie partagée ou de l'utilisateur) pour `Operation`, `OperationRecurrente` et `Credit`, en création, remplacement et mise à jour unitaire ou en masse
- [ ] 3.3 Ajouter `compteScope(operations.IDcompte)` dans `server/api/credits/[id]/payments.get.ts` et `remaining-balance.get.ts`
- [ ] 3.4 Requête d'audit en production : lister les `Operation`/`OperationRecurrente` dont l'`IDcredit` ou l'`IDcat` appartient à un autre utilisateur que celui du compte, puis corriger à la main
- [ ] 3.5 Tests API : opération avec `IDcredit` d'autrui → 404 ; `IDcat` privé d'autrui → 404 ; catégorie partagée acceptée ; opération étrangère ignorée par `payments`/`remaining-balance`

## 4. Banques (S-M3, roadmap §1)

- [ ] 4.1 Réserver `PATCH /`, `PATCH /{id}`, `PUT /{id}` et `DELETE /{id}` de `banques` à `requireAdmin` (hook ou option dans la définition de ressource)
- [ ] 4.2 Refuser `DELETE /api/banques/{id}` par 409 si un `Compte` référence la banque
- [ ] 4.3 Vérifier qu'aucun écran du front ne modifie ni ne supprime de banque ; adapter le cas échéant
- [ ] 4.4 Tests API : PATCH en masse non-admin → 403, suppression d'une banque référencée → 409, création non-admin → 200

## 5. Anti-énumération et unicité (S-M4, roadmap §1)

- [ ] 5.1 Générer `DUMMY_HASH` au coût 12 dans `server/utils/users.ts` ; comparaison à temps constant (`crypto.timingSafeEqual`) pour le chemin legacy
- [ ] 5.2 Écrire `scripts/hash-legacy-secrets.mjs` (hash bcrypt coût 12 des `secret_key` non `$2…`, en mode `--dry-run` par défaut)
- [ ] 5.3 Après exécution en production : supprimer le chemin legacy de `verifyCredentials` et le test associé
- [ ] 5.4 Migration `UNIQUE KEY (id)` sur `User`, précédée d'un contrôle des doublons qui échoue avec un message explicite ; procédure de dédoublonnage dans `docs/db-migrations.md`

## 6. Robustesse (S-B1, S-B2)

- [ ] 6.1 Résoudre `crudResources` par `Object.hasOwn` (ou `Map`) dans `server/utils/resources.ts` et `server/api/[resource]/*.ts` ; test `GET /api/constructor` → 404
- [ ] 6.2 Retirer `headers` de la réponse de `server/api/ping.get.ts` après avoir vérifié qu'aucun outil de supervision ne s'en sert ; mettre à jour le test

## 7. Session HttpOnly, CSRF et JWT (S-M2, S-B3)

- [ ] 7.1 Migration SQL : `User.tokenVersion INT NOT NULL DEFAULT 0` ; mettre à jour le schéma Drizzle
- [ ] 7.2 `server/utils/auth.ts` : signature et vérification `HS256` avec `issuer`/`audience` `mccbng`, claim `tv`, message 401 générique (raison journalisée)
- [ ] 7.3 `requireAuth` : lire `mccbngAuth` en priorité, accepter le Bearer en transition, relire `User` par `IDuser` et refuser un `tv` périmé ou un utilisateur absent
- [ ] 7.4 Middleware CSRF : pour `POST`/`PUT`/`PATCH`/`DELETE`, exiger `X-Requested-With: mccbng` et un `Origin` égal à l'origine de l'application s'il est présent (403 sinon), en exemptant `POST /api/users/login` du contrôle de session mais pas de l'en-tête
- [ ] 7.5 `POST /api/users/login` : ne plus renvoyer le JWT dans le corps (`{ userId }`) ; `logout` : incrémenter `tokenVersion` puis effacer le cookie
- [ ] 7.6 Front `app/services/http.ts` : `credentials: 'same-origin'`, en-tête `X-Requested-With: mccbng`, suppression de l'en-tête `Authorization`
- [ ] 7.7 Front `app/services/auth.ts` et `app/middleware/auth.global.ts` : ne plus écrire ni lire `userToken`, supprimer un `userToken` hérité, détecter la session via `GET /api/users/exists`
- [ ] 7.8 Front `app/pages/config.vue` : appeler `POST /api/users/logout`, réinitialiser les stores et ne retirer du `localStorage` que les clés de session
- [ ] 7.9 Tests : session par cookie seul, 403 CSRF sans en-tête, jeton rejoué après logout → 401, utilisateur supprimé → 401, algorithme `none` ou `HS512` → 401 ; tests front de `services/auth`
- [ ] 7.10 Mettre à jour `CLAUDE.md` (section « How It All Connects ») et `docs/architecture.md`
- [ ] 7.11 Version suivante : retirer l'acceptation du Bearer et les tests correspondants

## 8. Refresh tokens (roadmap §3, optionnel)

- [ ] 8.1 Migration : table `RefreshToken(id, IDuser, hash, expiresAt, revokedAt, replacedBy)`
- [ ] 8.2 Émettre le refresh token au login (cookie `mccbngRefresh`, `HttpOnly`, `SameSite=Strict`, `Path=/api/users/refresh`) et réduire `JWT_TTL_SECONDS` par défaut à 900
- [ ] 8.3 `POST /api/users/refresh` : rotation, détection de rejeu avec révocation de la famille ; logout révoque la famille
- [ ] 8.4 Front : sur 401, tenter un refresh une seule fois avant de rediriger vers `/login`
- [ ] 8.5 Tests API de rotation, rejeu et expiration

## 9. Documentation

- [ ] 9.1 Mettre à jour `docs/security-roadmap.md` : renvoyer vers ce change, puis retirer à l'archivage les points réalisés (signup admin, banques, unicité `User.id`, lockout, refresh tokens) ; la conversion InnoDB renvoie vers `harden-db-schema-and-cleanup`
- [ ] 9.2 Documenter `ADMIN_IDUSERS` dans la table des variables d'environnement de `CLAUDE.md` et dans `docker-entrypoint.sh` (optionnelle)
