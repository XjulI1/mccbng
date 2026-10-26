## 1. Statistiques

- [ ] 1.1 `toLocalDay` dans `app/utils/dates.ts` ; `PeriodTab`, `PeriodPicker` l'utilisent ; tests unitaires (0 h 30 le 1er janvier, préréglage « Année »)
- [ ] 1.2 Gardes contre les réponses hors d'ordre dans `stores/stats.ts`, `AnnualTab`, `ComparisonTab`, `PeriodTab` ; gardes `?.` sur `getCategoryName(...)` et `data[0]` ; tests unitaires du store
- [ ] 1.3 Instance conservée et `destroy()` avant recréation et dans `onBeforeUnmount`, pour tous les graphiques Highcharts
- [ ] 1.4 `escapeHtml` (`app/utils/html.ts`) dans les formateurs HTML de `CategoryHeatmap` et `PieByCategorie` ; tests unitaires

## 2. Corrections ponctuelles

- [ ] 2.1 `pages/credits.vue` : `balance?.solde ?? credit.MontantInitial ?? 0` (et `?? 0` sur le total initial)
- [ ] 2.2 `Search.vue` : `@input`, terme vide ignoré, timer nettoyé au démontage

## 3. Accessibilité

- [ ] 3.1 Éléments cliquables en `<button>` ou avec `role="button"`, `tabindex="0"` et Entrée/Espace (`CompteList/Compte.vue`, `CreditCard.vue`, `BienCard.vue`, `OperationRecurrente.vue`)
- [ ] 3.2 `alt` sur les images (`Compte.vue`) ; `<label for>` associés aux `<select>` de `TransfertForm`
- [ ] 3.3 `RouteOverTheContent.vue` : `role="dialog"`, `aria-modal`, `aria-labelledby`, fermeture par Échap, focus initial et retour du focus

## 4. Nettoyage

- [ ] 4.1 Supprimer le code mort (`fetchCreditPayments`, `fetchCreditDetails`/`activeCredit`, `fetchBienDetails`/`activeBien`, `clearLastEmail`, `toggleTheme`, `getSystemTheme`) ; appeler le `cleanup` de `setupSystemThemeListener`
- [ ] 4.2 `stores/stats.ts` passe par `services/stats.ts` ; retirer le paramètre ignoré `userID` de `services/user.ts`
- [ ] 4.3 Déclarer la prop `compact-mode` de `Compte.vue` ; `lang="ts"` sur `credits.vue`, `biens.vue`, `CreditCard`, `BienCard`, `CreditList`, `BienList`
- [ ] 4.4 Typer les fichiers modifiés (suppression des `any` des stores et composants touchés)
- [ ] 4.5 Retirer la mention du swipe-to-delete de `CLAUDE.md` et `README.md`

## 5. Vérification

- [ ] 5.1 `pnpm test`, `pnpm type-check`, `pnpm lint:check` verts (aucun nouveau warning)
- [ ] 5.2 Recette manuelle : préréglages de période autour de minuit, changement rapide d'année dans les stats, navigation au clavier (listes, overlay, Échap), lecteur d'écran sur l'overlay
