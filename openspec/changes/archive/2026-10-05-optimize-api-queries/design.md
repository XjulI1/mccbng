## Context

Le CRUD générique (`server/utils/crud.ts`) construit les listes à partir du paramètre `filter` analysé par `parseFilter` (`server/utils/filter.ts`). `DEFAULT_MAX_LIMIT = 1000` ne plafonne aujourd'hui que les `limit` fournis : une liste sans `limit` n'est pas bornée. L'ordre est celui demandé par le client, sans départage.

Le front appelle des listes sans `limit` via `fetchOperations(where)` (`app/services/operation.ts`) depuis `amortissement.vue`, `PieByCategorie`, `CategoryHeatmap` et `TopCategories`, et `fetchCategoryList`. Un `skip` sans `limit` produit aujourd'hui `LIMIT Number.MAX_SAFE_INTEGER`. Les trois composants de stats construisent leurs bornes de dates par `new Date(`${year}-${month}-01 00:00:00Z`)` (format non ISO, mois sans zéro) avec une borne haute `lte … 23:59:59Z`. La recherche transverse (`fetchSearchOperations`) envoie `or: [{ NomOp: { like } }, { MontantOp: { like } }]`.

Les requêtes de stats et de totaux mensuels filtrent avec `MONTH(DateOp) = ? AND YEAR(DateOp) = ?` ou `YEAR(DateOp) IN (…)` (`yearComparison`, `incomeVsExpense`, `categoryHeatmap`, `sumByUserByMonth`, `sumCategoriesByUserByMonth`) ; `topCategories` et `topOperations` utilisent déjà un intervalle (`parseRange`, `server/utils/stats.ts`). Les dates sont lues et écrites en UTC (`timezone: 'Z'`).

Constats de l'audit du 2026-10-05 traités ici : D-M1 / F-M4 (pagination), D-B5 / S-B5 (liste non bornée), D-B3 (`like`, recherche par montant), D-M9 (fonctions sur `DateOp`), D-B7 (`NATURAL JOIN`), D-M10 (`management-info`).

## Goals / Non-Goals

**Goals :**
- Une pagination déterministe.
- Aucune liste non bornée.
- Des recherches qui renvoient ce que l'utilisateur a tapé.
- Des requêtes qui peuvent utiliser les index créés par `harden-db-schema-and-cleanup`.

**Non-Goals :**
- La pagination par curseur : le départage par clé primaire suffit pour l'infinite scroll actuel.
- Le changement des résultats des stats : seules les formes de requête changent.

## Decisions

### D1. Départage par clé primaire
`crud.ts` ajoute systématiquement la clé primaire comme dernier critère d'`ORDER BY` : `DESC` si le dernier critère demandé est `DESC`, `ASC` sinon (et `ASC` sans ordre demandé). Pour `CheckOp ASC, DateOp DESC`, l'ordre devient `CheckOp ASC, DateOp DESC, IDop DESC`.

### D2. Limite par défaut, sans signal de troncature
- Sans `limit` (y compris avec un `skip` seul), `DEFAULT_MAX_LIMIT` (1000) s'applique. Un `limit` explicite reste plafonné à cette valeur.
- Aucun en-tête ni avertissement de troncature : le plafond est un garde-fou, pas un mode de lecture. Une fois les écrans revus, aucun n'en approche.
- `fetchOperations(where, limit)` impose une `limit` explicite :
  - `amortissement.vue` : `DEFAULT_MAX_LIMIT` (1000), sans pagination (l'infinite scroll reste désactivé pour « Coûts d'usage ») ; le volume réel est très inférieur ;
  - `PieByCategorie`, `CategoryHeatmap`, `TopCategories` : une catégorie sur un mois ou une période, volume borné par construction ; même limite explicite.
- `fetchCategoryList` et `fetchRecurrOperation` restent sans `limit` (quelques dizaines de lignes) ; le plafond par défaut les couvre.
- *Alternatives écartées* : pas de limite par défaut (une requête au `where` trop large reste possible) ; en-tête `X-Result-Truncated` + `console.warn` (jamais lu dans la PWA) ; pagination de l'amortissement (modification du store pour un volume qui ne le justifie pas).

