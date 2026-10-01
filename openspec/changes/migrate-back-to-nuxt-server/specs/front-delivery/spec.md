## MODIFIED Requirements

### Requirement: Image Docker Node/Nitro
L'image front SHALL être construite en multi-stage depuis `node:22-slim` avec pnpm (et non yarn), ne contenir que `.output/` au runtime, et démarrer le serveur Nitro, qui sert à la fois le front et l'API (`/api/**`). `nginx.conf` MUST être supprimé. Les tags `dockregistry.xju.fr/mccbng/front:{staging,latest}` sont conservés ; l'image `mccbng/api` MUST NOT être produite. La configuration DB et JWT MUST NOT être embarquée dans l'image.

#### Scenario: Démarrage sans configuration DB
- **WHEN** le conteneur est lancé sans `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` ou `DB_NAME`
- **THEN** il s'arrête immédiatement avec un message d'erreur explicite nommant la variable manquante

#### Scenario: Exécution de l'image
- **WHEN** le conteneur est lancé avec les variables `DB_*` et `JWT_SECRET`
- **THEN** l'application est servie et `/api/**` répond depuis le même processus

#### Scenario: Fallback SPA
- **WHEN** une URL profonde comme `/editCredit/3` est requêtée directement
- **THEN** le shell SPA est renvoyé et le routeur client affiche la bonne page

#### Scenario: Pas de secret dans l'image
- **WHEN** l'image est inspectée
- **THEN** aucun fichier de configuration de datasource ni mot de passe n'y figure

### Requirement: Configuration d'exécution
La configuration SHALL être fournie uniquement via variables d'environnement au runtime, sans reconstruire l'image : `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (obligatoires), `JWT_SECRET` (obligatoire en production), `JWT_TTL_SECONDS` (défaut 3600). `API_URL` et `window.env.VITE_API_URL` MUST ne plus être utilisés.

#### Scenario: Changement d'environnement
- **WHEN** `DB_HOST` est modifié et le conteneur redémarré
- **THEN** le serveur se connecte à la nouvelle base sans nouveau build

#### Scenario: JWT_SECRET absent en production
- **WHEN** le conteneur démarre en production sans `JWT_SECRET`
- **THEN** il refuse de démarrer (les sessions ne doivent pas être invalidées silencieusement à chaque redémarrage)
