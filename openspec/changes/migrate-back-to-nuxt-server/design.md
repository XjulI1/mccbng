## Context

L'API (`back/`, LoopBack 4 + juggler + `loopback-connector-mysql`) expose ~79 routes sous `/api`, authentifiées par JWT (Bearer), et tourne dans une image Docker distincte (`mccbng/api`). Le front (Nuxt 4, SPA, Nitro) la joint via un proxy transitoire `front/server/api/[...path].ts` (`API_URL`). Le change archivé `migrate-front-to-nuxt` a préparé cette étape.

Particularités à préserver (relevées dans le code) :
- **Filtre LoopBack** : le front envoie `?filter={where,order,limit,skip,include}` (JSON) sur les listes (`comptes` avec `include banque`, `operations` avec `or/like/inq`, `categories` avec `or`). Il faut donc un interpréteur de filtre restreint côté Nitro.
- **Scoping** : direct (`IDuser`) vs hérité (`IDcompte inq`) ; catégories partagées `IDuser = 0` lisibles mais non modifiables.
- **Cascade crédit** : création → `OperationRecurrente` mensuelle ; suppression → récurrente supprimée + `IDcredit` mis à `NULL` sur les opérations (aujourd'hui sans transaction).
- **Auto-génération** : au plus une occurrence par récurrente et par appel (seuils 15 j / 335 j), alors que `CLAUDE.md` parle de « replay des occurrences manquées ».
- **SQL analytique brut** (`DATE_FORMAT`, jointures, `FLOAT`) dans `StatsRepository` et `OperationController`.
- **Front** : `http.ts` ne lit que `response.ok` / le statut ; le contenu des erreurs n'est pas exploité, ce qui réduit le risque de régression sur le format d'erreur.
- **Docs divergentes** : `back/CLAUDE.md` décrit un login « code seul, secret_key en clair, secret JWT régénéré à chaque démarrage » alors que le code fait email + code bcrypt, `JWT_SECRET` optionnel, TTL 1 h, cookie HttpOnly et logout.

Décisions déjà arrêtées avec le propriétaire du projet : Drizzle + mysql2 ; livraison « big bang » par domaines dans un seul change ; contrat d'API iso avec corrections mineures listées ; abandon d'OpenAPI/Swagger ; auth iso (durcissement ultérieur) ; `nuxt-security` pour rate-limit + en-têtes ; migrations SQL versionnées avec baseline ; suppression de `back/` ; Zod ; tests Vitest + MySQL jetable + parité + recette ; image unique configurée par env.

## Goals / Non-Goals

**Goals:**
- Un seul processus, une seule image : Nitro sert le front et `/api/**`.
- Contrat HTTP identique (URLs, méthodes, statuts, formes JSON) pour que `front/app/` ne change pas.
- Aucun changement du schéma de production ; baseline SQL.
- Preuve d'équivalence par tests (intégration, parité, recette) avant suppression de LoopBack.
- Validation Zod et en-têtes de sécurité en plus, sans changer le comportement fonctionnel.

**Non-Goals:**
- Nouvelles fonctionnalités métier, refonte de l'API ou du modèle de données.
- Durcissement d'auth au-delà de l'existant : lockout par compte, refresh tokens, `nuxt-auth-utils`, suppression du token lisible en JS (`docs/security-roadmap.md` items 2-3).
- Documentation OpenAPI générée.
- Rate-limit distribué (instance unique supposée).
- Migration de `FLOAT` vers `DECIMAL`.

## Decisions

### D1. Drizzle ORM + mysql2
Schéma TS miroir de la base (`front/server/db/schema.ts`), pool `mysql2/promise` créé dans un plugin Nitro et fermé à l'arrêt (`close` hook). SQL analytique réécrit en ``sql`...` `` / `db.execute` paramétré, requêtes copiées à l'identique d'abord puis seulement refactorées si les tests de parité passent.
*Alternatives* : mysql2 seul (beaucoup de CRUD répétitif), Prisma (engine lourd, SQL brut moins naturel), Kysely (moins de tooling de migration). Drizzle garde le typage sans masquer le SQL.

### D2. Structure `front/server/`
```
server/
  api/                    # une route par fichier : comptes/index.get.ts, comptes/[id].patch.ts, …
  db/{schema.ts,client.ts,migrations/}
  middleware/auth.ts      # vérifie le JWT pour /api/** sauf routes publiques
  plugins/{db.ts,errors.ts}
  utils/{auth.ts,errors.ts,filter.ts,scope.ts,validate.ts,crud.ts}
```
Un helper `defineCrud(resource, {scope, schema, hooks})` factorise les 8 routes CRUD répétées pour banques/comptes/catégories/opérations/récurrentes/crédits/biens, avec des hooks `beforeCreate`/`afterCreate`/`beforeDelete` pour les cascades. Les routes spécifiques (`management-info`, `sum*`, `stats/*`, `auto-generation`, etc.) sont des fichiers dédiés. *Alternative* : écrire chaque route à la main (≈ 60 fichiers quasi identiques, risque de divergence de scoping).

### D3. Authentification
Middleware Nitro `server/middleware/auth.ts` appliqué à `/api/**` avec une liste blanche (`/api/ping`, `/api/users/login`). `jsonwebtoken` conservé (HS256, claims `id,name,email,IDuser`) ; la compatibilité des sessions existantes n'est pas un objectif. `getCurrentUserId(event)` reprend la sémantique de l'actuel `getCurrentUserId(profile)` (401 si `IDuser` non numérique). Cookie `mccbngAuth` posé via `setCookie` avec les mêmes attributs. Le login conserve la comparaison bcrypt factice et la migration paresseuse.
*Écart assumé* : `JWT_SECRET` devient **obligatoire en production** (aujourd'hui optionnel, secret aléatoire sinon) pour éviter l'invalidation silencieuse des sessions ; en dev un secret éphémère est généré avec avertissement.

### D4. Rate-limit et en-têtes via `nuxt-security`
Règle `routeRules` ciblant `/api/users/login` : 5 essais / 15 min / IP (`tokensPerInterval: 4`, car le module ne décompte pas la 1re requête de la fenêtre), Aucun middleware de rate-limit maison n'est écrit : seule la configuration de `nuxt-security` est utilisée. Si le module ne sait pas ignorer les connexions réussies (`skipSuccessfulRequests` d'express-rate-limit), tous les essais de login sont comptés (écart C6, accepté). Le module lit `X-Forwarded-For` par défaut : le reverse proxy DOIT l'écraser (et non l'ajouter), sinon la limite est contournable ; l'option `ipHeader` du module permet de cibler un autre en-tête. Les réponses 429 gardent le corps par défaut de h3/nuxt-security (le front ne lit que le statut).
La CSP est calibrée par itération (PWA, Highcharts, styles inline, Eruda lazy) ; démarrer en `Content-Security-Policy-Report-Only` sur staging avant de passer en enforce.

