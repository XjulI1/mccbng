## 1. Diagnostic et recalage préalables

- [x] 1.1 Écrire `scripts/diagnose-recurrentes.mjs`, en lecture seule par défaut. Il liste :
  - les récurrentes dont `JourNumOpRecu` ≠ jour de `DernierDateOpRecu`, avec la correction proposée (`JourNumOpRecu` = jour de `DernierDateOpRecu`, et `MoisOpRecu` = son mois en annuel) ;
  - les récurrentes dont `Frequence` ∉ {3, 7} ou dont `MoisOpRecu` est hors 0-11 ;
  - les récurrentes liées à un crédit terminé ou inexistant ;
  - les doublons d'opérations générées (même compte, nom, montant et date).
- [x] 1.2 Ajouter le mode `--apply --ids=1,2,3` : il applique la correction proposée aux seules récurrentes listées et journalise chaque modification (avant/après). Il charge `.env` via `scripts/load-env.mjs`.
- [x] 1.3 Exécuter le diagnostic en production, revoir la liste avec l'utilisateur, appliquer `--apply` sur les récurrentes retenues et corriger à la main les récurrentes déjà dérivées (31 → 3)

## 2. Échéancier

- [x] 2.1 Créer `server/utils/schedule.ts` avec `nextDueDate(rec, after)`, `prevDueDate(rec, due)` et `firstDueOnOrAfter(rec, date)` (UTC, jour borné au dernier jour du mois, mois ou année suivants/précédents), plus un helper `initialLastDate(rec, debut)` = `prevDueDate(rec, firstDueOnOrAfter(rec, max(today, debut)))`
- [x] 2.2 Tests unitaires :
  - 31 janvier → 28/29 février → 31 mars ;
  - 29 février annuel ;
  - `JourNumOpRecu` 25 après une date décalée au 3 ;
  - décembre → janvier ;
  - annuel avec `MoisOpRecu` 0 et 11 ;
  - `nextDueDate(prevDueDate(d)) = d` (dont 31 mars → 28 février → 31 mars) ;
  - `initialLastDate` : jour 25 créé le 5 → 25 du mois précédent ; jour 3 créé le 5 → 3 du mois courant ; crédit futur ; crédit passé
- [x] 2.3 Créer `server/utils/money.ts` (`round2` avec `Number.EPSILON`) et l'utiliser dans `remaining-balance` et les agrégats ; test 1,005 → 1,01

## 3. Auto-génération

- [x] 3.1 Réécrire `server/api/operation-recurrentes/auto-generation.post.ts` : jointure gauche sur `Credit`, boucle d'échéances dues (anticipation de 15 j en mensuel, 30 j en annuel), plafond de 24 par récurrente
- [x] 3.2 Réserver chaque échéance par `UPDATE … WHERE IDopRecu = ? AND DernierDateOpRecu = ?`, avec `:last` repris tel qu'il a été lu. Insérer seulement si `affectedRows = 1`. En cas d'échec d'insertion, compenser par `UPDATE … SET DernierDateOpRecu = :last WHERE IDopRecu = ? AND DernierDateOpRecu = :next`
- [x] 3.3 Ignorer les récurrentes dont le crédit est inexistant, non `actif`, ou dont l'échéance dépasse `DateFin` ; journaliser les orphelines
- [x] 3.4 Tests API :
  - échéance au jour choisi et fin de mois ;
  - rattrapage de 3 mois en un appel ;
  - deux appels concurrents (`Promise.all`) sans doublon ;
  - `DernierDateOpRecu` historique avec une heure ;
  - crédit terminé ;
  - plafond de 24

## 4. Récurrentes : validation, initialisation, lecture seule

- [x] 4.1 `server/utils/resources.ts` : défaut `MoisOpRecu: 0` ; Zod `Frequence` ∈ {3, 7}, `JourNumOpRecu` int 1-31, `MoisOpRecu` int 0-11 ; `DernierDateOpRecu` optionnel et ignoré à la création (fixé par `initialLastDate(rec, today)`) ; `IDcredit` retiré des champs acceptés dans le corps
- [x] 4.2 `server/utils/crud.ts` / `operationRecurrenteResource` : `PUT`, `PATCH /{id}` et `DELETE /{id}` sur une récurrente dont `IDcredit` n'est pas `NULL` répondent 409 (`Recurring operation <id> is managed by credit <IDcredit>`) ; le `PATCH` en masse filtre `IDcredit IS NULL`
- [x] 4.3 Front `OperationRecurrenteForm.vue` : défaut `MoisOpRecu: 0`, ne plus envoyer `DernierDateOpRecu` à la création ; pour une récurrente avec `IDcredit`, désactiver Modifier et Supprimer et afficher un lien vers le crédit
- [x] 4.4 Tests API :
  - bornes et défaut `MoisOpRecu` ;
  - `DernierDateOpRecu` reçu ignoré (jour 25 créé le 5 → première échéance le 25) ;
  - `IDcredit` refusé dans le corps ;
  - 409 en `PATCH`/`PUT`/`DELETE` sur une récurrente de crédit ;
  - `PATCH` en masse sans effet sur elle

