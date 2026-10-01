## 1. Bootstrap Nuxt

- [x] 1.1 Créer une branche dédiée et installer la dernière version de Nuxt 4 et vérifier que `future.compatibilityVersion: 5` est supporté (lister ses effets dans la PR)
- [x] 1.2 Ajouter `nuxt`, `pinia`, `@pinia/nuxt`, `@vite-pwa/nuxt`, `@nuxt/eslint`, `vitest`, `@nuxt/test-utils` ; fixer la version exacte de Nuxt
- [x] 1.3 Créer `front/nuxt.config.ts` : `ssr: false`, `future.compatibilityVersion: 5`, `imports.autoImport: false`, `components: { dirs: [] }`, port dev 8080
- [x] 1.4 Configurer l'injection SCSS globale de `variables.scss` (`vite.css.preprocessorOptions.scss.additionalData`) et l'alias `@` → `app/`
- [x] 1.5 Créer `server/api/[...path].ts` : handler Nitro `proxyRequest` vers `process.env.API_URL` (défaut `http://localhost:3000`), lu à l'exécution
- [x] 1.6 Mettre à jour `tsconfig.json` (étend `.nuxt/tsconfig.json`) et les scripts `package.json` (`dev`, `build`, `build:staging`, `preview`, `type-check`)
- [x] 1.7 Retirer `core-js` et la clé `browserslist` de `package.json` (Nuxt gère la cible de build) et leurs usages éventuels

## 2. Restructuration en app/

- [x] 2.1 `git mv` de `src/components`, `src/composables`, `src/services`, `src/styles` vers `app/` (styles dans `app/assets/styles/`)
- [x] 2.2 `git mv src/App.vue app/app.vue` et adapter le layout (AccountHeader, CompteList, `<NuxtPage />`, NavBar)
- [x] 2.3 Déplacer `public/` tel quel et vérifier les chemins d'icônes/favicon
- [x] 2.4 Ajouter explicitement tous les imports (`vue`, `#imports`, `pinia`, `#components`) dans les fichiers existants ; vérifier que `nuxt prepare` + `type-check` passent
- [x] 2.5 Plugin `app/plugins/fontawesome.ts` enregistrant `<FontAwesomeIcon>` globalement
- [x] 2.6 Plugin `app/plugins/touch-events.client.ts` pour `vue3-touch-events`
- [x] 2.7 Adapter `useTheme` et `useDebugTools` (accès `window`/`localStorage` protégés, Eruda toujours en import dynamique)
- [x] 2.8 Charger Highcharts côté client uniquement dans les composants `Stats/*`

## 3. Routing file-based

- [x] 3.1 Générer `front/tests/fixtures/routes.ts` (24 entrées : path, sample, parent, componentName, disabledTotalHeader) depuis `router.ts` avant sa suppression, relire à la main (y compris `/gestion`, `/comptesGestion`, `/newCompte`, `/editCompte/:id`) ; vérifier par grep si les noms de routes français sont consommés (`route.name`)
- [x] 3.2 Créer `app/pages/index.vue` (Home) et ses pages enfants overlay : `newOperation`, `editOperation/:id`, `search`, `transfert`, `retrait` en conservant des URLs à la racine
- [x] 3.3 Créer `recurrOperation`, `amortissement`, `gestion`, `comptesGestion` (+ enfants `newCompte`, `editCompte/:id`), `credits` (+ enfants), `biens` (+ enfants), `stats`, `login`, `config`, `editUser`
- [x] 3.4 Adapter `RouteOverTheContent` pour recevoir `componentName` depuis chaque page enfant et rendre le formulaire correspondant
- [x] 3.5 Remplacer `meta.disabledTotalHeader` par `definePageMeta({ disabledTotalHeader: true })` et mettre à jour `AccountHeader`
- [x] 3.6 Écrire `front/tests/integration/routes.spec.ts` (`@nuxt/test-utils`, environnement `nuxt`, `it.each` sur la fixture) : résolution + `params.id`, chaîne `matched` parent/enfant, `componentName`, `disabledTotalHeader`
- [x] 3.7 Ajouter au test l'égalité d'ensemble `getRoutes()` (hors routes internes Nuxt) ↔ fixture, et le cas d'URL inconnue
- [x] 3.8 Faire passer le test (ajuster `definePageMeta` / arborescence `pages/`), puis supprimer `router.ts` et les `webpackChunkName`

## 4. Migration Vuex → Pinia

