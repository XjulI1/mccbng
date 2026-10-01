## Context

`front/` est une SPA Vue 3.5 + TypeScript assemblée manuellement : Vite (rolldown) avec `vite-plugin-pwa`, Vue Router 4 (`router.ts`, routes lazy + overlays `RouteOverTheContent`), Vuex 4 (8 modules sans namespace), `universal-cookie` pour `userToken`/`userID`, Jest + `vue3-jest`, ESLint 8 legacy, image Docker nginx (build encore sous yarn). L'API LoopBack est appelée en relatif sur `/api` (proxy Vite en dev, `window.env.VITE_API_URL` au runtime).

Cible : une app Nuxt SPA, sans SSR ni auto-imports, qui prépare l'hébergement futur de l'API dans `./server` (Nitro). Le back reste inchangé dans ce change.

## Goals / Non-Goals

**Goals:**
- Iso-fonctionnel : mêmes écrans, mêmes URLs, mêmes appels API, mêmes cookies.
- Nuxt 4 (dernière version stable), `ssr: false`, `future.compatibilityVersion: 5`, auto-imports (composables et composants) désactivés.
- Structure `app/` standard, routing file-based, Pinia, `useCookie`, `@vite-pwa/nuxt`, Vitest, `@nuxt/eslint`.
- Serveur Nitro déjà en place (proxy `/api`) pour que l'étape `./server` soit un simple remplacement de la cible du proxy.

**Non-Goals:**
- Migrer ou modifier le back, ou le contrat d'API.
- Activer le SSR/prerender, ou introduire `useFetch`/`useAsyncData` (les `services/` fetch actuels sont conservés).
- Refonte UI/UX ou ajout de fonctionnalités.
- Réécrire les composants en profondeur au-delà de ce que Pinia, le routing et les imports explicites imposent.

## Decisions

