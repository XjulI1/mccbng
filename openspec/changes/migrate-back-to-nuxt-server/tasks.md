## 1. Socle serveur

- [x] 1.1 Ajouter les dépendances à `front/` : `drizzle-orm`, `mysql2`, `zod`, `jsonwebtoken`, `bcryptjs`, `nuxt-security` ; dev : `drizzle-kit`, `testcontainers`, types associés
- [x] 1.2 Lire la configuration (`DB_*`, `JWT_SECRET`, `JWT_TTL_SECONDS`) depuis `process.env` à l'exécution (`server/utils/config.ts`) avec échec au démarrage en production si une variable obligatoire manque
- [x] 1.3 Écrire `server/db/schema.ts` (9 tables, `FLOAT`, `ENUM`, défauts) à partir des modèles LoopBack et vérifier contre le DDL réel de production (dump de schéma fourni)
- [x] 1.4 Écrire `server/db/client.ts` (pool singleton, fermeture au `close`, options de dates/fuseau alignées sur juggler)
- [x] 1.5 Écrire `utils/errors.ts` et le wrapper `defineApiHandler` (un plugin Nitro ne peut pas surcharger le gestionnaire d'erreurs) (format `{ error: { statusCode, name, message } }`, ZodError → 422, 500 générique journalisé)
- [x] 1.6 Écrire `utils/validate.ts` (helpers Zod pour body/params/query)
- [x] 1.7 Écrire `utils/filter.ts` (parse `filter` LoopBack restreint, liste blanche, plafond `limit`, `include banque`) avec tests unitaires
- [x] 1.8 Écrire `utils/scope.ts` (`getCurrentUserId`, scope direct, `getUserCompteIds`, `assertOwned`/`assertCompteOwned` → 404)
- [x] 1.9 Écrire `utils/crud.ts` (`defineCrud`) avec hooks avant/après création, mise à jour, suppression
- [ ] 1.10 Configurer `nuxt-security` (en-têtes, CSP en report-only) en vérifiant PWA, Highcharts et Eruda
- [x] 1.11 Implémenter `GET /api/ping` (public)
- [x] 1.12 Mettre en place l'infrastructure de test : Vitest + `@nuxt/test-utils`, MySQL jetable via Testcontainers, fixtures à deux utilisateurs

## 2. Authentification

- [x] 2.1 Implémenter `utils/auth.ts` (signature/vérification JWT avec `IDuser`, TTL, secret) et le middleware `server/middleware/auth.ts` avec liste blanche
- [x] 2.2 Implémenter `POST /api/users/login` (bcrypt, comparaison factice, migration paresseuse, cookie `mccbngAuth`)
- [x] 2.3 Implémenter `POST /api/users/logout`, `GET /api/users/whoAmI`, `GET /api/users/exists`
- [x] 2.4 Implémenter `PATCH /api/users/me` (champs autorisés, 409 sur email en doublon)
- [x] 2.5 Implémenter `POST /api/signup` (409/400, hash bcrypt, `UserCredentials`, transaction)
- [x] 2.6 Configurer le rate-limit du login (5/15 min/IP) uniquement via `nuxt-security` (aucun middleware maison) et documenter si les succès sont comptés
- [x] 2.7 Tests d'intégration auth : login ok/ko, token expiré, mauvais secret, cookie, legacy plaintext, rate-limit, signup anonyme refusé

## 3. Référentiel (banques, comptes, catégories)

- [x] 3.1 Implémenter `/api/banques` (CRUD, comportement actuel non scopé)
- [x] 3.2 Implémenter `/api/comptes` (CRUD scopé, `include banque`, `IDuser` forcé)
- [x] 3.3 Implémenter `GET /api/comptes/management-info` et `GET /api/comptes/{id}/banque`
- [x] 3.4 Implémenter `/api/categories` (lecture user + partagées, écriture user seulement)
- [x] 3.5 Tests d'intégration : scoping multi-utilisateur, catégories partagées, filtres du front

## 4. Opérations et récurrentes

- [x] 4.1 Implémenter `/api/operations` (CRUD à scope hérité, vérif `IDcompte`, pagination, recherche `or/like`)
- [x] 4.2 Implémenter `sumAllCompteForUser`, `sumForACompte`, `sumByUserByMonth`, `sumCategoriesByUserByMonth` (SQL paramétré, `Type='depense'` selon le cas)
- [x] 4.3 Implémenter `suggestCategories` (limite 5, bornée 1-50, nom ≥ 2)
- [x] 4.4 Implémenter `/api/operation-recurrentes` (CRUD, vérif `IDcompte`)
- [x] 4.5 Implémenter `POST /api/operation-recurrentes/auto-generation` (seuils 15 j / 335 j, transaction par récurrente)
- [x] 4.6 Tests d'intégration : scoping, agrégats, filtres de `Type`, suggestions, auto-génération (échue / récente / annuelle)

## 5. Crédits et biens

- [x] 5.1 Implémenter `/api/credits` (CRUD, vérif `IDcompte`, champs serveur ignorés)
- [x] 5.2 Implémenter la cascade de création (récurrente mensuelle + `IDopRecu`) en transaction
- [x] 5.3 Implémenter la cascade de suppression (récurrente, `IDcredit` NULL sur opérations) en transaction
- [x] 5.4 Implémenter `remaining-balance` (amortissement, arrondi 2 décimales) et `payments`
- [x] 5.5 Implémenter `/api/biens` (CRUD, validation du crédit lié, `IDuser` forcé)
- [x] 5.6 Tests d'intégration : cascades, amortissement avec/sans taux, bien lié au crédit d'autrui

## 6. Statistiques

- [x] 6.1 Implémenter `GET /api/stats/evolutionSolde` (3 regroupements, soldes + séries)
- [x] 6.2 Implémenter `yearComparison`, `topCategories`, `categoryHeatmap` (`Type='depense'`, validations 400)
- [x] 6.3 Implémenter `incomeVsExpense` (groupé par `Type`) et `topOperations` (sans transferts)
- [x] 6.4 Tests d'intégration : filtres par `Type`, remboursement sur catégorie dépense, isolation entre utilisateurs

## 7. Migrations de schéma

- [x] 7.1 Écrire le script `db:migrate` (`scripts/db-migrate.mjs`, runner SQL maison, sans drizzle-kit) (table de suivi, idempotent, option `--baseline`)
- [x] 7.2 Écrire `0000_baseline.sql` (schéma existant + anciennes migrations `Bien` et `Categorie.Type`) et valider sur base vide
- [x] 7.3 Documenter la procédure de baseline en production (marquer comme jouée, sans exécuter)

## 8. Parité et validation

- [x] 8.1 Écrire le harnais de parité (LoopBack + Nitro sur la même base de test, normalisation des champs volatils)
- [x] 8.2 Écrire les scénarios de parité par domaine (auth, référentiel, opérations, crédits/biens, stats) et traiter chaque écart (corriger ou lister dans `design.md`)
- [ ] 8.3 Lancer `front` en dev contre l'API Nitro (proxy supprimé) et vérifier manuellement les parcours principaux
- [ ] 8.4 Déployer sur staging avec `DB_*`/`JWT_SECRET`, CSP en report-only, puis passer la recette `docs/recette-non-regression-multiuser.md`
- [ ] 8.5 Passer la CSP en mode enforce après revue des rapports

## 9. Déploiement et nettoyage

- [x] 9.1 Adapter le Dockerfile `front` (variables `DB_*`/`JWT_SECRET`, aucune config embarquée) et vérifier le démarrage en échec sans configuration
- [x] 9.2 Mettre à jour `build-and-push.sh`, `docker-compose.build.yml` et les workflows `.github/` (plus d'image `api`, plus de `API_URL`)
- [ ] 9.3 Déployer en production avec `JWT_SECRET` défini (reconnexion des utilisateurs acceptée) et surveiller
- [ ] 9.4 Supprimer `front/server/api/[...path].ts`, `back/`, le workspace `back` de `pnpm-workspace.yaml`, les dépendances LoopBack/Express et le harnais de parité
- [ ] 9.5 Mettre à jour `CLAUDE.md` (racine et `front/`), `README.md`, supprimer `back/CLAUDE.md` et aligner la doc sur le comportement réel de l'auth
- [ ] 9.6 Vérifier : `pnpm install`, `pnpm --filter @mccbng/front build|test|lint:check|type-check` réussissent et aucune référence à `@loopback`/`API_URL` ne subsiste
