## Context

Le CRUD générique (`server/utils/crud.ts`) construit les listes à partir du paramètre `filter` analysé par `parseFilter` (`server/utils/filter.ts`). `DEFAULT_MAX_LIMIT = 1000` ne plafonne aujourd'hui que les `limit` fournis : une liste sans `limit` n'est pas bornée. L'ordre est celui demandé par le client, sans départage.

Le front appelle des listes sans `limit` via `fetchOperations(where)` (`app/services/operation.ts`) depuis `amortissement.vue`, `PieByCategorie`, `CategoryHeatmap` et `TopCategories`, et `fetchCategoryList`. La recherche transverse (`fetchSearchOperations`) envoie `or: [{ NomOp: { like } }, { MontantOp: { like } }]`.

Les requêtes de stats et de totaux mensuels filtrent avec `MONTH(DateOp) = ? AND YEAR(DateOp) = ?` ou `YEAR(DateOp) IN (…)`. Les dates sont lues et écrites en UTC (`timezone: 'Z'`).

Constats de l'audit du 2026-10-05 traités ici : D-M1 / F-M4 (pagination), D-B5 / S-B5 (liste non bornée), D-B3 (`like`, recherche par montant), D-M9 (fonctions sur `DateOp`), D-B7 (`NATURAL JOIN`), D-M10 (`management-info`).

## Goals / Non-Goals

**Goals :**
- Une pagination déterministe.
- Aucune liste non bornée, et aucune troncature silencieuse.
- Des recherches qui renvoient ce que l'utilisateur a tapé.
- Des requêtes qui peuvent utiliser les index créés par `harden-db-schema-and-cleanup`.

**Non-Goals :**
- La pagination par curseur : le départage par clé primaire suffit pour l'infinite scroll actuel.
- Le changement des résultats des stats : seules les formes de requête changent.

## Decisions

### D1. Départage par clé primaire
`crud.ts` ajoute systématiquement la clé primaire comme dernier critère d'`ORDER BY` : `DESC` si le dernier critère demandé est `DESC`, `ASC` sinon (et `ASC` sans ordre demandé). Pour `CheckOp ASC, DateOp DESC`, l'ordre devient `CheckOp ASC, DateOp DESC, IDop DESC`.

### D2. Limite par défaut et signal de troncature
- Sans `limit`, `DEFAULT_MAX_LIMIT` (1000) s'applique. La requête lit `limite + 1` lignes : si la ligne supplémentaire existe, elle est retirée et la réponse porte l'en-tête `X-Result-Truncated: true`.
- Un `limit` explicite reste plafonné à `DEFAULT_MAX_LIMIT`, sans en-tête (le client a demandé une page).
- `app/services/http.ts` journalise un `console.warn` avec l'URL lorsqu'une réponse porte cet en-tête.
- Les quatre écrans qui appellent `fetchOperations` sans `limit` sont revus : ceux dont le volume réel peut dépasser la limite (au moins `amortissement.vue`, qui couvre plusieurs années) paginent ou passent par un agrégat serveur ; les autres passent une `limit` explicite. `fetchCategoryList` reste sans `limit` (quelques dizaines de catégories).
- *Alternative* : pas de limite par défaut, le scope utilisateur bornant le volume. Écartée : une requête au `where` trop large reste possible.

### D3. Échappement de `like`
La valeur reçue par le serveur contient déjà les jokers voulus par l'appelant (`%${terme}%`) : le serveur ne peut pas distinguer un `%` saisi d'un joker. Convention retenue :
- **le front échappe le terme saisi** (`\` → `\\`, `%` → `\%`, `_` → `\_`) avant d'ajouter ses jokers, via un utilitaire `escapeLike` (`app/utils/like.ts`), utilisé par la recherche transverse ;
- `filter.ts` génère `col LIKE ? ESCAPE '\\'` (et `NOT LIKE`), pour que l'échappement soit interprété explicitement, quel que soit `NO_BACKSLASH_ESCAPES` ;
- les routes qui construisent elles-mêmes un `LIKE` à partir d'un terme brut (`suggestCategories`) échappent le terme côté serveur avec la même fonction (`server/utils/sql.ts`).
- `like` / `nlike` sont refusés (400) sur une colonne non textuelle (numérique, date, booléen) : la liste blanche de colonnes connaît leur type via Drizzle.
- *Alternative* : échapper côté serveur et ajouter les jokers côté serveur (opérateur `contains`). Écartée : elle change le contrat du filtre LoopBack.

### D4. Recherche par montant
`fetchSearchOperations` détecte un terme numérique (`/^-?\d+([.,]\d{1,2})?$/`, virgule convertie en point) et envoie alors `or: [{ NomOp: { like: '%terme échappé%' } }, { MontantOp: { inq: [x, -x] } }]`. Sinon, seul le `like` sur `NomOp` est envoyé. L'égalité est exacte grâce aux montants `DECIMAL(12,2)`.

### D5. Intervalles de dates
Une fonction `monthRange(year, month)` / `yearRange(year)` (`server/utils/dates.ts`, à réutiliser si elle existe déjà depuis `fix-recurring-and-credit-calculations`) calcule en UTC les bornes `[début, début de la période suivante)`. Les requêtes filtrent `DateOp >= ? AND DateOp < ?`. Les regroupements par mois (`GROUP BY MONTH(DateOp)`) restent : seule la clause `WHERE` doit être indexable.

### D6. Jointures explicites
`NATURAL JOIN Compte` devient `JOIN Compte USING (IDcompte)` dans `stats.ts`, `suggestCategories`, `sumAllCompteForUser` et l'auto-génération.

### D7. `management-info` groupé
Trois requêtes pour l'ensemble des comptes de l'utilisateur :
- `SELECT IDcompte, MAX(DateOp) … FROM Operation WHERE IDcompte IN (…) GROUP BY IDcompte` ;
- `SELECT IDcompte, COUNT(*) FROM OperationRecurrente WHERE IDcompte IN (…) GROUP BY IDcompte` ;
- `SELECT IDcompte, COUNT(*) FROM Credit WHERE IDcompte IN (…) GROUP BY IDcompte`.

Le résultat est assemblé en JS, dans l'ordre des comptes, avec la même forme `{ IDcompte, lastOpDate, hasReferences }`.

### D8. `suggestCategories`
`LIMIT ?` paramétré ; `LOWER(NomOp)` et `toLowerCase()` supprimés, la collation `utf8mb4_unicode_ci` étant insensible à la casse ; le terme est échappé (D3).

## Risks / Trade-offs

- [Le départage change l'ordre des ex aequo par rapport à aujourd'hui] → Sans effet visible : l'ordre actuel des ex aequo n'est pas défini.
- [Un écran reçoit un résultat tronqué] → En-tête et avertissement en console ; revue des quatre écrans connus.
- [Refus de `like` sur les colonnes numériques : un ancien client en cache (PWA) envoie encore `MontantOp: { like }`] → La recherche de cet ancien client répond 400 jusqu'à la mise à jour du service worker. Accepté : application mono-client, mise à jour automatique.
- [Bornes de mois calculées en UTC] → Identique au comportement actuel de `MONTH()` sur des dates stockées en UTC.

## Migration Plan

Déploiement simple, sans migration de données, après `harden-db-schema-and-cleanup`. Rollback par retour à l'image précédente.

## Open Questions

_Aucune._
