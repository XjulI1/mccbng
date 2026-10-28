## ADDED Requirements

### Requirement: Disponibilité conditionnée à la clé Anthropic
L'import par LLM SHALL être actif uniquement quand `ANTHROPIC_API_KEY` est définie. `GET /api/imports/disponibilite` MUST renvoyer `{ disponible: boolean }` à tout utilisateur authentifié. Sans clé, `POST /api/imports` MUST répondre 503 (format d'erreur uniforme) sans appeler le LLM ; les autres routes d'import (lecture, validation, abandon de brouillons existants) MUST rester fonctionnelles. L'absence de clé MUST NOT empêcher le serveur de démarrer, y compris en production.

#### Scenario: Clé absente
- **WHEN** `ANTHROPIC_API_KEY` n'est pas définie et le front appelle `GET /api/imports/disponibilite`
- **THEN** la réponse est `{ "disponible": false }`

#### Scenario: Extraction sans clé
- **WHEN** `POST /api/imports` est appelé sans `ANTHROPIC_API_KEY`
- **THEN** la réponse est 503 et aucun lot n'est créé

### Requirement: Création d'un lot par extraction
`POST /api/imports` SHALL accepter `{ IDcompte, texte?, images?: [{ mediaType, data }] }` (au moins un texte non vide ou une image), vérifier que le compte appartient à l'utilisateur (404 sinon), appeler le LLM, puis créer dans une transaction un `ImportLot` (statut `brouillon`) et ses `ImportLigne`. La réponse MUST être le lot complet avec ses lignes (201). Aucune `Operation` MUST être créée à cette étape. Les images et le texte source MUST NOT être persistés.

#### Scenario: Capture de relevé
- **WHEN** l'utilisateur envoie une capture contenant 12 opérations pour son compte 3
- **THEN** un lot `brouillon` rattaché au compte 3 est créé avec 12 lignes et aucune opération n'est ajoutée au compte

#### Scenario: Compte d'un autre utilisateur
- **WHEN** `IDcompte` désigne un compte d'un autre utilisateur
- **THEN** la réponse est 404 et le LLM n'est pas appelé