### D5. Interpréteur de filtre LoopBack restreint
`utils/filter.ts` parse `filter` (JSON, taille limitée) et le traduit en conditions Drizzle : `where` (égalité, `and`, `or`, `inq`, `like`, éventuellement `gt/lt/gte/lte/neq/between` si le front les utilise), `order`, `limit` (plafonné), `skip`, `include` (relation `banque` uniquement). Colonnes en liste blanche par ressource ; le scope utilisateur est toujours combiné par `and`. Tout opérateur/colonne inconnu → 400. *Alternative* : réécrire les appels du front avec des query params dédiés — refusé pour garder le front inchangé.

### D6. Transactions
Création/suppression de crédit, auto-génération (par récurrente) et signup s'exécutent dans `db.transaction`. **Attention (DDL de production)** : `Operation`, `OperationRecurrente`, `Compte`, `Categorie`, `Banque` et `User` sont en **MyISAM**, qui ignore les transactions ; seules `Credit`, `Bien` et `UserCredentials` sont InnoDB. Les transactions ne sont donc pas atomiques en production tant que ces tables ne sont pas converties (`ALTER TABLE … ENGINE=InnoDB`, hors périmètre, à proposer en change ultérieur). Le comportement reste identique à LoopBack (écritures séquentielles).

### D7. Validation et erreurs
Schémas Zod par ressource (create/replace/patch) ; un plugin Nitro `error` normalise toute erreur en `{ error: { statusCode, name, message } }`, y compris `ZodError` (422) et erreurs inattendues (500 générique + log). Statuts alignés sur LoopBack : 401 token, 404 hors scope, 409 conflit, 400 paramètres, 422 corps invalide.

