## ADDED Requirements

### Requirement: Application Nuxt en mode SPA
Le front SHALL être une application Nuxt (dernière version stable) configurée avec `ssr: false`. Aucun rendu côté serveur MUST être effectué.

#### Scenario: Réponse HTML initiale
- **WHEN** un navigateur requête une page de l'application
- **THEN** le serveur renvoie le shell SPA sans contenu rendu côté serveur et l'application s'hydrate/monte côté client

### Requirement: Nuxt 4 avec compatibilité Nuxt 5 activée
Le front SHALL utiliser la dernière version de Nuxt 4 et sa configuration SHALL activer `future.compatibilityVersion: 5`.

#### Scenario: Démarrage sans avertissement de dépréciation
- **WHEN** l'application est lancée en dev et en build
- **THEN** aucun avertissement de dépréciation Nuxt n'est émis

### Requirement: Auto-imports désactivés
Les auto-imports de composables/utilitaires et de composants MUST être désactivés. Toute API Vue/Nuxt/Pinia et tout composant utilisé SHALL être importé explicitement.

#### Scenario: Usage sans import
- **WHEN** un fichier utilise `ref`, `computed` ou un composant de `components/` sans l'importer
- **THEN** la vérification de types ou le lint échoue

#### Scenario: Icônes globales
- **WHEN** un template utilise `<FontAwesomeIcon>`
- **THEN** le composant est résolu via le plugin global, sans import local

### Requirement: Structure de dossiers app/
Le code applicatif SHALL résider dans `front/app/` avec les dossiers Nuxt standards (`pages`, `components`, `composables`, `stores`, `plugins`, `middleware`, `assets`), les `services/` étant conservés. L'alias `@` MUST pointer vers `app/`.

#### Scenario: Résolution de l'alias
- **WHEN** un fichier importe `@/services/compte`
- **THEN** l'import est résolu vers `front/app/services/compte.ts`

### Requirement: Variables SCSS injectées globalement
Les variables de `variables.scss` (breakpoints, hauteurs, largeurs) SHALL rester disponibles dans tout bloc `<style lang="scss">` sans import explicite.

#### Scenario: Usage d'une variable
- **WHEN** un composant utilise `$desktop_BP_min_width` dans son SCSS
- **THEN** la compilation réussit

### Requirement: Modules navigateur uniquement
`vue3-touch-events`, Highcharts et Eruda SHALL être chargés uniquement côté client ; Eruda MUST rester chargé à la demande lorsque le flag `debugToolsEnabled` est actif.

#### Scenario: Eruda désactivé
- **WHEN** `debugToolsEnabled` est absent ou faux
- **THEN** le paquet `eruda` n'est pas chargé

### Requirement: Proxy de l'API
Le serveur Nitro SHALL proxifier `/api/**` vers l'URL définie par `API_URL` (défaut `http://localhost:3000` en dev uniquement), en dev comme en production, sans transmettre le header `Cookie`, avec un timeout de 30 s et une réponse JSON 502 si le back est injoignable, de sorte que le front appelle l'API en chemin relatif.

#### Scenario: Appel API relatif
- **WHEN** le front appelle `GET /api/comptes`
- **THEN** la requête est transmise à `${API_URL}/api/comptes` avec ses en-têtes `Authorization`
