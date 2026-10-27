## Why

L'en-tête du compte ouvert affichait `1 234,56 € - [1 100,00 €]` : rien n'indiquait que le montant entre crochets était le solde pointé, et les deux montants avaient le même poids visuel. Avant l'arrivée des soldes, il affichait un faux « 0,00 € ». Sur mobile, le cartouche centré avait une largeur variable selon le nom du compte. Sur desktop, il était décalé (`left: 75%; transform: translateX(-75%)`) au lieu d'être centré sur le panneau des opérations.

Change rédigé en même temps que la livraison, à la suite de la revue UX/UI du 2026-10-27.

## What Changes

- **Hiérarchie** : nom du compte sur la première ligne (pourcentage du plafond aligné à droite), solde total en grand sur la seconde, solde pointé à droite avec le libellé « Pointé ». Quand tout est pointé, « ✓ Tout pointé » remplace le montant.
- **États** : « … » tant que les soldes ne sont pas chargés ; solde total en rouge quand il est négatif ; pourcentage et jauge en orange quand le plafond est atteint ou dépassé.
- **Mobile** : bandeau sur toute la largeur (marges de 8 px), nom tronqué avec des points de suspension, police réduite sous 360 px, position sous l'encoche de l'iPhone (`env(safe-area-inset-top)`).
- **Desktop** : cartouche centré sur le panneau de droite (300 à 460 px de large).
- **Pages sans compte réel** (`disabledTotalHeader`) : seul le titre, centré.
- **Lisibilité** : chiffres tabulaires, couleurs issues des tokens du thème (clair et sombre).

## Capabilities

### New Capabilities
_Aucune._

### Modified Capabilities
- `front-comptes` : présentation de l'en-tête du compte ouvert (soldes libellés, états, mise en page mobile et desktop).

## Impact

- **Code** : `app/components/AccountHeader.vue` uniquement. La hauteur de l'en-tête (`$header-height`) ne change pas, donc la mise en page des pages et des overlays non plus.
- **API** : aucun changement.
- **Recoupement** : `improve-front-session-and-state` (tâche 2.4) rend l'en-tête sûr quand `activeAccount` est `null`. Cette modification s'applique sur la nouvelle structure sans conflit de fond.