### D8. Migrations
Un runner SQL minimal (`front/scripts/db-migrate.mjs`, sans `drizzle-kit`) applique dans l'ordre les fichiers de `server/db/migrations/` et les enregistre dans la table `__migrations` ; `0000_baseline.sql` décrit le schéma existant (tables + index, y compris `Bien` et `Categorie.Type`) et est marqué « joué » en prod via `db:migrate -- --baseline`. Pas de `--rebuild`. Une tâche Nitro ou script `pnpm db:migrate` s'exécute manuellement (étape de déploiement), pas au démarrage, pour éviter les migrations concurrentes.

### D9. Tests
*Résultat* : le scénario de parité (≈130 appels couvrant tous les domaines) passe : mêmes statuts et mêmes corps 2xx ; seuls les messages d'erreur 404 diffèrent (C13). Il a permis de corriger : réponse de création (C14), ordre de génération des récurrentes (pop), dates et défauts.

- **Intégration** : Vitest + `@nuxt/test-utils` (`setup({ server: true })`) + Testcontainers MySQL 8, jeu de données seed par fixture, deux utilisateurs pour les tests d'isolation.
- **Parité** : script (`tests/parity/`) démarrant l'ancien back LoopBack (encore présent dans le repo pendant la transition) et Nitro sur la **même base de test**, rejouant des scénarios et comparant les réponses normalisées. Retiré avec `back/` à la fin.
- **Recette manuelle** sur staging.
*Alternative* : mocks de la DB — refusée car les risques portent sur le SQL et `FLOAT`.

### D10. Déploiement et bascule
Une image `front` unique (Dockerfile existant, env `DB_*`, `JWT_SECRET`). `build-and-push.sh` et `docker-compose.build.yml` ne construisent plus `api`. Bascule : déployer staging, recette, déployer prod (les sessions existantes peuvent être invalidées), puis retirer `mccbng/api`. Rollback : redéployer l'ancienne image `front` (proxy) + `api` — conservées taguées jusqu'à stabilisation.

## Corrections mineures et écarts connus (à valider en revue)

| # | Sujet | Comportement LoopBack | Nitro |
|---|-------|-----------------------|-------|
| C1 | `JWT_SECRET` | optionnel | obligatoire en prod |
| C2 | Cascades crédit / auto-génération / signup | sans transaction | transactionnelles dans le code, mais sans effet sur les tables MyISAM de production (cf. D6) |
| C3 | Corps invalides | validation OpenAPI LB4 (422) | validation Zod (422) |
| C4 | Doc `CLAUDE.md` | décrit login par code seul | aligné sur le code réel |
| C5 | En-têtes de sécurité | absents | `nuxt-security` |
| C6 | Rate-limit du login | succès non comptés ; corps `{error:{…}}` | `nuxt-security` : succès comptés aussi, corps 429 par défaut du module |
| C7 | `POST /signup` | renvoie l'utilisateur avec `secret_key` hashée | ne renvoie jamais `secret_key` |
| C8 | `GET /ping` | renvoie tous les en-têtes de la requête | omet `authorization` et `cookie` |
| C9 | `PUT /credits/{id}` | `IDopRecu` effaçable par le client | `IDopRecu` (lien serveur) conservé |
| C10 | Paramètres obligatoires manquants (`monthNumber`, `id`…) | erreur SQL / 500 | 400 explicite |
| C11 | Routage | un contrôleur par ressource | routes explicites pour comptes/operations/operation-recurrentes/credits (leurs sous-répertoires masquent `[resource]`), `[resource]` pour banques/categories/biens |
| C12 | Validation des corps | schémas LoopBack stricts (dates `date-time` complètes, `Type` obligatoire sur catégorie, `IDuser` sur PUT compte/crédit, `Usage` sur bien) | Zod plus permissif (sur-ensemble : tout ce que LoopBack accepte l'est aussi) ; champs inconnus ignorés |
| C13 | Messages d'erreur 404 | `Entity not found: Banque with id N`, `Compte N not found` (opération d'autrui) | `Banque N not found`, `Operation N not found` (statuts identiques) |
| C14 | Réponse de création | entité insérée (colonnes NULL absentes) | idem (données + défauts + clé générée) |
| C15 | Recherche de l'utilisateur courant (`whoAmI`, `PATCH /users/me`, upgrade du hash) | par la colonne `id`, non unique en production (id historique de 1 caractère, lignes dupliquées) : un utilisateur peut lire le profil d'un autre | par `IDuser` (clé primaire, déjà dans le JWT) |
| K1 | `Banque` sans scope utilisateur | tout utilisateur authentifié lit/écrit | **inchangé** (écart connu, hors périmètre) |
| K2 | `POST /signup` | accessible à tout utilisateur authentifié | **inchangé** (écart connu, hors périmètre) |
| K3 | Auto-génération | 1 occurrence max par appel | **inchangé** (la doc est corrigée, pas le code) |

