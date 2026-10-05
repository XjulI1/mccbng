## 1. Liste générique

- [ ] 1.1 `server/utils/crud.ts` : clé primaire en dernier critère d'`ORDER BY` (sens du dernier critère demandé, `ASC` par défaut)
- [ ] 1.2 `server/utils/filter.ts` / `crud.ts` : `DEFAULT_MAX_LIMIT` appliqué sans `limit`, lecture de `limite + 1`, en-tête `X-Result-Truncated: true` si la limite coupe
- [ ] 1.3 `server/utils/filter.ts` : `LIKE ? ESCAPE '\\'` / `NOT LIKE ? ESCAPE '\\'` ; refus 400 de `like` / `nlike` sur une colonne non textuelle
- [ ] 1.4 Tests unitaires du filtre (échappement, refus sur colonne numérique) et tests API : 40 opérations à la même date sur deux pages sans doublon ni trou, liste tronquée avec en-tête, liste complète sans en-tête

## 2. Front

- [ ] 2.1 `app/utils/like.ts` : `escapeLike` ; tests unitaires
- [ ] 2.2 `fetchSearchOperations` : `like` échappé sur `NomOp`, `MontantOp: { inq: [x, -x] }` si le terme est numérique (virgule acceptée), plus de `like` sur `MontantOp`
- [ ] 2.3 `app/services/http.ts` : `console.warn` avec l'URL quand la réponse porte `X-Result-Truncated`
- [ ] 2.4 Revoir `amortissement.vue`, `PieByCategorie`, `CategoryHeatmap`, `TopCategories` : pagination ou agrégat serveur si le volume peut dépasser la limite, sinon `limit` explicite
- [ ] 2.5 Tests API : recherche « 12,5 » (exacte, valeur absolue), recherche « 100% »

## 3. Requêtes SQL

- [ ] 3.1 Bornes de mois et d'année en UTC (`server/utils/dates.ts`, réutiliser l'existant s'il y en a) ; tests unitaires (décembre → janvier, années bissextiles)
- [ ] 3.2 Remplacer les filtres `MONTH()`/`YEAR()` par `DateOp >= ? AND DateOp < ?` dans `sumByUserByMonth`, `sumCategoriesByUserByMonth` et `server/utils/stats.ts` (les `GROUP BY MONTH()` restent)
- [ ] 3.3 Remplacer les `NATURAL JOIN Compte` par `JOIN Compte USING (IDcompte)` (stats, `suggestCategories`, `sumAllCompteForUser`, auto-génération)
- [ ] 3.4 `server/api/comptes/management-info.get.ts` : 3 requêtes groupées (`MAX(DateOp)`, deux `COUNT … GROUP BY IDcompte`)
- [ ] 3.5 `suggestCategories` : `LIMIT ?` paramétré, `LOWER` et `toLowerCase` supprimés, terme échappé (`escapeLike` serveur dans `server/utils/sql.ts`)
- [ ] 3.6 Tests API : résultats des stats et des totaux mensuels inchangés (y compris opérations au premier et au dernier instant du mois), `management-info` inchangé fonctionnellement
