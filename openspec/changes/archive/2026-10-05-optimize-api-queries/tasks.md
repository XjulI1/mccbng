## 1. Liste générique

- [x] 1.1 `server/utils/crud.ts` : clé primaire en dernier critère d'`ORDER BY` (sens du dernier critère demandé, `ASC` par défaut)
- [x] 1.2 `server/utils/filter.ts` / `crud.ts` : `DEFAULT_MAX_LIMIT` appliqué sans `limit`, y compris avec un `skip` seul (suppression du `limit(Number.MAX_SAFE_INTEGER)`)
- [x] 1.3 `server/utils/filter.ts` : `LIKE ? ESCAPE '\\'` / `NOT LIKE ? ESCAPE '\\'` (hypothèse `NO_BACKSLASH_ESCAPES` désactivé, commentée) ; refus 400 de `like` / `nlike` sur une colonne non textuelle
- [x] 1.4 Tests unitaires du filtre (échappement, refus sur colonne numérique) et tests API : 40 opérations à la même date sur deux pages sans doublon ni trou, liste sans `limit` bornée, `skip` sans `limit` borné

## 2. Front

- [x] 2.1 `app/utils/like.ts` : `escapeLike` ; tests unitaires
- [x] 2.2 `fetchSearchOperations` : `like` échappé sur `NomOp` ; terme numérique (virgule acceptée, signe ignoré) : plage `[x ; x+1[` en valeur absolue pour un entier, `MontantOp: { inq: [x, -x] }` pour un décimal ; plus de `like` sur `MontantOp` ; tests unitaires de la construction du filtre
- [x] 2.3 `fetchOperations(where, limit)` : `limit` explicite (1000) depuis `amortissement.vue`, `PieByCategorie`, `CategoryHeatmap`, `TopCategories` (paramètre `limit = MAX_LIST_LIMIT` de l'action du store, utilisée par ces quatre écrans)
- [x] 2.4 `app/utils/dates.ts` (`monthRange`, `dayRange`, bornes ISO UTC semi-ouvertes) ; `PieByCategorie`, `CategoryHeatmap`, `TopCategories` filtrent `gte` début / `lt` début de la période suivante ; suppression des `lastDayOfMonth` locaux ; tests unitaires (décembre → janvier, février bissextile)
- [x] 2.5 Tests API : recherche « 12,5 » (exacte, valeur absolue), recherche « 12 » (plage [12 ; 13[, valeur absolue), recherche « 100% »

## 3. Requêtes SQL

- [x] 3.1 `monthRange` / `yearRange` en UTC à côté de `parseRange` (`server/utils/stats.ts`) ; tests unitaires (décembre → janvier, années bissextiles)
- [x] 3.2 Remplacer les filtres `MONTH()`/`YEAR()` par `DateOp >= ? AND DateOp < ?` dans `sumByUserByMonth`, `sumCategoriesByUserByMonth`, `yearComparison` (deux intervalles en `OR`), `incomeVsExpense` et `categoryHeatmap` (les `GROUP BY MONTH()` restent)
- [x] 3.3 Remplacer les `NATURAL JOIN Compte` par `JOIN Compte USING (IDcompte)` (`evolutionSolde` × 3, `suggestCategories`)
- [x] 3.4 `server/api/comptes/management-info.get.ts` : 3 requêtes groupées (`MAX(DateOp)`, deux `COUNT … GROUP BY IDcompte`)
- [x] 3.5 `suggestCategories` : `LIMIT ?` paramétré, `LOWER` et `toLowerCase` supprimés, terme échappé (`escapeLike` serveur dans `server/utils/sql.ts`)
- [x] 3.6 Tests API : résultats des stats et des totaux mensuels inchangés (y compris opérations au premier et au dernier instant du mois), `management-info` inchangé fonctionnellement
- [x] 3.7 Ordre déterministe hors CRUD générique : `topOperations` (`ORDER BY ABS(MontantOp) DESC, IDop DESC`), `management-info` (`ORDER BY IDcompte`). Constat de la répétition du 2026-10-05 : après passage en InnoDB, les ex aequo de `topOperations` et l'ordre des comptes de `management-info` changent
- [x] 3.8 Liste paginée : la répétition montre `Using filesort` (tri mixte `CheckOp ASC, DateOp DESC, IDop DESC`, environ 2 400 lignes pour le plus gros compte). Mesurer, et n'ajouter un index descendant `(IDcompte, CheckOp, DateOp DESC, IDop DESC)` (MariaDB ≥ 10.8) que si le gain est réel. Mesure sur MariaDB 10.11 jetable (2 400 opérations sur le compte, 12 000 au total) : environ 1,5 ms par page côté serveur avec `filesort`, 0,5 ms avec l'index descendant (plus de `filesort`). Gain d'environ 1 ms, négligeable devant la latence réseau : **index non ajouté**