### 1. Nuxt SPA servie par Nitro (`nuxt build`), pas `nuxt generate`
Image Node qui exécute `.output/server/index.mjs`. Remplace nginx. **Pourquoi** : le proxy `routeRules` et la future API `./server` exigent un runtime Nitro. *Alternative écartée* : `nuxt generate` + nginx (plus simple, mais ne prépare pas l'étape suivante et nécessiterait un proxy nginx séparé).

### 2. `compatibilityVersion: 5` via `future`
Activé dans `nuxt.config.ts`. On reste sur **Nuxt 4 dernière version** avec ce flag (décision de cadrage, pas de bascule sur Nuxt 5). À l'implémentation, vérifier dans la doc de la version installée que la clé existe et lister les comportements Nuxt 5 qu'elle active. Les avertissements de dépréciation Nuxt sont traités comme des erreurs à corriger dans ce change.

### 3. Auto-imports désactivés
`imports: { autoImport: false }`, `components: { dirs: [] }` (équivalent de `components: false`). Tous les `ref`, `computed`, `useRoute`, `useRouter`, `defineStore`, `useCookie`, `navigateTo`, `defineNuxtPlugin`, etc. sont importés explicitement depuis `vue`, `#imports`, `pinia`, `#app`. `<NuxtPage />`, `<NuxtLink>` et `<NuxtLayout>` restent disponibles (composants natifs Nuxt, non issus de `components/`) ; si leur résolution dépend de `components`, les importer depuis `#components`. `<FontAwesomeIcon>` reste enregistré globalement par un plugin (`app/plugins/fontawesome.ts`) comme aujourd'hui. **Pourquoi** : choix explicite de l'équipe, lisibilité, comportement identique au code actuel.

### 4. Structure `app/`
`front/app/{app.vue,pages,components,composables,stores,plugins,middleware,assets}` + `front/app/services` conservé. `src/App.vue` devient `app/app.vue`, les styles vont dans `app/assets/styles/`, les assets statiques restent dans `front/public/`. `git mv` pour préserver l'historique. L'alias `@` (=`app/`) est maintenu pour limiter la réécriture des imports. SCSS : `vite.css.preprocessorOptions.scss.additionalData` reproduit l'injection de `variables.scss`.

### 5. Routing file-based, overlays en pages enfants
Mapping :

| Route actuelle | Fichier |
|---|---|
| `/` + enfants `newOperation`, `editOperation/:id`, `search`, `transfert`, `retrait` | `pages/index.vue` + `pages/index/*.vue` |
| `/recurrOperation` + `newRecurrOperation`, `editRecurrOperation/:id` | `pages/recurrOperation.vue` + `pages/recurrOperation/*.vue` |
| `/amortissement`, `/gestion`, `/stats`, `/login`, `/config`, `/editUser` | `pages/<nom>.vue` |
| `/comptesGestion` + `newCompte`, `editCompte/:id` | idem, dossier enfants (route absente de la doc CLAUDE.md, présente dans `router.ts`) |
| `/credits` + `newCredit`, `editCredit/:id` ; `/biens` + `newBien`, `editBien/:id` | idem, dossiers enfants |

Les chemins enfants actuels sont absolus à la racine (ex. `/newOperation`, `/editOperation/:id`, voir `router.ts`) : on les conserve avec `definePageMeta({ path })` ou en les nichant, de façon que **les URLs publiques ne changent pas**. Chaque page enfant rend `RouteOverTheContent` avec son `componentName` ; `definePageMeta({ disabledTotalHeader: true })` remplace `meta`. Les `webpackChunkName` disparaissent (le découpage est automatique). *Alternative écartée* : `app/router.options.ts` (migration minimale mais perd les conventions Nuxt).

#### Stratégie de test de la table de routes
- **Fixture** : `front/tests/fixtures/routes.ts` exporte un tableau `{ path, sample, parent?, componentName?, disabledTotalHeader }` de 24 entrées (11 pages racine + 13 overlays enfants incluant les 4 routes `/gestion`, `/comptesGestion`, `/newCompte`, `/editCompte/:id`), où `sample` est une URL instanciée (`/editCredit/12`). Elle est **générée une fois** depuis `router.ts` avant sa suppression (tâche 3.1), relue à la main, puis figée.
- **Test** : `front/tests/integration/routes.spec.ts` en environnement `nuxt` de `@nuxt/test-utils` ; il récupère le routeur réel de l'app (`useRouter()`), pas un routeur reconstruit. Il est paramétré avec `it.each` sur la fixture.
- **Vérifications** : (1) résolution de `sample` + `params.id` ; (2) `matched` = `[parent, enfant]` pour les overlays ; (3) `componentName` des overlays (valeurs kebab-case actuelles : `operation-form`, `transfert-form`, `search`, `operation-recurrente-form`, `compte-form`, `credit-form`, `bien-form`) ; (4) `meta.disabledTotalHeader` ; (5) égalité d'ensemble entre `getRoutes()` (hors routes internes Nuxt) et la fixture ; (6) URL inconnue sans correspondance applicative.
- **Noms de routes dans le contrat** : `route.name` est consommé par le code (`TransfertForm` distingue « Virement » / « Retrait » et l'affiche, `app.vue` et `NavBar` testent `'Login'`, `Login` fait `router.replace({ name: 'Home' })`). Les noms français actuels sont donc conservés via `definePageMeta({ name })` et vérifiés par la fixture.
- **Meta effective** : `disabledTotalHeader` est vérifié sur la `route.meta` résolue, qui fusionne la meta du parent ; les overlays des pages à totaux masqués héritent donc de `true` (comportement actuel d'`AccountHeader`).
- **`componentName` en meta** : les props de route n'existant pas en file-based, chaque overlay déclare `componentName` via `definePageMeta` et `RouteOverTheContent` le lit dans `route.meta`.
- **Limite assumée** : le test valide le routage, pas le rendu des composants (couvert par la recette manuelle 9.1) ni le middleware d'auth (testé séparément en 5.x).

### 6. Vuex → Pinia
Un store Pinia par module (9 modules, dont `banque` absent de la doc initiale ; `app/stores/<module>.ts`), en style *setup stores* (`defineStore('x', () => {...})`) pour rester proche du Composition API actuel : state → `ref`, getters → `computed`, actions → fonctions. Conserver les noms d'actions/getters pour minimiser les changements aux composants ; les mutations appelées directement par les vues (`setActiveAccount`, `setOperationsOfActiveAccount`) deviennent des actions de même nom. Les composants sont réécrits par codemod (`store.state.x.y` → `xStore.y`, `dispatch`/`commit` → appel direct). `API_URL` devient la constante `services/config.ts` (chaîne vide, appels relatifs) qui remplace `window.env.VITE_API_URL`. Les dispatch inter-modules (ex. `compte` ↔ `operation`, `credit` récupérant les soldes) deviennent des appels directs `useXStore()` à l'intérieur de l'action (jamais au top-level du module, pour éviter les cycles). Règle existante conservée : pas d'HTTP dans les mutations ; les `services/` font l'I/O.

### 7. Auth : `useCookie` + middleware global
`app/middleware/auth.global.ts` : si pas de cookie `userToken` valide et route ≠ `/login`, `navigateTo('/login')`. Au chargement initial, une session valide est réhydratée dans le store puis la navigation demandée est conservée. **Précision issue de l'implémentation** : la session était déjà conservée avant (le force-push amenait sur `/login`, dont l'auto-authentification par cookies redirigeait ensuite vers `Home`) ; le gain réel est la **préservation du lien profond** (`/stats` n'atterrit plus sur `/`). `Login.vue` garde son auto-authentification pour l'utilisateur déjà connecté qui ouvre `/login`. `services/auth.ts` expose `saveCookies/removeCookies/getTokenCookie/getUserIDCookie` en s'appuyant sur `useCookie` (mêmes noms, mêmes options : path, expiration actuelle reprise). Les services restent appelables hors composant : comme `useCookie` exige un contexte Nuxt, le token est lu dans les actions Pinia/composants et passé aux services (qui reçoivent déjà `token` et `apiUrl`). La validation via `checkUserAuthentification` (`GET /api/users/exists`) est conservée côté middleware avant d'autoriser l'accès.

### 8. Proxy `/api` et URL de l'API
Un handler Nitro catch-all `server/api/[...path].ts` qui appelle `proxyRequest` vers `process.env.API_URL` (défaut `http://localhost:3000`). *Alternative écartée* : `nitro.routeRules` avec `proxy`, car les règles sont figées au build et l'`API_URL` ne pourrait plus changer au runtime sans reconstruire l'image (exigence de `front-delivery`). Même mécanisme en dev et en prod ; le front appelle toujours `/api` en relatif, ce qui supprime `window.env.VITE_API_URL`. Port de dev conservé : 8080. Quand l'API migrera dans `./server/api`, les `routeRules` sont retirées et les handlers Nitro prennent le relais sans toucher au front.

### 9. Modules client-only
`vue3-touch-events`, Highcharts et Eruda sont chargés dans des plugins `.client.ts` ou via import dynamique (Eruda reste lazy). Avec `ssr: false` tout est client, mais le suffixe `.client` documente l'intention et reste correct si le SSR était activé un jour.

### 10. PWA
`@vite-pwa/nuxt` avec le manifest de `vite.config.ts` (nom « MCCB NG », icônes 192/512, `display: standalone`). L'ancien front exposait en réalité **deux** manifestes (le `public/manifest.json` statique, « mCloud Compte and Budget », `fullscreen`, thème `#4DBA87`, et celui de vite-plugin-pwa) ; le statique est supprimé pour n'en garder qu'un. Le shell SPA est prérendu (`nitro.prerender.routes: ['/']`) pour que le service worker précache `/` et l'utilise en `navigateFallback` (hors `/api`). `<NuxtPwaManifest />` est requis dans `app.vue`. Les métadonnées de l'ancien `index.html` (viewport, theme-color, description, icônes) passent dans `app.head`. Configuration : `registerType: 'autoUpdate'` et fichier `service-worker.js` conservé pour que les clients existants récupèrent la mise à jour. `registerServiceWorker.js` et `register-service-worker` sont supprimés.

### 11. Tests et lint
Vitest + `@nuxt/test-utils` (environnement `nuxt` ou `happy-dom` selon les tests) ; l'unique `example.spec.js` est porté. `@nuxt/eslint` (flat config, ESLint 9) remplace la config standard ; les scripts `lint`/`lint:check` sont conservés. `type-check` utilise `nuxt typecheck` (`vue-tsc`) ; `noUncheckedIndexedAccess`, activé par défaut par Nuxt 4 mais absent de l'ancien tsconfig, est désactivé pour rester iso. `@nuxt/test-utils` exige le paquet optionnel `h3-next` (alias `h3@2`) en devDependency. Les règles non stylistiques de l'ancien `.eslintrc.json` sont reprises dans `eslint.config.mjs` ; le style `@vue/standard` n'est pas reconduit.

### 12. Docker et cibles de build
Dockerfile multi-stage `node:22-slim`, **contexte de build = racine du dépôt** (le lockfile pnpm est à la racine du workspace ; `build-and-push.sh` et les scripts `docker:*:build` sont adaptés) : `corepack enable` + `pnpm install --frozen-lockfile --ignore-scripts --filter @mccbng/front...` + `pnpm build`, puis image runtime ne contenant que `.output/`. Écoute sur le port 8080 (`NITRO_PORT=8080`, `EXPOSE 8080`), comme en dev, `API_URL` injecté à l'exécution. `nginx.conf` supprimé. Les tags `staging`/`latest` et les scripts `docker:*` sont conservés. `core-js` et `browserslist` sont retirés : Nuxt/Vite fixent leur propre cible de build et aucun polyfill manuel n'est requis.

## Risks / Trade-offs

- **Vuex→Pinia introduit des régressions de réactivité** (destructuration perdant la réactivité, dépendances entre stores) → utiliser `storeToRefs`, convertir module par module, couvrir les getters de `compte` par des tests Vitest.
- **Imports explicites oubliés** (pas d'auto-import) → `nuxt typecheck` + ESLint `no-undef` en CI ; échec rapide au build.
- **Routes enfants à chemin absolu** peuvent ne pas se mapper naturellement en file-based → valider l'ensemble des URLs avec un test de table de routes avant/après.
- **Changement de comportement du login au démarrage** (lien profond conservé) → couvert par `tests/integration/auth.spec.ts` ; le JWT étant régénéré à chaque redémarrage du back, `checkUserAuthentification` doit renvoyer vers `/login` si le token est invalide.
- **Service worker existant** : un SW obsolète pourrait servir l'ancien bundle → conserver le nom du fichier SW et `autoUpdate`, tester la mise à jour sur un navigateur ayant l'ancienne version installée.
- **Nouveau runtime Node en prod** (au lieu de nginx statique) : plus de mémoire, une surface à patcher → image slim, healthcheck, contrepartie assumée pour préparer `./server`.
- **`compatibilityVersion: 5` instable** possible → fixer la version de Nuxt exactement, lire le changelog avant chaque montée.

## Migration Plan

1. Bootstrap Nuxt dans `front/` sur une branche, déplacements `git mv` puis build vert avant toute réécriture.
2. Migrer routing → plugins → Pinia (store par store) → auth → PWA, en gardant l'app exécutable à chaque étape.
3. Recette manuelle sur `docs/recette-non-regression-multiuser.md` en local contre le back actuel.
4. Build staging (`:staging`), vérification du proxy `/api`, du SW et du login ; puis `:latest`.
5. **Rollback** : l'ancienne image nginx (`front:latest` précédente) reste dans le registre ; redéployer ce tag suffit car le back et les cookies sont inchangés.

## Open Questions

Aucune.
