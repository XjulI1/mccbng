## MODIFIED Requirements

### Requirement: Filtre de liste compatible LoopBack
Les routes de liste (`GET /api/<ressource>`) SHALL accepter le paramètre `filter` JSON utilisé par le front, avec au minimum : `where` (égalité, `and`, `or`, `inq`, `like`), `order` (chaîne `"COL ASC, COL DESC"`), `limit`, `skip` et `include: [{ relation: 'banque' }]` pour les comptes. Les noms de colonnes et opérateurs MUST être validés contre une liste blanche par ressource (jamais interpolés tels quels dans le SQL), et le filtre d'appartenance utilisateur MUST toujours être combiné par `and` au `where` fourni. La clé primaire MUST être ajoutée comme dernier critère de tri pour garantir une pagination déterministe. En l'absence de `limit`, y compris lorsque seul `skip` est fourni, une limite par défaut MUST s'appliquer ; un `limit` explicite MUST être plafonné à cette même valeur. Les opérateurs `like` / `nlike` MUST être générés avec `ESCAPE '\\'`, de sorte qu'un `\%` ou `\_` fourni désigne le caractère littéral, et MUST être refusés (400) sur une colonne non textuelle.

#### Scenario: Pagination des opérations
- **WHEN** le front appelle `GET /api/operations?filter={"where":{"IDcompte":3},"order":"CheckOp ASC, DateOp DESC","limit":35,"skip":35}`
- **THEN** la deuxième page de 35 opérations du compte 3 est renvoyée dans cet ordre

#### Scenario: Ex aequo sur la date
- **WHEN** un compte a 40 opérations non pointées à la même date et le front charge deux pages de 35
- **THEN** les 40 opérations apparaissent chacune exactement une fois sur l'ensemble des deux pages

#### Scenario: Liste sans limite bornée
- **WHEN** `GET /api/operations` est appelé sans `limit` et que plus d'éléments que la limite par défaut correspondent
- **THEN** exactement la limite par défaut d'éléments est renvoyée

#### Scenario: skip sans limite
- **WHEN** `GET /api/operations` est appelé avec `skip` et sans `limit`
- **THEN** au plus la limite par défaut d'éléments est renvoyée, à partir du décalage demandé

#### Scenario: Liste sans limite complète
- **WHEN** `GET /api/categories` est appelé sans `limit` et que moins d'éléments que la limite par défaut correspondent
- **THEN** tous les éléments sont renvoyés

#### Scenario: Joker échappé
- **WHEN** le filtre contient `{ "NomOp": { "like": "%100\\%%" } }`
- **THEN** seules les opérations dont le nom contient littéralement `100%` sont renvoyées

#### Scenario: like sur une colonne numérique
- **WHEN** le filtre contient `{ "MontantOp": { "like": "%12%" } }`
- **THEN** la réponse est 400 et aucune requête SQL n'est exécutée

#### Scenario: Colonne inconnue
- **WHEN** un filtre référence une colonne absente de la liste blanche
- **THEN** la réponse est 400 et aucune requête SQL n'est exécutée

#### Scenario: Tentative de contourner le scope
- **WHEN** un utilisateur envoie `where: { IDuser: <autre utilisateur> }` sur `/api/comptes`
- **THEN** le résultat est vide (le scope utilisateur est appliqué en plus)
