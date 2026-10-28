## 1. Base de données et configuration

- [x] 1.1 Écrire `server/db/migrations/0007_import_lots.sql` (tables `ImportLot` et `ImportLigne`, InnoDB utf8mb4, FK `ON DELETE CASCADE`, index `(IDuser, Statut)`, rejouable)
- [x] 1.2 Déclarer `importLots` et `importLignes` dans `server/db/schema.ts` (Drizzle, `decimal` en `mode: 'number'`)
- [x] 1.3 Étendre `server/utils/config.ts` : `anthropic: { apiKey?, model, effort }` (défauts `claude-opus-5-5` et `low`, `parseEffort`), clé absente non bloquante, tests unitaires de `loadConfig`
- [x] 1.4 Ajouter `@anthropic-ai/sdk` (version épinglée) avec `pnpm add`

## 2. Extraction (serveur)

- [x] 2.1 Créer `server/utils/import/extractor.ts` : types `ExtractionInput`, `LigneExtraite`, interface `OperationExtractor`, `getOperationExtractor` / `setOperationExtractor`
- [x] 2.2 Créer `server/utils/import/anthropic-extractor.ts` : `messages.parse` + `zodOutputFormat`, prompt système stable mis en cache, contexte dans le message utilisateur, gestion de `stop_reason` (`refusal`, `max_tokens`), erreurs typées du SDK converties en 502, `timeout` à 90 s
- [x] 2.3 Vérifier la prise en charge de `fallbacks: "default"` avec `parse` dans la version installée ; l'activer si elle est disponible, sinon documenter le choix dans le design
- [x] 2.4 Créer `server/utils/import/contexte.ts` : catégories lisibles (`IDuser IN (?, 0)`), 150 libellés usuels tels que saisis (avec `IDcat` et fréquence), 200 correspondances apprises (`LibelleSource` → `NomOp`/`IDcat` finaux des imports validés, la plus récente par `CleSource`) ; requêtes paramétrées
- [x] 2.5 Créer `server/utils/import/normalize.ts` : arrondi `round2`, troncature du libellé, parsing de date avec repli, `IDcat` hors liste remplacé par 0 en confiance faible, calcul de `CleSource` (majuscules, accents, chiffres, dates, préfixes bancaires et références retirés) ; tests unitaires
- [x] 2.6 Appliquer de façon déterministe les correspondances apprises après l'extraction (`CleSource` égale : `NomOp` et `IDcat` appris, confiance haute) ; tests unitaires
- [x] 2.7 Rédiger le prompt système : règles de libellé (correspondance apprise, puis libellé usuel exact, puis libellé court au style de l'utilisateur sans préfixe bancaire), signe des montants, dates
- [x] 2.8 Créer `server/utils/import/doublons.ts` : appariement au montant exact et à ±3 jours (une opération existante appariée au plus une fois), doublons internes au lot ; tests unitaires
- [x] 2.9 Tests unitaires de l'adaptateur avec un client Anthropic simulé (sortie valide, refus, sortie invalide, erreur 529)

## 3. Routes API

- [x] 3.1 `GET /api/imports/disponibilite`
- [x] 3.2 `POST /api/imports` : validation Zod (bornes images et texte), `assertCompteOwned`, purge des brouillons de plus de 30 jours, extraction, normalisation, doublons, insertion transactionnelle du lot et des lignes, 503 sans clé, 422 si aucune ligne, journal JSON `"event":"import"`
- [x] 3.3 `GET /api/imports` (brouillons de l'utilisateur, avec nombre de lignes) et `GET /api/imports/:id` (lot et lignes, 404 hors scope)
- [x] 3.4 `POST /api/imports/:id/valider` : transaction avec `SELECT … FOR UPDATE`, 409 si le lot n'est pas en brouillon, contrôle des `IDcat` et `IDligne`, insertion des opérations, enregistrement des valeurs finales sur les `ImportLigne`, statut `valide`
- [x] 3.5 `DELETE /api/imports/:id` (brouillon uniquement, 204)
- [x] 3.6 `nuxt.config.ts` : `routeRules` pour `POST /api/imports` (taille de corps à 25 Mo) ; limite de débit de 30 extractions par heure et par utilisateur dans la route (`quota.ts`)
- [x] 3.7 Tests `pnpm test:api` avec un extracteur simulé : création, compte d'un autre utilisateur (404), bornes (400), 422, 503, doublons, lecture, validation partielle, `IDcat` interdit, double validation (409), abandon, purge (lots validés conservés), correspondance apprise réappliquée au lot suivant

## 4. Front : saisie

- [x] 4.1 `app/utils/imageNormalize.ts` (adapté de Meal-Manager `imageUpload.ts` : HEIC, 1600 px, JPEG 0,85) et ajout de `heic-to`
- [x] 4.2 `app/utils/videoFrames.ts` : découpage par `video` et `canvas`, pas adaptatif à 20 images au plus, élimination des images quasi identiques ; tests unitaires de la logique de pas et d'écart
- [x] 4.3 `app/services/imports.ts` : appels via `http.ts` (disponibilité, création, liste, lecture, validation, abandon)
- [x] 4.4 Page `app/pages/operations/import.vue` (`/import`, `Import d'opérations`, `import-form`) et enregistrement de `import-form` dans `RouteOverTheContent`
- [x] 4.5 `ImportForm.vue`, étape de saisie : compte cible présélectionné, texte, photos (`accept="image/*"` et `capture`), vidéo, aperçu et retrait des sources, avertissement sur l'IA externe, progression, messages d'erreur, reprise d'un brouillon existant
- [x] 4.6 Entrée « Importer » dans `FabMenu` conditionnée par la disponibilité

## 5. Front : revue et validation

- [x] 5.1 Étape de revue : cartes éditables (case à cocher, date, libellé proposé avec le libellé brut affiché dessous et une action pour le reprendre, montant signé, catégorie), mise en évidence des doublons (avec l'opération existante) et des lignes de confiance faible
- [x] 5.2 Compteur et total des lignes cochées, tout cocher ou décocher, ajout et suppression de ligne
- [x] 5.3 Valider : envoi des lignes cochées, fermeture de l'overlay, rafraîchissement des opérations et des soldes, message avec le nombre d'opérations créées ; Abandonner avec confirmation
- [x] 5.4 Tests unitaires de la logique de revue (`app/utils/importReview.ts`) : lignes doublons décochées, total recalculé, seules les lignes cochées envoyées

## 6. Routage, documentation et vérification

- [x] 6.1 Ajouter `/import` à `tests/fixtures/routes.ts` et faire passer `tests/integration/routes.spec.ts`
- [x] 6.2 Mettre à jour `CLAUDE.md` (variables d'environnement, entité `ImportLot`, fonctionnalité), `docs/architecture.md` et `docs/exploitation.md` (clé, coût, confidentialité, migration 0007)
- [x] 6.3 `pnpm lint:check`, `pnpm type-check`, `pnpm test` et `pnpm test:api` au vert
- [ ] 6.4 Recette manuelle avec une vraie clé : capture de relevé, ticket photo, vidéo de défilement, texte collé, doublon volontaire, validation et vérification des soldes
