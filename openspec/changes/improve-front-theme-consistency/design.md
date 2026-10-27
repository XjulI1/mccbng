## Context

`app/assets/styles/theme.css` définit déjà des tokens (couleurs de base, fonds, bordures, rayons, espacements, ombres) et leur variante sombre, appliquée par `useTheme` (clair / sombre / système). Mais une large part des composants n'utilise pas ces tokens. `theme.css` contient aussi un jeu de tokens hérité de Bootstrap (`--btn-*`, `--badge-*`, `--alert-*`), et `main.css` des utilitaires Bootstrap (`.col-*`, `.m-*`, `.p-*`, `.d-*`, `.text-*`, `.form-control`…). Un premier inventaire ne trouve aucune classe `col-`, `m-`, `p-`, `d-flex` ou `form-control` dans les templates ; `.btn-primary` (7 usages) et `badge` (3) restent utilisés.

Font Awesome est chargé par `app/plugins/fontawesome.ts` avec une liste explicite d'icônes.

## Goals / Non-Goals

**Goals :**
- Toute couleur d'interface passe par un token défini pour les deux thèmes.
- Contraste WCAG AA garanti par construction (les tokens sont vérifiés, les composants n'inventent plus de couleurs).
- Une seule police, une seule couleur primaire, un seul jeu d'icônes.

**Non-Goals :**
- Refonte de la mise en page ou des parcours.
- Nouvelle identité (logo, couleur primaire autre que le violet existant).
- Couleur de catégorie stockée en base.

## Decisions

### D1. Typographie
`body` utilise la pile système de `main.css` (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, …`) ; la déclaration `Avenir, Helvetica` et la couleur `#2c3e50` de `app.vue` sont supprimées (`color: var(--text-primary)`). `Currency.vue` porte `font-variant-numeric: tabular-nums` : tous les montants s'alignent sans changer chaque composant. Taille minimale de texte : 11 px (libellés de navigation compris).

### D2. Palette
Couleur primaire : violet. `--color-primary: #667eea` reste pour les surfaces et icônes (contraste graphique 3:1) ; le texte et les fonds de boutons avec texte blanc utilisent `--color-primary-strong` (`#5a67d8` ou plus foncé selon la vérification, 4,5:1). Le bleu `#007bff` (bouton primaire, action « Nouvelle opération » du FAB) est remplacé par la primaire. Les dégradés restent autorisés pour les grandes surfaces (en-tête de patrimoine, FAB), toujours construits à partir de tokens.

### D3. Tokens sémantiques ajoutés
| Token | Usage | Clair (indicatif) | Sombre (indicatif) |
|---|---|---|---|
| `--color-amount-in` | montant entrant | `#15803d` | `#4ade80` |
| `--color-amount-out` | montant sortant | `#b91c1c` | `#f87171` |
| `--color-on-primary` | texte sur fond primaire | `#ffffff` | `#ffffff` |
| `--nav-search`, `--nav-gestion`, `--nav-stats`, `--nav-settings`, `--nav-accounts` | onglets de la barre de navigation | variantes AA | variantes AA |
| `--action-operation`, `--action-transfert`, `--action-compte`, `--action-recurrente`, `--action-credit`, `--action-bien` | actions du FAB et icônes des cartes Gestion | | |
| `--compte-bloque`, `--compte-joint`, `--compte-enfant`, `--compte-retraite`, `--compte-portefeuille` | badges de type de compte | | |
| `--cat-1` à `--cat-8`, `--cat-none` | pastilles de catégorie | | |
| `--chart-1` à `--chart-8` | séries Highcharts (lus via `getComputedStyle` au rendu) | | |

Les valeurs définitives sont fixées par le script de contraste (D6). Les tokens « par entité » (actions, comptes) sont partagés : une même couleur désigne un crédit dans le FAB, la carte Gestion et la liste des crédits.

### D4. Remplacement des couleurs codées en dur
Fichier par fichier, chaque couleur littérale (hexadécimale, `rgb()`, `rgba()`) est remplacée par le token sémantique correspondant ; les transparences passent par `color-mix(in srgb, var(--token) 12%, transparent)` (déjà utilisé par `NavBar`). Exceptions tolérées : `theme.css` (définition des tokens) et les ombres déjà tokenisées. Une vérification automatique (`scripts/check-colors.mjs`, lancée par `pnpm lint:check`) échoue si une couleur littérale apparaît hors de `theme.css`.

### D5. Icônes
Correspondance emoji → icône Font Awesome (ajoutée à `plugins/fontawesome.ts` si absente) :
- 🔒 `lock`, 🤝 `handshake`, 👶 `child`, 🏦 `piggy-bank`, 💰 `money-bill`, 💳 `credit-card`, 👁 `eye`, 🚫 `eye-slash` ;
- ✓ `check`, ✕ `times`, 🗑 `trash`, ✏️ `pen`, 📅 `calendar`, 📊 `chart-bar`, 🏷️ `tag` ;
- 📌 dans le libellé d'`<optgroup>` (« 📌 Suggestions ») : l'emoji est retiré, un `<optgroup>` ne peut pas contenir d'icône ;
- `content: "✓"` des cases à cocher personnalisées (`OperationForm`) : remplacé par un `mask` SVG ou une bordure dessinée en CSS.

Une icône accompagnée d'un texte porte `aria-hidden="true"` ; une icône seule porte un libellé accessible sur son bouton.

### D6. Vérification des contrastes
`scripts/check-contrast.mjs` lit `theme.css`, résout les paires (texte / fond) déclarées dans le script pour le thème clair et le thème sombre, et échoue sous 4,5:1 pour le texte et 3:1 pour les éléments graphiques. Il est lancé par `pnpm test` (test unitaire qui importe la fonction).

### D7. Échelles
Rayons : `--radius-sm` (4), `--radius-md` (8), `--radius-lg` (12), `--radius-xl` (16), `--radius-pill` (999) ; ombres : `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-glass`. Les valeurs isolées (14, 22, 28 px…) sont ramenées au token le plus proche.

### D8. Dock
- `NavBar` et FAB : `background: var(--bg-dock)` (opacité portée à 85 %) sous le flou ;
- libellés à 11 px, couleur d'onglet issue des tokens `--nav-*` ;
- FAB : rendu seulement si des actions existent dans le contexte (`v-if`), au lieu d'être désactivé ;
- `bottom: calc(15px + env(safe-area-inset-bottom))` et marge basse des pages ajustée.

### D9. Nettoyage
Après un `grep` de chaque classe et token dans `app/` : suppression des utilitaires de `main.css` sans usage et des tokens `--btn-*`, `--badge-*`, `--alert-*` sans usage. Les classes encore utilisées (`.btn`, `.btn-primary`, `.btn-danger`…) sont réécrites sur les nouveaux tokens.

## Risks / Trade-offs

- [Volume de fichiers touchés et conflits avec `improve-front-forms`] → Livrer après `improve-front-forms` ; découper en lots par zone (socle, dock, Gestion, formulaires, statistiques), un commit par lot.
- [Régression visuelle silencieuse] → Recette clair / sombre par écran, avec captures avant / après de chaque écran.
- [Couleurs des graphiques lues au rendu] → Les graphiques sont recréés au changement de thème (écoute de `useTheme`).
- [Contrôle des couleurs trop strict] → Commentaire d'exemption ponctuel (`/* color-literal-ok */`) pour un cas justifié, revu en relecture.
