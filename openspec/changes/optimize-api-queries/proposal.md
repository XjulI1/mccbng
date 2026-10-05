## Why

L'audit du 2026-10-05 relève, dans les requêtes de l'API, des défauts de résultat et de performance indépendants du schéma :
- pagination `LIMIT/OFFSET` sans critère de départage : des opérations à la même date peuvent apparaître deux fois ou jamais lors de l'infinite scroll ;
- listes sans `limit` non bornées ;
- `%` et `_` non échappés dans les filtres `like` : chercher « 100% » renvoie trop de résultats ;
- recherche par montant via `LIKE` sur un nombre : chercher « 12 » trouve aussi 112,50 ou 1 200 ;
- filtres `MONTH()`/`YEAR()` qui empêchent l'usage des index de dates ;
- `NATURAL JOIN Compte`, qui dépend de toutes les colonnes de même nom ;
- `management-info` : 3 requêtes par compte, en parallèle, sur un pool de 10 connexions.

## What Changes

- **Liste générique** (`server/utils/{crud,filter}.ts`) :
  - clé primaire ajoutée en dernier critère d'`ORDER BY` ;
  - `DEFAULT_MAX_LIMIT` appliqué en l'absence de `limit`, avec l'en-tête `X-Result-Truncated: true` lorsque la limite coupe le résultat ; le front journalise un avertissement ;
  - `like` / `nlike` générés avec `ESCAPE '\\'` ; le front échappe `\`, `%` et `_` dans le terme saisi avant d'ajouter ses jokers, `suggestCategories` échappe le sien côté serveur ;
  - `like` / `nlike` refusés (400) sur les colonnes non textuelles.
- **Recherche par montant** : le front envoie `MontantOp: { inq: [x, -x] }` quand le terme est numérique (virgule acceptée), au lieu d'un `like` ; le libellé reste en `like` échappé.
- **Écrans sans limite** : `amortissement.vue`, `PieByCategorie`, `CategoryHeatmap` et `TopCategories` passent une `limit` explicite ou paginent.
- **Requêtes SQL** :
  - intervalles de dates (`DateOp >= ? AND DateOp < ?`) au lieu de `MONTH()`/`YEAR()` dans `sumByUserByMonth`, `sumCategoriesByUserByMonth` et `server/utils/stats.ts` ;
  - `NATURAL JOIN Compte` remplacés par `JOIN Compte USING (IDcompte)` ;
  - `management-info` réécrit en 3 requêtes groupées pour tous les comptes ;
  - `suggestCategories` : `LIMIT ?` paramétré, `LOWER` supprimé (collation insensible à la casse).

## Capabilities

### New Capabilities
_Aucune._

### Modified Capabilities
- `api-server-foundation` : la pagination est déterministe, toute liste est bornée et signale sa troncature, les filtres `like` sont échappés et réservés aux colonnes textuelles.
- `api-operations` : la recherche transverse compare les montants exactement, en valeur absolue.

## Impact

- **Code** :
  - `server/utils/{crud,filter,stats}.ts` ;
  - `server/api/operations/{sumByUserByMonth,sumCategoriesByUserByMonth,suggestCategories}.get.ts` et `server/api/comptes/management-info.get.ts` ;
  - `server/utils/sql.ts` (`escapeLike`), `app/utils/like.ts` ;
  - `app/services/{http,operation}.ts`, `app/pages/amortissement.vue`, `app/components/Stats/{PieByCategorie,CategoryHeatmap,TopCategories}.vue`.
- **Dépendances** : à livrer après `harden-db-schema-and-cleanup`. La recherche exacte par montant suppose des montants en `DECIMAL` (une égalité sur un `FLOAT` échoue), et les intervalles de dates tirent parti de l'index `Operation(IDcompte, DateOp)`.
- **Comportement** : la recherche par montant ne fait plus de correspondance partielle.
