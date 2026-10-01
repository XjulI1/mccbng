## ADDED Requirements

### Requirement: Scripts de développement et de build
`front/package.json` SHALL fournir `dev` (port 8080), `build` (`nuxt build`), `build:staging` (mode `test`), `preview`, `test`, `type-check`, `lint` et `lint:check`, ainsi que les scripts `docker:*` existants.

#### Scenario: Build de production
- **WHEN** `pnpm build` est exécuté dans `front/`
- **THEN** la sortie Nitro est produite dans `.output/` sans erreur

#### Scenario: Vérification de types
- **WHEN** `pnpm type-check` est exécuté
- **THEN** la commande réussit sans erreur de type ni import manquant

### Requirement: Image Docker Node/Nitro
L'image front SHALL être construite en multi-stage depuis `node:22-slim` avec pnpm (et non yarn), ne contenir que `.output/` au runtime, et démarrer le serveur Nitro. `nginx.conf` MUST être supprimé. Les tags `dockregistry.xju.fr/mccbng/front:{staging,latest}` sont conservés.

#### Scenario: Démarrage sans API_URL
- **WHEN** le conteneur est lancé sans `API_URL`
- **THEN** il s'arrête immédiatement avec un message d'erreur explicite

#### Scenario: Exécution de l'image
- **WHEN** le conteneur est lancé avec `API_URL` défini
- **THEN** l'application est servie et `/api/**` est proxifié vers `API_URL`

#### Scenario: Fallback SPA
- **WHEN** une URL profonde comme `/editCredit/3` est requêtée directement
- **THEN** le shell SPA est renvoyé et le routeur client affiche la bonne page

### Requirement: Port 8080
Le serveur Nitro de l'image front SHALL écouter sur le port 8080, comme le serveur de dev.

#### Scenario: Exposition du port
- **WHEN** le conteneur démarre sans variable de port
- **THEN** l'application répond sur le port 8080

### Requirement: Configuration d'exécution
L'URL de l'API SHALL être fournie obligatoirement via variable d'environnement au runtime (`API_URL`, sans valeur par défaut dans l'image), sans reconstruire l'image, et `window.env.VITE_API_URL` MUST ne plus être utilisé.

#### Scenario: Changement d'environnement
- **WHEN** `API_URL` est modifié et le conteneur redémarré
- **THEN** le proxy cible la nouvelle URL sans nouveau build

### Requirement: Tests avec Vitest
Les tests SHALL s'exécuter avec Vitest et `@nuxt/test-utils` ; Jest, Babel et `vue3-jest` MUST être retirés.

#### Scenario: Exécution des tests
- **WHEN** `pnpm test` est exécuté
- **THEN** Vitest exécute la suite et retourne un code 0 si elle passe

### Requirement: Lint avec @nuxt/eslint
Le lint SHALL utiliser `@nuxt/eslint` en flat config sur `app/`, `.vue` et `.ts` compris.

#### Scenario: Contrôle de lint
- **WHEN** `pnpm lint:check` est exécuté
- **THEN** il s'exécute sans modifier les fichiers et signale les violations

### Requirement: Documentation à jour
`CLAUDE.md` (racine), `front/CLAUDE.md` et `README.md` SHALL décrire la nouvelle architecture Nuxt (structure `app/`, Pinia, commandes, Docker).

#### Scenario: Lecture de la documentation
- **WHEN** un développeur consulte `front/CLAUDE.md`
- **THEN** il n'y trouve plus de référence à Vuex, `router.ts`, `vite.config.ts`, nginx ou Jest