- [x] 4.1 Créer `app/stores/display.ts` et `app/stores/category.ts` (stores simples, chargement paresseux conservé)
- [x] 4.2 Créer `app/stores/user.ts` (`fetchUser`, `updateUser`, `saveUserToken`, `toggleMaskAmount`, `maskAmount`)
- [x] 4.3 Créer `app/stores/compte.ts` avec tous les getters de totaux/filtres et les actions de génération d'opérations récurrentes
- [x] 4.4 Créer `app/stores/operation.ts` (pagination 35, recherche, transferts, récurrentes)
- [x] 4.5 Créer `app/stores/stats.ts` (dont `getCategoriesTotalForHighchartPie`)
- [x] 4.6 Créer `app/stores/credit.ts` et `app/stores/bien.ts`
- [x] 4.7 Remplacer tous les `useStore()` / `store.state` / `dispatch` des composants et vues par `useXStore()` + `storeToRefs`
- [x] 4.8 Supprimer `store/index.ts`, la dépendance `vuex` et vérifier l'absence de référence résiduelle (grep)
- [x] 4.9 Écrire des tests Vitest pour les getters de `compte`, la pagination d'`operation` et le masquage des montants

## 5. Authentification

- [x] 5.1 Réécrire `services/auth.ts` avec `useCookie` (`userToken`, `userID`, mêmes options) et retirer `universal-cookie`
- [x] 5.2 Créer `app/middleware/auth.global.ts` (redirection vers `/login`, validation via `GET /api/users/exists`, nettoyage des cookies si invalide, pas de boucle sur `/login`)
- [x] 5.3 Retirer le force-push `/login` d'`app.vue` et déplacer le chargement comptes/catégories après authentification
- [x] 5.4 Adapter `Login.vue`, `Config.vue` (logout) et `EditUser.vue`
- [x] 5.5 Vérifier le cas d'un cookie posé avant migration et celui d'un token invalidé par redémarrage du back

## 6. PWA

- [x] 6.1 Configurer `@vite-pwa/nuxt` (manifest « MCCB NG », icônes 192/512, `autoUpdate`, `service-worker.js`)
- [x] 6.2 Exclure `/api/**` du fallback de navigation du service worker
- [x] 6.3 Supprimer `registerServiceWorker.js`, `register-service-worker` et `vite-plugin-pwa` direct
- [ ] 6.4 Tester la mise à jour depuis un navigateur ayant l'ancien service worker installé

## 7. Tests et lint

- [x] 7.1 Configurer Vitest (`vitest.config.ts` avec `@nuxt/test-utils`) et porter `tests/unit/example.spec.js`
- [x] 7.2 Supprimer Jest, Babel, `vue3-jest`, `ts-jest`, `identity-obj-proxy`, `jest.config.js`, `babel.config.js`
- [x] 7.3 Configurer `@nuxt/eslint` (flat config) et supprimer l'ancienne config ESLint et ses plugins ; adapter `lint-staged`
- [x] 7.4 Corriger les violations de lint et de types ; `pnpm lint:check` et `pnpm type-check` verts

## 8. Docker et livraison

- [x] 8.1 Réécrire `front/Dockerfile` (`node:22-slim`, corepack/pnpm, `pnpm install --frozen-lockfile`, `pnpm build`, runtime avec `.output/` uniquement)
- [x] 8.2 Exposer le port 8080 (`NITRO_PORT=8080`, `EXPOSE 8080`), `API_URL` en variable d'environnement, healthcheck ; adapter `docker:run` et les compose en conséquence
- [x] 8.3 Supprimer `front/nginx.conf` ; vérifier `docker-compose.build.yml`, `build-and-push.sh` et les scripts `docker:*`
- [ ] 8.4 Construire l'image en local et vérifier : page d'accueil, URL profonde (`/editCredit/3`), proxy `/api`, login complet contre le back
- [x] 8.5 Documenter la procédure de rollback (retag de l'ancienne image nginx)

## 9. Recette et documentation

- [ ] 9.1 Dérouler `docs/recette-non-regression-multiuser.md` sur la version Nuxt (desktop et mobile : swipe, overlays, pagination, thème, Highcharts, mask des montants)
- [x] 9.2 Mettre à jour `front/CLAUDE.md` (Nuxt, `app/`, Pinia, middleware, PWA, Vitest, Docker)
- [x] 9.3 Mettre à jour `CLAUDE.md` racine (stack front, ports, Docker) et `README.md`
- [ ] 9.4 Déploiement staging puis latest ; archiver le change avec `/opsx:archive`