## 5. Crédits

- [x] 5.1 `onCreate` : initialiser `DernierDateOpRecu` par `initialLastDate(rec, DateDebut)`, supprimer la récurrente dans un `catch` en cas d'échec
- [x] 5.2 `onDelete` : supprimer la récurrente avant le crédit
- [x] 5.3 Ajouter un hook `onUpdate` au CRUD générique (`server/utils/crud.ts`) et l'implémenter pour `creditResource` :
  - propager montant, compte, catégorie, nom et jour de `DateDebut` vers la récurrente ;
  - si `DateDebut` change et que l'ancienne `DernierDateOpRecu` < ancienne `DateDebut`, recalculer `DernierDateOpRecu` par `initialLastDate(rec, nouvelle DateDebut)` ;
  - refuser le `PATCH` en masse des crédits
- [x] 5.4 Réécrire `server/api/credits/[id]/remaining-balance.get.ts` : sorties seulement, `DateOp ≤ aujourd'hui`, intérêts par mois civil écoulé (`cursor` initial = mois du premier paiement − 1, `n = mois(DateOp) − cursor`, puis `cursor = mois(DateOp)`), `round2`
- [x] 5.5 Tests API :
  - crédit futur, dont la première mensualité est celle de `DateDebut` ;
  - crédit créé dans le passé sans rattrapage ;
  - échec partiel sans orphelin ;
  - propagation du montant et du compte ;
  - report de `DateDebut` d'un crédit non commencé, puis changement de jour d'un crédit en cours ;
  - déblocage positif ignoré ;
  - deux paiements dans le même mois ;
  - prélèvement avancé d'un jour (9 février / 10 mars → 2 mois d'intérêts) ;
  - échéance future ignorée

## 6. Statistiques et agrégats

- [x] 6.1 `server/utils/stats.ts`, `sumAllCompteForUser`, `sumForACompte` :
  - `COALESCE` des drapeaux (0, ou 1 pour `visible`) et totaux arrondis ;
  - fusionner les deux `SUM` pointé/non pointé en une requête `SUM(CASE …)` ;
  - `dispo` = `retraite = 0 AND children = 0 AND bloque = 0` ;
  - vérifier que `Compte.solde` (lue par `soldeGlobal`, `soldeRetraite` et `soldeDispo`) est à jour, sinon calculer ces soldes depuis `Operation`
- [x] 6.2 `sumByUserByMonth`, `sumCategoriesByUserByMonth`, `yearComparison`, `topCategories`, `categoryHeatmap`, `incomeVsExpense`, `topOperations` : une seule règle de dépense (`EXPENSE_JOIN` / `EXPENSE_WHERE` : `Type` de la catégorie, entrées comme sorties, catégorie « Aucune » `IDcat = 0` comprise)
- [x] 6.3 Valider `from`/`to` par Zod (`YYYY-MM-DD`) et filtrer `DateOp >= from AND DateOp < to + 1 jour` (`assertValidRange` remplacé)
- [x] 6.4 Front : `stores/stats.ts`, `getCategoryName` lu sans plantage si la catégorie est absente de la liste
- [x] 6.5 Tests API :
  - compte à drapeaux NULL inclus ;
  - compte retraite ou enfant non bloqué exclu de `dispo` ;
  - `soldeGlobal` cohérent avec `sumAllCompteForUser` restreint ;
  - catégorie « Aucune » (`IDcat = 0`) comptée, entrées comprises, avec le même total dans tous les graphiques ;
  - échéance future comptée dans `TotalNotChecked` ;
  - borne `to` inclusive ;
  - date invalide → 400

## 7. Virement atomique

- [x] 7.1 Créer `server/api/operations/transfert.post.ts` : Zod (`IDcat` obligatoire), propriété des deux comptes, accès à la catégorie (de l'utilisateur ou partagée), débit puis crédit, compensation
- [x] 7.2 Remplacer les deux POST de `createTransfert` (`app/stores/operation.ts`) par l'appel à la nouvelle route, en passant l'`IDcat` de `TransfertForm.vue`
- [x] 7.3 Tests API :
  - virement valide ;
  - `IDcat` manquant → 400 ;
  - compte d'autrui → 404 ;
  - même compte → 4xx ;
  - échec simulé du crédit sans débit résiduel

## 8. Documentation

- [x] 8.1 Mettre à jour `docs/architecture.md` et `CLAUDE.md` (« Key Features » : rattrapage complet des récurrentes au lieu de « at most one occurrence per call », récurrente de crédit en lecture seule, virement serveur, règle de dépense commune, définition de `dispo`, opérations futures comptées dans les soldes)
- [x] 8.2 Documenter `scripts/diagnose-recurrentes.mjs` (lecture seule et `--apply`) dans `docs/exploitation.md`
- [x] 8.3 Rédiger la note de version : recalage des échéances, rattrapage, nouveaux totaux de dépense (mensualités comprises), nouvelle définition de `dispo`, mensualités modifiables seulement depuis le crédit
