## Why

L'audit du 2026-10-05 relève dans la SPA des défauts de moindre gravité, mais visibles au quotidien :
- les préréglages de période des statistiques sont calculés en UTC (`toISOString()`) : autour de minuit ou du 1er du mois, la plage envoyée est décalée d'un jour ;
- les statistiques affichent parfois la réponse d'une ancienne sélection (réponses hors d'ordre) ;
- les graphiques Highcharts ne sont jamais détruits, et leurs libellés de catégorie sont injectés en HTML sans échappement ;
- le total des crédits remplace un solde nul par le montant initial (`||` au lieu de `??`) ;
- la recherche se déclenche sur n'importe quelle touche, y compris vide, et son timer survit au démontage ;
- l'accessibilité de base manque : éléments cliquables non focusables, images sans `alt`, overlay sans rôle de dialogue ni fermeture par Échap ;
- du code mort et des fichiers non typés subsistent ; la documentation annonce un swipe-to-delete qui n'existe pas.

C'est le troisième des trois changes issus du découpage d'`improve-front-reliability`. Il est indépendant des deux autres, sauf pour le typage des stores, à faire après `improve-front-session-and-state`.

## What Changes

- **Statistiques** :
  - préréglages de période (`PeriodTab`, `PeriodPicker`) en dates locales (`app/utils/dates.ts`) ;
  - réponses hors d'ordre ignorées (`stores/stats.ts`, `AnnualTab`, `ComparisonTab`, `PeriodTab`), gardes `?.` sur `getCategoryName(...)` et `data[0]` ;
  - `chart.destroy()` au démontage de chaque graphique ;
  - libellés de catégorie échappés dans les formateurs HTML (`CategoryHeatmap`, `PieByCategorie`).
- **Crédits** : `balance?.solde ?? credit.MontantInitial ?? 0`.
- **Recherche** : recherche vide ignorée, déclenchement sur les seules modifications de la saisie (`@input`), timer nettoyé au démontage.
- **Accessibilité** : éléments cliquables en `<button>` ou avec `role="button"` et clavier, `alt` sur les images, `<label for>` sur les `<select>` du virement, `RouteOverTheContent` en `role="dialog"` avec `aria-modal`, Échap, gestion du focus et bouton de fermeture visible (indispensable sur mobile, sans touche Échap).
- **Nettoyage** : code mort supprimé, appels HTTP des stats regroupés dans `services/stats.ts`, `lang="ts"` et typage des fichiers touchés, mention du swipe-to-delete retirée de `CLAUDE.md` et `README.md`.

## Capabilities

### New Capabilities
- `front-stats` : fiabilité des écrans de statistiques (périodes en dates locales, réponses hors d'ordre ignorées, graphiques détruits au démontage, libellés échappés).

### Modified Capabilities
- `front-routing` : l'overlay des formulaires est un dialogue accessible (rôle, fermeture par Échap ou par un bouton visible, focus).

## Impact

- **Code** :
  - `app/components/Stats/*`, `app/stores/stats.ts`, `app/services/stats.ts` ;
  - `app/pages/{credits,biens}.vue`, `Search.vue`, `RouteOverTheContent.vue`, `TransfertForm.vue` (labels) ;
  - `CompteList/Compte.vue`, `CreditCard.vue`, `BienCard.vue`, `OperationRecurrente.vue`, `CreditList`, `BienList` ;
  - `app/services/{auth,user}.ts`, `app/stores/{credit,bien}.ts`, gestion du thème (code mort) ;
  - `CLAUDE.md`, `README.md`.
- **API** : aucun changement.
- **Tests** : tests unitaires des préréglages de période (autour de minuit et du 1er janvier) et des gardes hors d'ordre.
