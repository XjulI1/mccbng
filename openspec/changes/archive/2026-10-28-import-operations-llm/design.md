## Context

Aujourd'hui, une opération se saisit une par une (`OperationForm`), avec une aide à la catégorie fondée sur l'historique (`GET /api/operations/suggestCategories`, `LIKE` sur `NomOp`). L'API Nitro n'appelle aucun service externe, et toute sa configuration vient de `process.env` (`server/utils/config.ts`).

Le projet voisin `~/Git/Meal-Manager` intègre déjà l'API Claude pour l'import de recettes par photo. On en reprend les patrons suivants :

- un port d'extraction (`IRecipePhotoImporter`) et un adaptateur Anthropic (`AnthropicRecipePhotoImporter`) ;
- toutes les images envoyées dans un seul message utilisateur, en base64 ;
- une sortie validée par Zod ;
- un modèle et un effort configurables (`anthropic-config.ts`, `parseEffort`) ;
- une normalisation des images dans le navigateur (`app/utils/imageUpload.ts` : HEIC vers JPEG, plus grand côté 1600 px, qualité 0,85).

Une différence est volontaire : Meal-Manager force l'appel d'un outil (`tool_choice: { type: 'tool' }`), ce que les modèles récents (Opus 5.5, Sonnet 5.5) refusent avec une erreur 400. Ici, on utilise donc la sortie structurée native (`output_config.format`).

Contraintes : NAS Synology derrière Cloudflare, une seule image Docker, MariaDB 10.11, aucun appel au LLM en test, données financières personnelles.

## Goals / Non-Goals

**Goals :**
- Passer d'une photo, d'une vidéo ou d'un texte à des opérations proposées, catégorisées et relues, en quelques gestes sur mobile.
- Ne jamais créer d'opération sans validation explicite, et rendre cette validation atomique.
- Signaler les doublons avec l'existant avant qu'ils ne faussent les soldes.
- Garder la fonctionnalité optionnelle et sans effet sur l'app quand la clé est absente.
- Permettre un futur producteur MCP sans refonte.

**Non-Goals :**
- Serveur MCP et OAuth (autre change).
- Import de fichiers PDF, CSV ou OFX en tant que fichiers (le texte collé couvre le CSV).
- Lot multi-comptes, rapprochement automatique avec des opérations existantes.
- Création de catégories ou rattachement automatique à un `Credit` ou un `Bien`.
- Conservation des images sources.

## Decisions

### D1. Lots en brouillon persistés plutôt qu'une extraction sans état
`POST /api/imports` enregistre le résultat dans `ImportLot` et `ImportLigne`. La validation crée ensuite les opérations.

- *Alternative* : une route sans état qui renvoie les lignes, le front les garde puis appelle un `POST /operations/batch`. C'est plus simple, mais on perd l'extraction (payée) si l'onglet se ferme, il n'y a pas de reprise sur un autre appareil, et rien ne permet à un futur MCP de déposer un lot à relire dans l'app.
- Les lignes en brouillon ne servent pas aux soldes et ne polluent pas `Operation`.

### D2. Modèle de données
Migration `0007_import_lots.sql`, rejouable (`IF NOT EXISTS`) :

- `ImportLot` : `IDimport` PK auto, `IDuser` INT NOT NULL, `IDcompte` INT NOT NULL, `Statut` ENUM(`brouillon`,`valide`,`abandonne`) défaut `brouillon`, `Source` VARCHAR(16) (`texte`, `image`, `video`, `mixte`, et plus tard `mcp`), `Modele` VARCHAR(64), `TokensEntree` INT, `TokensSortie` INT, `DateCreation` DATETIME, `DateValidation` DATETIME NULL. Index `(IDuser, Statut)`.
- `ImportLigne` : `IDligne` PK auto, `IDimport` INT NOT NULL (FK avec `ON DELETE CASCADE`), `Ordre` INT, `DateOp` DATETIME, `LibelleSource` VARCHAR(255) (libellé brut lu), `CleSource` VARCHAR(255) (libellé source normalisé, indexé avec `IDimport` pour retrouver les correspondances apprises), `NomOp` VARCHAR (même longueur que `Operation.NomOp`, libellé proposé puis final), `MontantOp` DECIMAL(12,2), `IDcat` INT défaut 0, `Confiance` ENUM(`haute`,`moyenne`,`faible`), `IDopDoublon` INT NULL, `DoublonLot` BOOL, `Selection` BOOL.

