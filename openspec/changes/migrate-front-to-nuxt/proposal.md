## Why

Le front (`front/`) est une SPA Vue 3 assemblée à la main (Vite + Vue Router + Vuex 4 + vite-plugin-pwa + Jest + ESLint 8 legacy). Vuex est déprécié, la config ESLint et l'outillage de test sont vieillissants, et l'assemblage manuel de chaque brique (router, PWA, proxy, cookies) est coûteux à maintenir. Passer sur Nuxt apporte des conventions standard, un écosystème de modules maintenu, et prépare l'étape suivante : héberger l'API dans le dossier `./server` de Nuxt (Nitro).

## What Changes

- Remplacer le bootstrap Vite/Vue manuel par **Nuxt 4 (dernière version stable)** avec `ssr: false` (SPA), `future: { compatibilityVersion: 5 }`, et **auto-imports désactivés** (`imports.autoImport: false`, `components: false`) : tous les imports sont explicites.
- Adopter la structure **`front/app/`** (srcDir Nuxt 4) : `pages/`, `components/`, `composables/`, `stores/`, `plugins/`, `middleware/`, `assets/`. Les `services/` sont conservés. Déplacements via `git mv` pour préserver l'historique.
- Remplacer `router.ts` par le **routing file-based** (`app/pages/`). Le pattern overlay (`RouteOverTheContent` + `componentName`) est conservé via des pages enfants + `<NuxtPage />`. La meta `disabledTotalHeader` est conservée.
- **BREAKING (interne)** : migrer les 9 modules **Vuex vers Pinia** (`user`, `compte`, `operation`, `category`, `stats`, `display`, `credit`, `bien`, `banque`). Les accès `store.state.x` / `dispatch` sont réécrits en stores Pinia.
- Remplacer `universal-cookie` par **`useCookie`** (cookies `userToken` / `userID` inchangés) et remplacer le force-push `/login` d'`App.vue` par un **middleware de route global** d'authentification.
- Remplacer `vite-plugin-pwa` + `register-service-worker` par **`@vite-pwa/nuxt`** (même manifest « MCCB NG »).
- Remplacer Jest par **Vitest + `@nuxt/test-utils`** ; remplacer ESLint 8 legacy par **`@nuxt/eslint`** (flat config).
- Remplacer le proxy dev Vite par un **`routeRules` Nitro** `/api/**` → `API_URL` (dev et prod). Le front continue d'appeler `/api` en relatif.
- Build via **`nuxt build`** (SPA servie par Nitro) : l'image Docker passe de nginx à **Node 22 + sortie Nitro**, avec pnpm (le Dockerfile actuel utilise encore yarn).
- Conserver : variables SCSS injectées globalement, thème light/dark (`useTheme`), Eruda lazy, `vue3-touch-events` et Highcharts (client-only), alias `@`.
- Mettre à jour `CLAUDE.md` (racine et `front/`) et `README.md`.

**Hors périmètre** : migration du back LoopBack vers `./server` de Nuxt (prochain change) ; aucun changement de contrat d'API ni de fonctionnalité métier.

## Capabilities

### New Capabilities
- `nuxt-app-shell`: configuration Nuxt (SPA, compatibilité v5, auto-imports désactivés, structure `app/`, SCSS global, alias, plugins client-only, proxy `/api`).
- `front-routing`: routes file-based, pages lazy, overlays par routes enfants, meta `disabledTotalHeader`.
- `front-auth-session`: session par cookies via `useCookie` et middleware global de redirection vers `/login`.
- `front-state`: stores Pinia remplaçant les modules Vuex, avec comportement fonctionnel identique.
- `front-pwa`: manifest, service worker et mise à jour automatique via `@vite-pwa/nuxt`.
- `front-delivery`: build `nuxt build`, image Docker Node/Nitro, runtime config de `API_URL`, tooling test/lint.

### Modified Capabilities
<!-- Aucune : openspec/specs/ est vide, le comportement fonctionnel utilisateur ne change pas. -->

## Impact

- **Code** : tout `front/` (déplacement `src/` → `app/`, réécriture du bootstrap, du router, du store, de l'auth, des tests, de la config lint/PWA).
- **Dépendances** : ajout `nuxt`, `pinia`, `@pinia/nuxt`, `@vite-pwa/nuxt`, `@nuxt/eslint`, `vitest`, `@nuxt/test-utils` ; retrait `vuex`, `vue-router` (géré par Nuxt), `universal-cookie`, `register-service-worker`, `core-js`, `browserslist`, `vite-plugin-pwa` direct, Jest/Babel, ESLint 8 et plugins associés.
- **Déploiement** : nouvelle image front (Node + Nitro, port 8080), `Dockerfile`, `nginx.conf` supprimé, `docker-compose.build.yml` / `build-and-push.sh` à vérifier, variable d'env `API_URL` à fournir au runtime.
- **Back** : inchangé ; le routage `/api` est assuré par le proxy Nitro.
- **Risque** : sessions utilisateurs existantes (cookies conservés), cache du service worker lors de la bascule, régression sur gestes tactiles/Highcharts en client-only.
