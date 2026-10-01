# front-pwa Specification

## Purpose
TBD - created by archiving change migrate-front-to-nuxt. Update Purpose after archive.
## Requirements
### Requirement: Manifeste PWA conservé
L'application SHALL publier un manifeste via `@vite-pwa/nuxt` avec le nom « mCloud Compte and Budget », le nom court « mCcBng », `start_url: /`, `display: fullscreen`, `orientation: portrait`, `theme_color` `#4DBA87`, `background_color` `#000000`, et les icônes 48, 96, 144, 192 et 512 px. Le lien `<link rel="manifest">` MUST être injecté par un `useHead` synchrone (et non par le composant à setup asynchrone `NuxtPwaManifest`, qui plante au démontage lors de la redirection initiale vers `/login`).

#### Scenario: Installation
- **WHEN** un navigateur évalue l'installabilité de l'application
- **THEN** le manifeste est servi avec ces valeurs et les icônes sont accessibles

### Requirement: Service worker à mise à jour automatique
Un service worker nommé `service-worker.js` SHALL être généré avec `registerType: 'autoUpdate'`. `register-service-worker` et `registerServiceWorker.js` MUST être supprimés.

#### Scenario: Nouvelle version déployée
- **WHEN** une nouvelle version du front est déployée et l'utilisateur rouvre l'application
- **THEN** le service worker se met à jour automatiquement et la nouvelle version est servie

#### Scenario: Client avec l'ancien service worker
- **WHEN** un navigateur ayant installé l'ancienne version (Vite) charge la version Nuxt
- **THEN** l'ancien service worker est remplacé sans intervention manuelle

### Requirement: Requêtes API hors cache de navigation
Les requêtes vers `/api/**` SHALL NOT être servies par un fallback de navigation (`index.html`) du service worker.

#### Scenario: Appel API hors ligne
- **WHEN** l'application est hors ligne et appelle `/api/comptes`
- **THEN** la requête échoue côté réseau et n'est pas remplacée par le shell HTML

