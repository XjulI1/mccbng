## Context

`PeriodTab.vue` et `PeriodPicker.vue` calculent leurs préréglages avec `d.toISOString().slice(0, 10)`, donc en UTC. Les bornes des filtres de graphiques sont déjà en ISO UTC strict (`app/utils/dates.ts`, `optimize-api-queries`). Les graphiques Highcharts sont créés par `Highcharts.chart(...)` sans être détruits ; leurs formateurs `tooltip`/`dataLabels` en HTML insèrent le libellé de catégorie tel quel. `Search.vue` écoute `@keyup`.

Constats de l'audit traités ici : F-M8 (préréglages), F-M9 (déjà corrigé pour les filtres par `optimize-api-queries`), F-M14, et les constats F-B* (Highcharts, timers, accessibilité, code mort, `any`). L'échappement de `%` et `_` dans la recherche est livré (`optimize-api-queries`).

## Goals / Non-Goals

**Goals :**
- Des statistiques qui affichent toujours la période et la sélection demandées.
- Une navigation au clavier et au lecteur d'écran possible sur les éléments principaux.
- Moins de code mort et de fichiers non typés.

**Non-Goals :**
- Une mise en conformité RGAA complète.
- Le passage global à `noImplicitAny: true` ; seuls les fichiers modifiés sont typés.
- Le swipe-to-delete (retiré de la documentation, non implémenté).

## Decisions

### D1. Préréglages en dates locales
`app/utils/dates.ts` gagne `toLocalDay(date)` (`YYYY-MM-DD` construit avec `getFullYear`/`getMonth`/`getDate`). `PeriodTab` et `PeriodPicker` l'utilisent à la place de `toISOString()`. Les chaînes `YYYY-MM-DD` envoyées à l'API ne changent pas de format ; le serveur les interprète comme des jours (`parseRange`).

### D2. Réponses hors d'ordre
Chaque action ou composant qui charge des statistiques garde un compteur de requête ; une réponse dont le numéro n'est pas le dernier est ignorée. Les accès `getCategoryName(...)` et `data[0]` sont protégés par `?.`.

### D3. Graphiques
Chaque composant conserve l'instance renvoyée par `Highcharts.chart(...)`, la détruit avant d'en recréer une et dans `onBeforeUnmount`. Les formateurs HTML passent le libellé par un `escapeHtml` unique (`app/utils/html.ts`).

### D4. Recherche
`Search.vue` écoute `@input` au lieu de `@keyup`, ignore un terme vide (après `trim`) et nettoie son timer dans `onBeforeUnmount`.

### D5. Overlay accessible
`RouteOverTheContent.vue` porte `role="dialog"`, `aria-modal="true"` et `aria-labelledby` (titre de la page). À l'ouverture, le focus va au premier champ ; Échap ferme l'overlay (retour à la route parente) ; à la fermeture, le focus revient à l'élément qui l'a ouvert.

Un bouton de fermeture visible (`<button type="button" aria-label="Fermer">`, icône `times`) est placé en haut à droite du contenu de l'overlay, avec une zone tactile d'au moins 44 × 44 px : sur mobile, il n'y a ni touche Échap ni fond visible quand le formulaire est long. Il est rendu par `RouteOverTheContent` (pas par chaque formulaire) et réutilise la même fonction de fermeture que le clic sur le fond et Échap (retour à la route parente).

### D6. Éléments cliquables
Les cartes et lignes cliquables (`CompteList/Compte.vue`, `CreditCard.vue`, `BienCard.vue`, `OperationRecurrente.vue`) deviennent des `<button>` lorsque leur contenu le permet, sinon reçoivent `role="button"`, `tabindex="0"` et la gestion d'Entrée et d'Espace.

### D7. Nettoyage
- Code mort supprimé : `fetchCreditPayments`, `fetchCreditDetails`/`activeCredit`, `fetchBienDetails`/`activeBien`, `clearLastEmail`, `toggleTheme`, `getSystemTheme` ; le `cleanup` de `setupSystemThemeListener` est appelé. `fetchCreditById` et `fetchBienById` restent (utilisés par `improve-front-forms`).
- `stores/stats.ts` passe par `services/stats.ts` ; le paramètre ignoré `userID` de `services/user.ts` est retiré.
- La prop `compact-mode` de `Compte.vue` est déclarée ; `lang="ts"` sur `credits.vue`, `biens.vue`, `CreditCard`, `BienCard`, `CreditList`, `BienList`.

## Risks / Trade-offs

- [Cartes transformées en `<button>` : styles par défaut du navigateur] → Réinitialisation CSS du bouton (`all: unset` puis styles existants) ; vérification visuelle de chaque liste.
- [Échap sur un formulaire en cours de saisie] → Même comportement que le bouton de fermeture existant ; le brouillon d'`improve-front-forms` ne couvre que l'expiration de session.

## Migration Plan

Déploiement simple de l'image. Rollback par retour à l'image précédente.

## Open Questions

_Aucune._
