## Context

Change rédigé en même temps que la livraison (`38b0aec`). Il consigne les choix faits pendant l'implémentation de `AccountHeader.vue`.

## Decisions

### D1. Hauteur inchangée
L'en-tête garde `$header-height` (70 px) : les marges des pages (`$header-height-and-margin`) et des overlays en dépendent. Les deux lignes tiennent dans cette hauteur, la jauge de plafond reste dans le padding du bas.

### D2. Solde pointé libellé, pas d'écart affiché
La seconde ligne montre le solde total et le solde pointé, celui qui se compare au relevé bancaire. L'écart « à pointer » n'est pas affiché : il ajoutait un troisième montant difficile à placer sur mobile. Quand les deux soldes sont égaux au centime près, « Tout pointé » remplace le montant.

### D3. « … » avant les soldes
Le solde est considéré comme chargé quand `soldeNotChecked` est un nombre. Avant, l'en-tête affiche « … » plutôt que « 0,00 € », qui pouvait faire croire à un compte vide.

### D4. Mise en page par point de rupture
- Mobile : bandeau entre deux marges de 8 px (`left`/`right`), largeur indépendante du nom du compte, nom tronqué en premier (`min-width: 0`, montants en `white-space: nowrap`).
- Desktop : centré sur le panneau des opérations, `left: calc($left-panel-width + (100% - $left-panel-width) / 2)`, largeur de 300 à 460 px.
- `top: max(10px, env(safe-area-inset-top))` : l'application déclare `viewport-fit=cover`.

### D5. Couleurs du thème
Texte, solde négatif (`--color-danger-dark`), plafond atteint (`--color-warning-dark`, `--warning-gradient`) et « Tout pointé » (`--color-success-dark`) viennent des tokens, valables en thème sombre. Le dégradé vert de la jauge reste codé en dur ; `improve-front-theme-consistency` le remplacera.