## Risks / Trade-offs

- [Régression des SQL analytiques (`DATE_FORMAT`, `FLOAT`, fuseaux/dates)] → copie à l'identique, tests de parité sur jeu de données représentatif, comparaison à 2 décimales ; fuseau de connexion mysql2 fixé (`timezone`) comme juggler.
- [Sérialisation des dates/`DECIMAL` par mysql2 différente de juggler (Date vs string)] → option `dateStrings`/transformation explicite pour reproduire les formats JSON, vérifiée en parité.
- [Interpréteur de filtre : injection ou contournement du scope] → liste blanche stricte, paramétrage, scope combiné en dernier, tests dédiés.
- [CSP trop stricte cassant PWA/Highcharts] → mode report-only sur staging puis enforce.
- [Rate-limit en mémoire perdu au redémarrage / contourné derrière proxy / succès comptés] → acceptable (instance unique) ; configurer l'IP de confiance du module.
- [Sessions invalidées à la bascule] → acceptable : les utilisateurs se reconnectent une fois, aucune continuité de session n'est recherchée.
- [Big bang : pas de bascule progressive] → parité + recette + rollback par images conservées.
- [Pool MySQL dans un runtime Nitro (HMR en dev)] → client singleton mis en cache sur `globalThis`, fermeture propre sur `close`.
- [Taille du change] → tâches regroupées par domaine, livrables vérifiables séparément (tests par domaine).

## Migration Plan

1. Poser le socle (DB, schéma, erreurs, auth, filtre, CRUD helper, sécurité) à côté de LoopBack ; le proxy `[...path].ts` reste en dernier recours, les routes Nitro migrées ayant la priorité.
2. Migrer par domaine : auth → référentiel → opérations/récurrentes → crédits/biens → stats, chacun avec ses tests d'intégration et de parité.
3. Écrire la baseline et la commande de migration.
4. Déploiement staging (variables `DB_*`/`JWT_SECRET`), recette multi-utilisateur, CSP en report-only puis enforce.
5. Déploiement production, surveillance, puis suppression de `back/`, de l'image `api`, du proxy et de `API_URL`, et mise à jour de la documentation.

**Rollback** : redéployer les images `front` (proxy) et `api` précédentes ; aucune modification de données n'ayant été faite, aucun retour arrière de schéma n'est nécessaire.

## Constats sur le schéma de production (dump DDL)

- `User` : clé primaire `IDuser` (INT, non auto-incrémenté, donc obligatoire à la création) ; `id` varchar(128), `email` varchar(255) unique.
- Moteurs : MyISAM (Banque, Categorie, Compte, Operation, OperationRecurrente, User) et InnoDB (Bien, Credit, Stats, UserCredentials) ; jeux de caractères utf8mb3 sauf `Bien` (utf8mb4).
- Défauts SQL différents des modèles LoopBack (`Operation.IDcat`, `Credit.Statut/IDcat`, `Compte.bloque/visible/…` sans défaut) : les défauts sont appliqués par l'API.
- `User.id` n'est pas une clé : la ligne existante porte un identifiant court (1 caractère), et rien n'empêche des doublons. L'API n'utilise donc que `IDuser` pour retrouver un utilisateur (C15).
- Aucun index secondaire sur `Operation.IDcompte` (hors périmètre).
- Table `Stats` : héritée, sans usage par l'API.
- La baseline `0000_baseline.sql` reprend ce DDL réel (sans données).

## Open Questions

- Faut-il rendre `Banque` scopable par utilisateur et restreindre `POST /signup` à un rôle admin ? (K1/K2 : proposés comme futurs changes.)
- Y a-t-il des tokens ou clients externes (scripts, autre app) appelant l'API directement et dépendant de `/explorer` ou de l'OpenAPI ?
- Version MySQL cible pour les tests (8.x vs MariaDB) ?