### D3. Échappement de `like`
La valeur reçue par le serveur contient déjà les jokers voulus par l'appelant (`%${terme}%`) : le serveur ne peut pas distinguer un `%` saisi d'un joker. Convention retenue :
- **le front échappe le terme saisi** (`\` → `\\`, `%` → `\%`, `_` → `\_`) avant d'ajouter ses jokers, via un utilitaire `escapeLike` (`app/utils/like.ts`), utilisé par la recherche transverse ;
- `filter.ts` génère `col LIKE ? ESCAPE '\\'` (et `NOT LIKE`), pour rendre explicite le caractère d'échappement. Hypothèse documentée : le mode SQL `NO_BACKSLASH_ESCAPES` est désactivé (sinon `'\\'` est une chaîne de deux caractères, refusée par `ESCAPE`) ; `mysql2`, qui interpole les paramètres côté client avec des `\`, le suppose déjà ;
- les routes qui construisent elles-mêmes un `LIKE` à partir d'un terme brut (`suggestCategories`) échappent le terme côté serveur avec la même fonction (`server/utils/sql.ts`).
- `like` / `nlike` sont refusés (400) sur une colonne non textuelle (numérique, date, booléen) : la liste blanche de colonnes connaît leur type via Drizzle.
- *Alternative* : échapper côté serveur et ajouter les jokers côté serveur (opérateur `contains`). Écartée : elle change le contrat du filtre LoopBack.

### D4. Recherche par montant
`fetchSearchOperations` détecte un terme numérique (`/^-?\d+([.,]\d{1,2})?$/`, virgule convertie en point, signe ignoré : `x = |terme|`) et ajoute au `like` échappé sur `NomOp` une comparaison de montant en valeur absolue :
- **terme entier** (`12`) : plage d'un euro, `|MontantOp| ∈ [x ; x+1[`, envoyée comme `{ MontantOp: { gte: x, lt: x+1 } }` et `{ MontantOp: { gt: -(x+1), lte: -x } }` ;
- **terme décimal** (`12,5`, `12,55`) : égalité exacte, `{ MontantOp: { inq: [x, -x] } }`.

Le tout est combiné en `or` avec le `like` sur `NomOp`. Un terme non numérique n'envoie que le `like`. L'égalité et les bornes sont exactes grâce aux montants `DECIMAL(12,2)`.
- *Alternatives écartées* : égalité exacte même pour un entier (« 12 » ne trouverait plus 12,49) ; précision déduite du nombre de décimales (« 12,5 » → [12,50 ; 12,60[), moins prévisible.

### D5. Intervalles de dates
Des fonctions `monthRange(year, month)` / `yearRange(year)`, placées à côté de `parseRange` dans `server/utils/stats.ts`, calculent en UTC les bornes `[début, début de la période suivante)`. Elles s'appliquent à `yearComparison` (deux années pas forcément contiguës : deux intervalles combinés par `OR`), `incomeVsExpense`, `categoryHeatmap`, `sumByUserByMonth` et `sumCategoriesByUserByMonth`. Les requêtes filtrent `DateOp >= ? AND DateOp < ?`. Les regroupements par mois (`GROUP BY MONTH(DateOp)`) restent : seule la clause `WHERE` doit être indexable.

### D6. Jointures explicites
`NATURAL JOIN Compte` devient `JOIN Compte USING (IDcompte)` dans les trois requêtes de `evolutionSolde` (`server/utils/stats.ts`) et dans `suggestCategories`, les seules occurrences restantes.

### D7. `management-info` groupé
Trois requêtes pour l'ensemble des comptes de l'utilisateur :
- `SELECT IDcompte, MAX(DateOp) … FROM Operation WHERE IDcompte IN (…) GROUP BY IDcompte` ;
- `SELECT IDcompte, COUNT(*) FROM OperationRecurrente WHERE IDcompte IN (…) GROUP BY IDcompte` ;
- `SELECT IDcompte, COUNT(*) FROM Credit WHERE IDcompte IN (…) GROUP BY IDcompte`.

Le résultat est assemblé en JS, dans l'ordre des comptes, avec la même forme `{ IDcompte, lastOpDate, hasReferences }`.

### D8. `suggestCategories`
`LIMIT ?` paramétré ; `LOWER(NomOp)` et `toLowerCase()` supprimés, la collation `utf8mb4_unicode_ci` étant insensible à la casse (et aux accents, comme aujourd'hui) ; le terme est échappé (D3).

### D9. Bornes de dates du front
Un utilitaire `app/utils/dates.ts` (`monthRange(year, month)`, `dayRange(from, to)`) produit des bornes ISO UTC strictes (`2026-01-01T00:00:00.000Z`) et un intervalle semi-ouvert. `PieByCategorie`, `CategoryHeatmap` et `TopCategories` filtrent `DateOp: { gte: début }` et `DateOp: { lt: début de la période suivante }`, au lieu de `new Date('2026-1-01 00:00:00Z')` (format non ISO, que WebKit peut refuser) et de `lte … 23:59:59Z`. Les fonctions `lastDayOfMonth` locales deviennent inutiles.

## Risks / Trade-offs

- [Le départage change l'ordre des ex aequo par rapport à aujourd'hui] → Sans effet visible : l'ordre actuel des ex aequo n'est pas défini.
- [Un écran reçoit un résultat tronqué sans le savoir] → Accepté : les quatre écrans connus passent une limite explicite très supérieure à leur volume réel ; les autres listes sans limite (catégories, récurrentes) font quelques dizaines de lignes.
- [Refus de `like` sur les colonnes numériques : un ancien client en cache (PWA) envoie encore `MontantOp: { like }`] → La recherche de cet ancien client répond 400 jusqu'à la mise à jour du service worker. Accepté : application mono-client, mise à jour automatique.
- [Bornes de mois calculées en UTC] → Identique au comportement actuel de `MONTH()` sur des dates stockées en UTC.

## Migration Plan

Déploiement simple, sans migration de données, après `harden-db-schema-and-cleanup`. Rollback par retour à l'image précédente.

## Open Questions

_Aucune._