Le lot porte `IDuser` en direct (scope `IDuser = <JWT>`), en plus de `IDcompte`, revérifié via `assertCompteOwned` à la création et à la validation (le compte a pu changer de propriétaire ou être supprimé). L'abandon (`DELETE`) supprime physiquement le lot. Le statut `abandonne` est réservé au cas où le compte n'existe plus au moment de la validation (lot conservé pour traçabilité, purgé à 30 jours).

### D3. Port d'extraction et adaptateur Anthropic
`server/utils/import/extractor.ts` définit :

```ts
interface ExtractionInput { texte?: string; images: { mediaType: string; data: string }[]; categories: CategorieContexte[]; libellesUsuels: LibelleUsuel[]; correspondances: Correspondance[]; dateReference: string }
interface OperationExtractor { extract(input: ExtractionInput): Promise<{ lignes: LigneExtraite[]; usage: { input: number; output: number }; modele: string }> }
```

L'adaptateur `anthropic-extractor.ts` :

- appelle `client.messages.parse({ model, max_tokens: 16000, output_config: { effort, format: zodOutputFormat(ExtractionSchema) }, system, messages })` ;
- garde le prompt système **stable** (règles d'extraction, signe des montants, dates) avec `cache_control`, et place le contexte variable (catégories, exemples, date) dans le message utilisateur, après les images ;
- vérifie `stop_reason` : `refusal` ou `max_tokens` donnent une erreur 502 ;
- active les fallbacks côté serveur (`fallbacks: 'default'`, bêta `server-side-fallback-2026-07-01`) via `client.beta.messages.parse` et `betaZodOutputFormat` (SDK 1.3.0, épinglé), pour les modèles qui l'acceptent (Opus 5.5, Opus 5, Sonnet 5.5, Fable 5.1). Pour les autres (Haiku), une seule tentative et une erreur 502 en cas de refus.

Un accesseur `getOperationExtractor()` renvoie l'adaptateur, ou celui injecté par les tests (`setOperationExtractor`). Les tests API n'appellent donc jamais Anthropic.

- *Modèle* : `ANTHROPIC_MODEL`, défaut `claude-opus-5-5` (le plus fiable en lecture de documents denses). On peut basculer sur `claude-sonnet-5-5` (2 $/10 $ par million de tokens) ou `claude-haiku-5-5` par la seule variable d'env si le coût compte plus que la précision. Ordre de grandeur : une capture vaut environ 2 à 5 k tokens d'entrée, soit quelques centimes par lot avec Opus.
- *Effort* : `ANTHROPIC_EFFORT`, défaut `low`, valeurs `low|medium|high|xhigh|max` (reprise de `parseEffort`). L'extraction est une tâche bornée.
- *Pas de `thinking.disabled`* : il donne une erreur 400 sur Opus 5.5. C'est l'effort qui règle la profondeur de raisonnement.

### D4. Schéma de sortie du LLM
```ts
ExtractionSchema = z.object({ lignes: z.array(z.object({
  date: z.string(),            // AAAA-MM-JJ
  libelleSource: z.string(),   // tel que lu
  libelle: z.string(),         // proposé, au style de l'utilisateur
  montant: z.number(),         // négatif = sortie
  idCategorie: z.number().int(),
  confiance: z.enum(['haute', 'moyenne', 'faible']),
  dateIncertaine: z.boolean()
})) })
```

Le serveur reste maître de la normalisation : arrondi `round2`, troncature du libellé, date parsée (une date invalide devient la date du jour avec confiance faible), `idCategorie` hors liste remplacé par 0 avec confiance faible. On ne fait pas confiance aveuglément au modèle.

### D5. Contexte de libellés et de catégorisation
Trois requêtes paramétrées, en complément du LLM :

1. Les catégories lisibles (`IDuser IN (?, 0)`) avec `IDcat`, nom et `Type`.
2. Les **libellés usuels** : les 150 couples (`NomOp` tel que saisi, casse comprise, `IDcat`) les plus fréquents des 24 derniers mois de l'utilisateur, avec leur nombre d'occurrences. Ils servent à la fois de modèle de style et d'exemples de catégorie.
3. Les **correspondances apprises** : pour les lignes d'imports `valide` de l'utilisateur (au plus 200, les plus récentes par `CleSource`), le couple `LibelleSource` → (`NomOp` final, `IDcat` final), en ignorant les lignes où `NomOp = LibelleSource`.

Le prompt système demande au modèle, dans l'ordre :

1. Si le libellé source correspond à une correspondance apprise, reprendre le libellé appris.
2. Sinon, si un libellé usuel désigne manifestement le même marchand ou le même objet, le reprendre exactement.
3. Sinon, rédiger un libellé court dans le style des libellés usuels (casse, longueur, vocabulaire), sans préfixe bancaire, référence, numéro de carte ni date.

Le serveur applique aussi la règle 1 de façon **déterministe** après l'extraction. Il normalise le `libelleSource` en `CleSource` : majuscules, accents retirés, chiffres, dates, préfixes `CB`, `PRLV SEPA`, `VIR`, `CARTE` et références retirés. Si `CleSource` correspond exactement à une correspondance apprise, le serveur force `NomOp` et `IDcat` appris, avec `Confiance = haute`. L'apprentissage ne dépend donc pas du bon vouloir du modèle, et il reste testable sans LLM.

Le LLM généralise mieux qu'un `LIKE`, par exemple de « NETFLIX.COM 866-579 » vers « Netflix ». L'historique l'oriente vers les habitudes propres de l'utilisateur.

- *Alternative* : une table de règles de renommage éditable (`RegleLibelle`). Rejetée pour la v1 : les lignes validées tiennent déjà ce rôle sans écran de gestion. On pourra l'ajouter si l'apprentissage implicite ne suffit pas.

- *Alternative* : catégoriser après coup avec `suggestCategories`, ligne par ligne. Rejetée : un `LIKE` exact sur le libellé brut d'un relevé échoue souvent. Cette piste reste un repli si le contexte devient trop gros.

### D6. Doublons
Requête unique sur le compte cible : `MontantOp IN (…)` et `DateOp BETWEEN min-3j AND max+3j`. L'appariement se fait ensuite en JS avec le montant exact et l'écart de date le plus petit, chaque opération existante n'étant appariée qu'une fois. Les doublons internes au lot reposent sur le couple (date, montant) identique. Le libellé est volontairement ignoré : les banques le réécrivent (`CB CARREFOUR 12/10` contre une saisie manuelle `Courses`).

### D7. Validation
`POST /api/imports/:id/valider` reçoit la liste finale. Le front envoie les valeurs éditées, ce qui évite un `PATCH` par champ modifié. Dans `getDb().transaction(…)` :

1. `SELECT … FOR UPDATE` sur le lot, qui doit être `brouillon` (sinon 409). Cela neutralise la double validation.
2. `assertCompteOwned`.
3. Contrôle des `IDcat` (lisibles par l'utilisateur) et des `IDligne` (appartenant au lot, sans répétition).
4. Insertion des opérations, **pointées** (`CheckOp = true`) : elles sont lues sur un relevé, donc déjà passées en banque.
5. Mise à jour des `ImportLigne` avec les valeurs finales (`NomOp`, `IDcat`, `Selection`). Ce sont elles qui alimentent les correspondances apprises.
6. `Statut = 'valide'`, `DateValidation = NOW()`.

Les lignes ajoutées à la main dans la revue sont envoyées sans `IDligne`. Elles n'ont pas de `LibelleSource` et ne produisent donc pas de correspondance. Les lots validés ne sont jamais purgés : ils constituent la mémoire de renommage.

### D8. Transport des images
On envoie du JSON en base64, comme Meal-Manager, plutôt que du multipart. C'est plus simple avec `defineApiHandler` et Zod, et le surcoût de 33 % est acceptable sur des JPEG de 1600 px (environ 200 à 400 Ko). `routeRules['/api/imports']` porte la limite de taille de nuxt-security à 25 Mo. La limite de débit (30 extractions par heure glissante) est appliquée **par utilisateur** dans la route (`server/utils/import/quota.ts`, compteur en mémoire), et non par IP avec le rate-limiter de nuxt-security : celui-ci compterait aussi les `GET /api/imports` (même chemin), et un quota individuel reflète mieux le coût. Seules les extractions qui atteignent le LLM sont décomptées.

### D9. Vidéo découpée dans le navigateur
`app/utils/videoFrames.ts` : élément `<video>` hors DOM, `seek` toutes les `max(1 s, durée / 20)`, puis `drawImage` dans un `canvas` de 1600 px au plus. Une empreinte de 16×16 en niveaux de gris sert à comparer chaque image à la précédente, et celles dont l'écart moyen est faible sont écartées. On retrouve l'élément « Vidéo » du choix de l'utilisateur sans ffmpeg dans l'image Docker ni gros upload. Limite connue : les formats que le navigateur ne lit pas (certains `.mov` HEVC sur Android) ; dans ce cas, un message invite à envoyer des captures.

### D10. Front
- Page `app/pages/operations/import.vue` (`path: '/import'`, `name: "Import d'opérations"`, `componentName: 'import-form'`), rendue par `RouteOverTheContent`.
- Composant `ImportForm.vue` en deux étapes (saisie, revue), avec des sous-composants si besoin (`ImportSourcePicker`, `ImportReviewList`).
- Service `app/services/imports.ts` via `http.ts` (cookie et `X-Requested-With`).
- La revue est une liste de cartes compactes, adaptée au mobile, plutôt qu'un tableau. Les champs reprennent les contrôles d'`OperationForm` (sélecteur de catégorie, montant signé).
- Après validation : rafraîchissement du store des opérations et des soldes, comme après un virement.

## Risks / Trade-offs

- [Le LLM se trompe sur le signe ou la date d'une ligne] → Revue obligatoire, confiance affichée, total des lignes cochées visible (un écart avec le relevé saute aux yeux), règles explicites dans le prompt système.
- [Données bancaires envoyées à un tiers] → Fonctionnalité optionnelle, avertissement dans l'écran, aucune image stockée, journal sans contenu. À mentionner dans `docs/exploitation.md`.
- [Coût incontrôlé : boucle, abus] → Limite de 30 extractions par heure et par IP, 20 images au plus par lot, texte borné, tokens journalisés par appel.
- [Contexte de catégorisation volumineux pour un gros historique] → Plafond de 150 exemples. Le prompt système stable est mis en cache.
- [Libellé proposé trompeur, par exemple deux marchands différents fusionnés sous un même libellé usuel] → Le libellé brut reste affiché sous le libellé proposé, avec une action pour le reprendre. Une correction en revue devient la nouvelle correspondance apprise.
- [Une correspondance apprise erronée se propage à chaque import] → La plus récente l'emporte : il suffit de la corriger une fois en revue.
- [Faux doublons, par exemple deux cafés à 2,00 € dans la même semaine] → Doublon seulement signalé et décoché, jamais supprimé. L'utilisateur peut recocher.
- [Vidéo illisible par le navigateur] → Message explicite, les photos restent possibles.
- [Écart de comportement du SDK (`parse`, fallbacks, bêtas)] → Version du SDK épinglée et tests unitaires de l'adaptateur sur des réponses simulées.
- [Requêtes longues (vision et effort élevé) derrière Cloudflare, plafond d'environ 100 s] → Effort `low` par défaut, `timeout` du SDK à 90 s, au plus 1 nouvelle tentative du SDK.

## Migration Plan

1. Appliquer `0007_import_lots.sql` avec `pnpm db:migrate` avant le déploiement (les migrations ne tournent pas dans l'image).
2. Déployer l'image. Sans `ANTHROPIC_API_KEY`, rien ne change pour l'utilisateur.
3. Ajouter `ANTHROPIC_API_KEY` (et éventuellement `ANTHROPIC_MODEL`) dans la configuration du conteneur sur le NAS, puis redémarrer.
4. Retour arrière : retirer la clé suffit à masquer la fonctionnalité. Les tables peuvent rester en place, elles ne sont lues par aucune autre route.

## Open Questions

- Faut-il proposer aussi le rattachement à un `Bien` (loyers) quand le libellé correspond à l'historique ? Hors périmètre de la v1.
