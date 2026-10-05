## 1. Diagnostic préalable

- [ ] 1.1 Écrire `scripts/diagnose-recurrentes.mjs` (lecture seule) : récurrentes dont `JourNumOpRecu` ≠ jour de `DernierDateOpRecu`, `Frequence` ∉ {3, 7}, `MoisOpRecu` hors 0-11, récurrentes liées à un crédit terminé ou inexistant, doublons d'opérations générées (même compte, nom, montant et date)
- [ ] 1.2 Exécuter le diagnostic en production, revoir la liste avec l'utilisateur et corriger les `JourNumOpRecu`/`MoisOpRecu` concernés

## 2. Échéancier

- [ ] 2.1 Créer `server/utils/schedule.ts` avec `nextDueDate(rec, after)` (UTC, jour borné au dernier jour du mois, mois/année suivants)
- [ ] 2.2 Tests unitaires : 31 janvier → 28/29 février → 31 mars, 29 février annuel, `JourNumOpRecu` 25 après une date décalée au 3, décembre → janvier, annuel avec `MoisOpRecu` 0 et 11
- [ ] 2.3 Créer `server/utils/money.ts` (`round2` avec `Number.EPSILON`) et l'utiliser dans `remaining-balance` et les agrégats ; test 1,005 → 1,01

## 3. Auto-génération

- [ ] 3.1 Réécrire `server/api/operation-recurrentes/auto-generation.post.ts` : jointure gauche sur `Credit`, boucle d'échéances dues (anticipation de 15 j en mensuel, 30 j en annuel), plafond de 24 par récurrente
- [ ] 3.2 Réserver chaque échéance par `UPDATE … WHERE IDopRecu = ? AND DernierDateOpRecu = ?`, insérer seulement si `affectedRows = 1`, et compenser en cas d'échec d'insertion
- [ ] 3.3 Ignorer les récurrentes dont le crédit est inexistant, non `actif`, ou dont l'échéance dépasse `DateFin` ; journaliser les orphelines
- [ ] 3.4 Tests API : échéance au jour choisi, fin de mois, rattrapage de 3 mois en un appel, deux appels concurrents (`Promise.all`) sans doublon, crédit terminé, plafond de 24

## 4. Récurrentes : validation

- [ ] 4.1 `server/utils/resources.ts` : défaut `MoisOpRecu: 0` ; Zod `Frequence` ∈ {3, 7}, `JourNumOpRecu` int 1-31, `MoisOpRecu` int 0-11
- [ ] 4.2 Tests API des bornes et du défaut

## 5. Crédits

- [ ] 5.1 `onCreate` : initialiser `DernierDateOpRecu` à la dernière échéance ≤ aujourd'hui (ou la veille de `DateDebut` si futur), supprimer la récurrente dans un `catch` en cas d'échec
- [ ] 5.2 `onDelete` : supprimer la récurrente avant le crédit
- [ ] 5.3 Ajouter un hook `onUpdate` au CRUD générique (`server/utils/crud.ts`) et l'implémenter pour `creditResource` (propagation vers la récurrente) ; refuser le `PATCH` en masse des crédits
- [ ] 5.4 Réécrire `server/api/credits/[id]/remaining-balance.get.ts` : sorties seulement, `DateOp ≤ aujourd'hui`, intérêts par mois entier écoulé depuis `DateDebut`, `round2`
- [ ] 5.5 Tests API : crédit créé dans le passé sans rattrapage, échec partiel sans orphelin, propagation montant et compte, déblocage positif ignoré, deux paiements dans le même mois, échéance future ignorée

## 6. Statistiques et agrégats

- [ ] 6.1 `server/utils/stats.ts`, `sumAllCompteForUser`, `sumForACompte` : `COALESCE` des drapeaux (0, ou 1 pour `visible`), totaux arrondis ; fusionner les deux `SUM` pointé/non pointé en une requête `SUM(CASE …)`
- [ ] 6.2 `sumByUserByMonth`, `sumCategoriesByUserByMonth`, `yearComparison`, `topCategories`, `categoryHeatmap` : inclure les sorties non catégorisées sous `IDcat = 0` / `Non catégorisé` (jointure gauche sur `Categorie`)
- [ ] 6.3 Valider `from`/`to` par Zod (`YYYY-MM-DD`) et filtrer `DateOp >= from AND DateOp < to + 1 jour` (`assertValidRange` remplacé)
- [ ] 6.4 Front : afficher `Non catégorisé` dans `PieByCategorie`, `TopCategories`, `CategoryHeatmap` (`stores/stats.ts` : `getCategoryName` sûr pour `IDcat = 0`)
- [ ] 6.5 Tests API : compte à drapeaux NULL inclus, mensualité non catégorisée comptée, entrée non catégorisée ignorée, borne `to` inclusive, date invalide → 400

## 7. Virement atomique

- [ ] 7.1 Créer `server/api/operations/transfert.post.ts` (Zod, propriété des deux comptes et des catégories, débit puis crédit, compensation)
- [ ] 7.2 Remplacer les deux POST de `createTransfert` (`app/stores/operation.ts`) par l'appel à la nouvelle route
- [ ] 7.3 Tests API : virement valide, compte d'autrui → 404, même compte → 4xx, échec simulé du crédit sans débit résiduel

## 8. Documentation

- [ ] 8.1 Mettre à jour `docs/architecture.md` et `CLAUDE.md` (« Key Features » : rattrapage complet des récurrentes au lieu de « at most one occurrence per call », virement serveur, `Non catégorisé`)
- [ ] 8.2 Rédiger la note de version : recalage des échéances, rattrapage, nouveaux totaux de dépense
