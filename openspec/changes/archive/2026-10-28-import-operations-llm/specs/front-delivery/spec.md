## MODIFIED Requirements

### Requirement: Configuration d'exécution
La configuration SHALL être fournie uniquement via variables d'environnement au runtime, sans reconstruire l'image : `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (obligatoires), `JWT_SECRET` (obligatoire en production), `JWT_TTL_SECONDS` (défaut 3600), et, pour l'import d'opérations par LLM, `ANTHROPIC_API_KEY` (optionnelle : son absence désactive la fonctionnalité sans empêcher le démarrage), `ANTHROPIC_MODEL` (défaut `claude-opus-5-5`) et `ANTHROPIC_EFFORT` (défaut `low`, valeur invalide remplacée par le défaut). `API_URL` et `window.env.VITE_API_URL` MUST ne plus être utilisés. La clé Anthropic MUST NOT être exposée au front ni journalisée.

#### Scenario: Changement d'environnement
- **WHEN** `DB_HOST` est modifié et le conteneur redémarré
- **THEN** le serveur se connecte à la nouvelle base sans nouveau build

#### Scenario: JWT_SECRET absent en production
- **WHEN** le conteneur démarre en production sans `JWT_SECRET`
- **THEN** il refuse de démarrer (les sessions ne doivent pas être invalidées silencieusement à chaque redémarrage)

#### Scenario: Clé Anthropic absente en production
- **WHEN** le conteneur démarre en production sans `ANTHROPIC_API_KEY`
- **THEN** il démarre normalement et l'import par LLM est indisponible
