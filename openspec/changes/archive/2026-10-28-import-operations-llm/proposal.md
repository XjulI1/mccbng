## Why

Saisir les opérations une par une est la tâche la plus fastidieuse de l'application : un relevé, une pile de tickets ou une capture d'écran bancaire demande plusieurs minutes de recopie et de choix de catégorie. Un LLM avec vision (API Claude) peut extraire les lignes et proposer leur catégorie à partir de l'historique de l'utilisateur. Comme ce sont des données financières, rien n'est enregistré sans relecture humaine.

## What Changes

- Nouveau flux d'**import en lot** : l'utilisateur choisit un compte cible, puis fournit du **texte collé**, une ou plusieurs **photos**, ou une **vidéo**. Le navigateur découpe la vidéo en images, donc le serveur ne reçoit jamais de vidéo.
- Nouvelle route serveur `POST /api/imports`. Elle envoie le contenu à l'**API Claude** (SDK `@anthropic-ai/sdk`, sortie JSON structurée) avec les catégories de l'utilisateur et des exemples de son historique. Elle stocke le résultat comme **lot en brouillon** (`ImportLot` / `ImportLigne`), sans créer aucune opération.
- Le LLM propose un **libellé dans le style de l'utilisateur** (par exemple « Courses Carrefour » plutôt que « CB CARREFOUR 12/10 FR75 »). Il s'appuie sur les libellés que l'utilisateur saisit au quotidien et sur les correspondances (libellé du relevé vers libellé retenu) apprises lors des imports déjà validés. Le libellé brut du relevé est conservé à côté pour la revue.
- Pour chaque ligne extraite, le serveur fournit une **catégorie proposée**, une **confiance** et un **doublon probable**. Le doublon est cherché parmi les opérations existantes du compte (même montant, date proche) et parmi les autres lignes du lot.
- Nouvel **écran de revue** en overlay (`/import`) : liste éditable (date, libellé, montant, catégorie, case à cocher). Les doublons et les lignes peu fiables sont mis en évidence, et les doublons sont décochés par défaut.
- Nouvelle route `POST /api/imports/:id/valider`. Elle crée les opérations cochées, éventuellement corrigées, dans **une seule transaction** et marque le lot validé. `DELETE /api/imports/:id` abandonne un brouillon.
- La fonctionnalité est **optionnelle** et s'active par la variable `ANTHROPIC_API_KEY`. Sans clé, l'entrée de menu est masquée et la route d'extraction répond 503. Le modèle et l'effort sont configurables (`ANTHROPIC_MODEL`, `ANTHROPIC_EFFORT`).
- Garde-fous de coût : taille et nombre d'images bornés, texte borné, limite de débit sur l'extraction.
- **Confidentialité** : les images et le texte transitent par Anthropic mais ne sont **pas stockés** par l'application. Seules les lignes extraites sont conservées dans le brouillon.
- La conception reste compatible avec un futur **serveur MCP** : un autre producteur pourra créer des lots en brouillon, et la revue se fera toujours dans l'app.

## Capabilities

### New Capabilities
- `api-import-operations` : extraction par LLM (texte et images), lots en brouillon, libellés au style de l'utilisateur, catégorisation, détection de doublons, validation transactionnelle, abandon, configuration et garde-fous de l'API Claude.
- `front-import-operations` : saisie de la source (texte, photos, vidéo découpée en images), normalisation des images dans le navigateur, écran de revue humaine et validation.

### Modified Capabilities
- `front-routing` : nouvelle route overlay `/import` (nom `Import d'opérations`, `componentName` `import-form`, parente `/operations`), ajoutée à la table de référence des routes.
- `front-delivery` : nouvelles variables d'environnement optionnelles (`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ANTHROPIC_EFFORT`).

## Impact

- **Base de données** : migration `0007_import_lots.sql` (tables `ImportLot` et `ImportLigne`, InnoDB, utf8mb4).
- **Serveur** : `server/api/imports/**`, `server/utils/import/` (port d'extraction, adaptateur Anthropic, doublons, prompt), `server/utils/config.ts` (configuration Anthropic optionnelle), `nuxt.config.ts` (taille de corps et limite de débit sur `/api/imports`).
- **Front** : page `app/pages/operations/import.vue`, composant `ImportForm` (saisie et revue), utilitaires d'image et de vidéo, store ou service d'import, entrée dans `FabMenu`, `tests/fixtures/routes.ts`.
- **Dépendances** : ajout de `@anthropic-ai/sdk`.
- **Exploitation** : nouvelle clé API à fournir au conteneur (optionnelle), coût à l'usage chez Anthropic. Mise à jour de `CLAUDE.md`, `docs/architecture.md` et `docs/exploitation.md`.
- **Hors périmètre** : serveur MCP, import de fichiers PDF/CSV/OFX en tant que fichiers, import multi-comptes dans un même lot, création automatique de catégories.