#### Scenario: Requête vide
- **WHEN** ni texte non vide ni image n'est fourni
- **THEN** la réponse est 422 (validation Zod, convention de l'API) et le LLM n'est pas appelé

#### Scenario: Rien d'exploitable
- **WHEN** le LLM ne trouve aucune opération dans le contenu
- **THEN** la réponse est 422 avec un message explicite et aucun lot n'est créé

### Requirement: Bornes des entrées d'extraction
Le serveur MUST refuser (422, validation Zod) plus de 20 images, une image dont le `mediaType` n'est pas `image/jpeg`, `image/png` ou `image/webp`, une image décodée de plus de 5 Mo et un texte de plus de 20 000 caractères. Le corps de requête de `POST /api/imports` MUST être limité à 25 Mo. L'extraction MUST être limitée en débit (30 appels par heure glissante et par utilisateur, 429 au-delà).

#### Scenario: Trop d'images
- **WHEN** 21 images sont envoyées
- **THEN** la réponse est 422 et le LLM n'est pas appelé

#### Scenario: Débit dépassé
- **WHEN** une 31e extraction est demandée dans l'heure par le même utilisateur
- **THEN** la réponse est 429

### Requirement: Normalisation des lignes extraites
Chaque ligne extraite SHALL porter `DateOp` (date, jour), `LibelleSource` (libellé tel que lu dans la source, non vide), `NomOp` (libellé proposé, non vide, tronqué à la longueur de la colonne), `MontantOp` (arrondi à 2 décimales, **négatif pour une sortie d'argent, positif pour une entrée**) et `IDcat`. Quand l'année ou le mois manque dans la source, le LLM MUST la déduire de la date de référence fournie (date du jour) sans produire de date future de plus de 31 jours. Une ligne dont la date ou le montant ne peut pas être lu MUST être conservée avec `Confiance = faible` plutôt qu'inventée ou supprimée, la date manquante valant la date du jour.

#### Scenario: Débit carte
- **WHEN** la source contient « CB CARREFOUR 12/10 -45,30 »
- **THEN** la ligne a `MontantOp = -45.30`, `DateOp` au 12 octobre de l'année courante et `LibelleSource` « CB CARREFOUR »

#### Scenario: Ticket sans signe
- **WHEN** la source est un ticket de caisse dont le total est 23,90 €
- **THEN** la ligne a `MontantOp = -23.90`

### Requirement: Libellés au style de l'utilisateur
Le LLM SHALL proposer pour chaque ligne un `NomOp` rédigé comme l'utilisateur rédige ses propres opérations, et non le libellé technique du relevé. Il MUST recevoir à cette fin :
- les libellés les plus fréquents saisis par l'utilisateur (tels quels, casse comprise) ;
- les correspondances `LibelleSource` → `NomOp` des lignes d'imports déjà validés, avec la plus récente pour un même libellé source.

Quand le libellé source d'une ligne correspond (après normalisation : casse, chiffres, dates et références retirés) au libellé source d'une correspondance apprise, le `NomOp` appris MUST être proposé tel quel. Sans libellé approchant dans l'historique, le LLM MUST produire un libellé court et lisible (marchand ou objet, sans préfixe technique comme `CB`, `PRLV`, `VIR SEPA`, ni numéro de carte, référence ou date). Le `LibelleSource` MUST toujours rester disponible.

#### Scenario: Libellé habituel de l'utilisateur
- **WHEN** l'utilisateur saisit habituellement « Courses Carrefour » et qu'une ligne « CB CARREFOUR MARKET 12/10 CARTE 4974XXXX » est extraite
- **THEN** la ligne propose `NomOp` « Courses Carrefour » et conserve le libellé brut dans `LibelleSource`

#### Scenario: Correspondance apprise d'un import précédent
- **WHEN** lors d'un import validé, la ligne « PRLV SEPA FREE MOBILE REF 8812 » a été renommée « Forfait téléphone », et qu'un nouvel import contient « PRLV SEPA FREE MOBILE REF 9034 »
- **THEN** la ligne propose « Forfait téléphone »

#### Scenario: Marchand jamais vu
- **WHEN** une ligne « CB LE PETIT FOURNIL 03/10 » est extraite sans libellé proche dans l'historique
- **THEN** la ligne propose un libellé court comme « Le Petit Fournil », sans `CB` ni date

### Requirement: Catégorisation proposée
Le LLM SHALL recevoir la liste des catégories lisibles par l'utilisateur (les siennes et celles d'`IDuser = 0`, avec leur `Type`) et des exemples de ses opérations passées (libellé vers catégorie, les plus fréquents). Chaque ligne MUST recevoir un `IDcat` appartenant à cette liste ; un `IDcat` absent de la liste MUST être remplacé par `0` (« Aucune ») avec `Confiance = faible`. Chaque ligne MUST porter une `Confiance` parmi `haute`, `moyenne`, `faible`.

#### Scenario: Libellé déjà connu
- **WHEN** l'utilisateur a 30 opérations « NETFLIX » en catégorie Abonnements et qu'une ligne « NETFLIX.COM » est extraite
- **THEN** la ligne propose la catégorie Abonnements

#### Scenario: Catégorie inventée par le modèle
- **WHEN** le LLM renvoie un `IDcat` qui n'est pas lisible par l'utilisateur
- **THEN** la ligne est enregistrée avec `IDcat = 0` et `Confiance = faible`

### Requirement: Détection des doublons
Pour chaque ligne, le serveur SHALL rechercher une `Operation` du compte cible de même `MontantOp` exact dont `DateOp` est à 3 jours ou moins de la date extraite ; si elle existe, la ligne MUST porter `IDopDoublon` (l'opération la plus proche en date) et `Selection = false`. Deux lignes du même lot de même montant et de même date MUST être signalées : la seconde porte `DoublonLot = true` et `Selection = false`. Les autres lignes ont `Selection = true`.

#### Scenario: Opération déjà saisie
- **WHEN** le compte contient « Boulangerie -4,20 » le 10/10 et qu'une ligne « BOULANGERIE DUPONT -4,20 » du 11/10 est extraite
- **THEN** la ligne porte l'`IDop` existant dans `IDopDoublon` et est décochée

#### Scenario: Montant différent
- **WHEN** la seule opération proche en date a un montant différent
- **THEN** la ligne n'est pas signalée comme doublon et reste cochée

### Requirement: Lecture des lots
`GET /api/imports` SHALL renvoyer les lots `brouillon` de l'utilisateur (sans les lignes, avec leur nombre), du plus récent au plus ancien. `GET /api/imports/:id` SHALL renvoyer un lot et ses lignes. Un lot d'un autre utilisateur MUST répondre 404.

#### Scenario: Reprise d'un brouillon
- **WHEN** l'utilisateur rouvre l'import après avoir fermé l'application
- **THEN** son brouillon non validé est listé et peut être rouvert avec ses lignes

#### Scenario: Lot d'un autre utilisateur
- **WHEN** `GET /api/imports/:id` vise le lot d'un autre utilisateur
- **THEN** la réponse est 404

### Requirement: Validation transactionnelle
`POST /api/imports/:id/valider` SHALL accepter la liste finale des lignes retenues `[{ IDligne, DateOp, NomOp, MontantOp, IDcat }]`, éventuellement corrigées, valider chaque champ (Zod, `IDcat` lisible par l'utilisateur, `IDligne` appartenant au lot), puis, dans **une seule transaction** : créer une `Operation` par ligne sur le compte du lot (`CheckOp = true` : les lignes viennent d'un relevé, donc déjà passées en banque ; `amortissement = false`), enregistrer les valeurs finales (`NomOp`, `IDcat`, `Selection`) sur les `ImportLigne` correspondantes pour servir de correspondances apprises, et passer le lot en statut `valide`. Les lots validés MUST être conservés (pas de purge). La réponse MUST renvoyer le nombre et les `IDop` créés (201). Une seule erreur MUST annuler toute la transaction. Un lot déjà `valide` ou `abandonne` MUST répondre 409.

#### Scenario: Validation partielle
- **WHEN** le lot a 12 lignes dont 2 doublons décochés et que l'utilisateur valide les 10 autres
- **THEN** exactement 10 opérations, pointées, sont créées sur le compte du lot et le lot passe à `valide`

#### Scenario: Libellé corrigé en revue
- **WHEN** l'utilisateur remplace le libellé proposé « Free » par « Forfait téléphone » avant de valider
- **THEN** l'opération créée s'appelle « Forfait téléphone » et la ligne du lot garde la correspondance `LibelleSource` → « Forfait téléphone » pour les prochains imports

#### Scenario: Catégorie interdite à la validation
- **WHEN** une ligne validée porte l'`IDcat` d'une catégorie d'un autre utilisateur
- **THEN** la réponse est 400 et aucune opération n'est créée

#### Scenario: Double validation
- **WHEN** le même lot est validé deux fois (double clic, deux appareils)
- **THEN** la seconde validation répond 409 et aucune opération n'est dupliquée

### Requirement: Abandon et purge des brouillons
`DELETE /api/imports/:id` SHALL supprimer un lot `brouillon` de l'utilisateur et ses lignes (204). Les lots non validés de plus de 30 jours MUST être supprimés lors d'une création de lot par le même utilisateur.

#### Scenario: Abandon
- **WHEN** l'utilisateur abandonne un brouillon
- **THEN** le lot et ses lignes sont supprimés et aucune opération n'est créée

### Requirement: Appel du LLM
L'extraction SHALL passer par une interface d'extraction (`OperationExtractor`) dont l'implémentation par défaut utilise `@anthropic-ai/sdk` avec une sortie structurée validée par Zod, le modèle `ANTHROPIC_MODEL` (défaut `claude-opus-5-5`) et l'effort `ANTHROPIC_EFFORT` (défaut `low`), avec le repli serveur `fallbacks: 'default'` pour les modèles qui l'acceptent. Une erreur de l'API Anthropic, un refus (`stop_reason = refusal`) ou une sortie invalide MUST produire une erreur 502 au format uniforme, sans exposer la clé ni le contenu de la requête. Chaque appel MUST être journalisé sur une ligne JSON (`"event":"import"`, utilisateur, nombre d'images, tokens consommés, durée), sans contenu.

#### Scenario: API Anthropic indisponible
- **WHEN** l'API Anthropic répond 529
- **THEN** la route répond 502 avec un message invitant à réessayer et aucun lot n'est créé

#### Scenario: Extracteur de test
- **WHEN** les tests remplacent l'extracteur par un faux renvoyant 3 lignes
- **THEN** le lot est créé avec ces 3 lignes sans appel réseau
