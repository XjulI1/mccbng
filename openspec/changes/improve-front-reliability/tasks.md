## 1. Client HTTP et session

- [ ] 1.1 `app/services/http.ts` : classe `ApiError { status, body }` et helper `errorMessage(e)` ; tests unitaires
- [ ] 1.2 Intercepteur 401 (hors login) : purge de la session locale et `navigateTo('/login')` une seule fois (drapeau)
- [ ] 1.3 `app/services/auth.ts` : `/users/exists` ne supprime la session que sur 401/403
- [ ] 1.4 Remplacer les lectures `err.response…` (`editUser.vue`, `CompteForm.vue`) par `errorMessage` / `ApiError.status`
- [ ] 1.5 Stores : remplacer les `.catch(() => isLoading = false)` silencieux par un `finally` et la propagation de l'erreur

## 2. Socle des formulaires

- [ ] 2.1 Créer `app/composables/useEntityForm.ts` (`submitting`, `error`, `submit`) et ses tests
- [ ] 2.2 Créer `app/composables/useMoneySign.ts` (débit/crédit forcés, valeur vide → 0, `round2`) et ses tests
- [ ] 2.3 Créer `app/utils/date.ts` (`todayLocal`, `monthRange`, `yearRange`, `utcMonthStart`, `utcMonthEnd`) et ses tests, y compris autour de minuit
- [ ] 2.4 Créer un helper de confirmation de suppression

## 3. Migration des formulaires

- [ ] 3.1 `OperationForm.vue` : `<form @submit.prevent>`, `useEntityForm`, `useMoneySign`, confirmation de suppression, `todayLocal`, suggestion de catégorie limitée aux nouvelles opérations avec réponses périmées ignorées et timer nettoyé
- [ ] 3.2 `TransfertForm.vue` : idem ; validation des comptes (choisis, distincts), `porteFeuilleCompte.value[0]?.IDcompte`, suppression de l'effet de bord du computed ; appel à la route de virement serveur si `fix-recurring-and-credit-calculations` est livré
- [ ] 3.3 `OperationRecurrenteForm.vue` : idem ; `v-model.number` sur `Frequence`, `MoisOpRecu` indexé à partir de 0
- [ ] 3.4 `CreditForm.vue`, `BienForm.vue`, `CompteForm.vue`, `editUser.vue` : `<form>` et `useEntityForm`, suppression des `@keypress.enter` sur les conteneurs
- [ ] 3.5 Chargement par identifiant dans les formulaires d'édition (opération, récurrente, crédit, bien) ; ajouter `fetchOperationById`, `fetchRecurrenteById`, `fetchBienById` et réutiliser `fetchCreditById`
- [ ] 3.6 Remplacer les `formatAmount` dupliqués par `<Currency>` ou un helper unique

## 4. Compte actif et listes

- [ ] 4.1 `stores/operation.ts` : compteur `requestSeq` et contrôle de l'`IDcompte` demandé dans `fetchOperationsOfActiveAccount` et `loadMoreOperations`, `isLoading` relâché par la requête courante, déduplication par `IDop`, `AbortController` en complément
- [ ] 4.2 `stores/compte.ts` : `setNewBalances(IDcompte, sums)` ; repli du favori sur le premier compte visible, puis `null`
- [ ] 4.3 `AccountHeader.vue`, `OperationList.vue` : rendu sûr si `activeAccount` est `null` (état vide)
- [ ] 4.4 Pseudo-comptes : `pseudoAccountLabel` dans le store `compte`, `recurringOperations` séparé ; adapter `amortissement.vue`, `recurrOperation.vue`, `stats.vue`, `config.vue` ; recharger le favori en entrant sur `/` ; supprimer le test sur `"Coûts d'usage"` et les filtres de contournement
- [ ] 4.5 `Home/Operation.vue` : pointage optimiste avec rollback, `:checked` + `@change`, rafraîchissement des seuls soldes
- [ ] 4.6 Tests unitaires des stores : réponse périmée ignorée, « load more » après changement de compte, soldes ciblés, repli du favori

## 5. Dates et statistiques

- [ ] 5.1 Remplacer `toISOString().split('T')[0]` dans `OperationForm`, `TransfertForm`, `CreditForm`, `BienForm`, `PeriodTab`, `PeriodPicker`
- [ ] 5.2 `CategoryHeatmap.vue`, `PieByCategorie.vue` : bornes construites avec `Date.UTC`
- [ ] 5.3 Gardes contre les réponses hors d'ordre dans `stores/stats.ts`, `AnnualTab`, `ComparisonTab`, `PeriodTab` ; gardes `?.` sur `getCategoryName(...)` et `data[0]`
- [ ] 5.4 `onBeforeUnmount(() => chart?.destroy())` dans tous les graphiques Highcharts

## 6. Corrections ponctuelles

- [ ] 6.1 `pages/credits.vue` : `balance?.solde ?? credit.MontantInitial ?? 0`
- [ ] 6.2 Recherche (`Search.vue`, `services/operation.ts`) : échapper `%` et `_`, ignorer une recherche vide, ne déclencher que sur les touches qui modifient la saisie, nettoyer le timer au démontage
- [ ] 6.3 Génération des récurrentes : retourner et attendre la promesse (`services/operation.ts`, `stores/compte.ts`), puis recharger les soldes une fois la génération terminée
- [ ] 6.4 Échapper les libellés de catégorie dans les formateurs HTML de Highcharts (`CategoryHeatmap`, `PieByCategorie`)

## 7. Accessibilité

- [ ] 7.1 Éléments cliquables en `<button>` ou avec `role="button"`, `tabindex="0"` et gestion de Entrée/Espace (`CompteList/Compte.vue`, `CreditCard.vue`, `BienCard.vue`, `OperationRecurrente.vue`)
- [ ] 7.2 `alt` sur les images (`Compte.vue`) ; `<label for>` associés aux `<select>` de `TransfertForm`
- [ ] 7.3 `RouteOverTheContent.vue` : `role="dialog"`, `aria-modal`, fermeture par Échap, focus initial et retour du focus

## 8. Nettoyage

- [ ] 8.1 Supprimer le code mort : `fetchCreditPayments`, `fetchCreditDetails`/`activeCredit`, `fetchBienDetails`/`activeBien`, `clearLastEmail`, `toggleTheme`, `getSystemTheme` ; utiliser le `cleanup` de `setupSystemThemeListener`
- [ ] 8.2 `stores/stats.ts` passe par `services/stats.ts` ; retirer le paramètre ignoré `userID` de `services/user.ts`
- [ ] 8.3 Déclarer la prop `compact-mode` de `Compte.vue` ; passer `lang="ts"` sur `credits.vue`, `biens.vue`, `CreditCard`, `BienCard`, `CreditList`, `BienList`
- [ ] 8.4 Typer les fichiers modifiés (suppression des `any` des stores et formulaires touchés) ; `pnpm lint:check` sans nouveau warning
- [ ] 8.5 Décider du swipe-to-delete : l'implémenter ou retirer la mention de `CLAUDE.md`/`README.md`

## 9. Vérification

- [ ] 9.1 `pnpm test`, `pnpm type-check`, `pnpm lint:check` verts
- [ ] 9.2 Recette manuelle mobile (Safari iOS + Chrome Android) : formulaires, changement rapide de compte, expiration de session, mode hors ligne, pages à pseudo-compte
