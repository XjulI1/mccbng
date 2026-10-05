## MODIFIED Requirements

### Requirement: Schéma Drizzle fidèle à la base existante
Les tables `User`, `UserCredentials`, `Banque`, `Compte`, `Operation`, `OperationRecurrente`, `Categorie`, `Credit` et `Bien` SHALL être décrites en TypeScript avec exactement les noms de tables, colonnes, types et valeurs par défaut du schéma obtenu après application de toutes les migrations versionnées (`DECIMAL(12,2)` pour les montants une fois la migration des montants appliquée, `ENUM` pour `Categorie.Type`, drapeaux de compte `NOT NULL`). Les montants MUST être lus comme des nombres et renvoyés arrondis à 2 décimales aux endroits où LoopBack le faisait.

#### Scenario: Lecture d'une opération
- **WHEN** une opération existante est lue via `GET /api/operations/{id}`
- **THEN** ses champs (`IDop`, `NomOp`, `MontantOp`, `DateOp`, `CheckOp`, `IDcompte`, `IDcat`, `amortissement`, `IDcredit`) ont les mêmes noms et types JSON qu'avant

#### Scenario: Schéma aligné sur les migrations
- **WHEN** les migrations sont appliquées sur une base vide et le schéma Drizzle est comparé à `information_schema`
- **THEN** les tables, colonnes, types et défauts correspondent

### Requirement: Filtre de liste compatible LoopBack
Les routes de liste (`GET /api/<ressource>`) SHALL accepter le paramètre `filter` JSON utilisé par le front, avec au minimum : `where` (égalité, `and`, `or`, `inq`, `like`), `order` (chaîne `"COL ASC, COL DESC"`), `limit`, `skip` et `include: [{ relation: 'banque' }]` pour les comptes. Les noms de colonnes et opérateurs MUST être validés contre une liste blanche par ressource (jamais interpolés tels quels dans le SQL), et le filtre d'appartenance utilisateur MUST toujours être combiné par `and` au `where` fourni. La clé primaire MUST être ajoutée comme dernier critère de tri pour garantir une pagination déterministe ; en l'absence de `limit`, une limite par défaut MUST s'appliquer ; les caractères `%`, `_` et `\` d'une valeur `like` MUST être échappés, les jokers n'étant ajoutés que par le code appelant.

#### Scenario: Pagination des opérations
- **WHEN** le front appelle `GET /api/operations?filter={"where":{"IDcompte":3},"order":"CheckOp ASC, DateOp DESC","limit":35,"skip":35}`
- **THEN** la deuxième page de 35 opérations du compte 3 est renvoyée dans cet ordre

#### Scenario: Ex aequo sur la date
- **WHEN** un compte a 40 opérations non pointées à la même date et le front charge deux pages de 35
- **THEN** les 40 opérations apparaissent chacune exactement une fois sur l'ensemble des deux pages

#### Scenario: Liste sans limite
- **WHEN** `GET /api/operations` est appelé sans `limit`
- **THEN** au plus la limite par défaut d'éléments est renvoyée

#### Scenario: Recherche avec caractère joker
- **WHEN** le front recherche le libellé `100%`
- **THEN** seules les opérations dont le nom contient littéralement `100%` sont renvoyées

#### Scenario: Colonne inconnue
- **WHEN** un filtre référence une colonne absente de la liste blanche
- **THEN** la réponse est 400 et aucune requête SQL n'est exécutée

#### Scenario: Tentative de contourner le scope
- **WHEN** un utilisateur envoie `where: { IDuser: <autre utilisateur> }` sur `/api/comptes`
- **THEN** le résultat est vide (le scope utilisateur est appliqué en plus)
