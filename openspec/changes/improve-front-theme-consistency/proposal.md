## Why

La revue UX/UI du 2026-10-27 relève que le front n'a pas d'identité visuelle cohérente, et que certains textes sont peu lisibles :
- **deux polices** : `Avenir, Helvetica` dans `app.vue`, pile système dans `main.css` ; la couleur du texte de `body` est codée en dur (`#2c3e50`) et ignore le thème sombre ;
- **deux palettes en concurrence** : violet (`--color-primary: #667eea`, dégradés) et bleu Bootstrap (`--btn-primary-bg: #007bff`, bouton « Nouvelle opération » du FAB) ;
- **couleurs codées en dur** : environ 220 couleurs hexadécimales et 80 `rgba()` dans les composants et pages (`CompteForm` 32, `CreditCard` 27, `CreditForm` 23, `gestion.vue` 20…), qui échappent au thème sombre ;
- **contraste insuffisant** : montants en `#4ade80` / `#f87171` sur fond blanc (environ 2:1, sous le seuil WCAG AA de 4,5:1) ; libellés de 10 px de la barre de navigation sur un fond transparent flouté ;
- **emojis mélangés aux icônes Font Awesome** (🔒🤝👶🏦💰💳🗑✓✏️📌📅📊), dont le rendu change selon le système ;
- **héritage Bootstrap inutilisé** : utilitaires de `main.css` (`.col-*`, `.m-*`, `.p-*`, `.d-*`…) et tokens `--btn-*`, `--badge-*`, `--alert-*` sans usage ou presque ;
- **échelles disparates** : rayons de 4 à 28 px et ombres définis au cas par cas ;
- **dock** : barre de navigation et FAB sur fond transparent, FAB grisé mais visible quand il n'a pas d'action, pas de marge pour la barre d'accueil de l'iPhone.

## What Changes

- **Typographie** : une seule pile de polices (système), couleur de texte issue du thème, chiffres tabulaires pour tous les montants (`<Currency>`).
- **Palette unique** : violet comme couleur primaire, avec une variante foncée pour le texte et les boutons (contraste AA) ; le bleu Bootstrap disparaît.
- **Tokens** : nouveaux tokens sémantiques (`--color-amount-in`, `--color-amount-out`, `--color-on-primary`, couleurs des onglets de navigation, des actions du FAB, des types de compte et palette de catégories), définis pour le thème clair et le thème sombre ; toutes les couleurs codées en dur des composants et pages sont remplacées par des tokens (hors couleurs de séries des graphiques Highcharts, traitées par un jeu de tokens dédié).
- **Contraste** : texte et montants à 4,5:1 minimum, éléments graphiques et bordures de champs à 3:1, dans les deux thèmes.
- **Icônes** : tous les emojis d'interface remplacés par des icônes Font Awesome (déjà chargé), avec `aria-hidden` lorsqu'un texte les accompagne.
- **Échelles** : rayons (`--radius-sm/md/lg/xl/pill`) et ombres (`--shadow-sm/md/lg/glass`) existants utilisés partout ; valeurs isolées supprimées.
- **Nettoyage** : utilitaires Bootstrap et tokens `--btn-*`, `--badge-*`, `--alert-*` inutilisés supprimés de `main.css` et `theme.css`, après vérification d'usage.
- **Dock** : fond `--bg-dock` opaque à 85 % sous le flou, libellés de navigation à 11 px minimum, FAB masqué (et non grisé) sans action, marge `env(safe-area-inset-bottom)`.

## Capabilities

### New Capabilities
- `front-theme` : règles visuelles communes du front (police, palette, tokens de couleur, contraste, icônes, échelles, dock).

### Modified Capabilities
_Aucune._

## Impact

- **Code** :
  - `app/assets/styles/theme.css`, `app/assets/styles/main.css`, `app/app.vue` ;
  - `app/components/Currency.vue`, `NavBar.vue`, `FabMenu.vue` ;
  - tous les composants et pages contenant des couleurs codées en dur ou des emojis : formulaires (`CompteForm`, `CreditForm`, `BienForm`, `OperationForm`, `OperationRecurrenteForm`, `TransfertForm`), cartes et listes (`CreditCard`, `BienCard`, `CreditList`, `BienList`, `OperationRecurrente`, `OperationRecurrenteList`, `Amortissement/Operation`), `CompteList/index.vue` (titres de section, uniquement leurs emojis), pages `gestion`, `comptesGestion`, `credits`, `biens`, `config`, `editUser`, composants de statistiques (couleurs des séries).
- **API** : aucun changement.
- **Recoupements** :
  - `improve-front-forms` modifie les mêmes formulaires (structure `<form>`) : livrer ce change **après** lui, ou ne toucher qu'aux blocs `<style>` et aux emojis pour limiter les conflits ;
  - `improve-front-operation-list` utilise `--color-amount-in` / `--color-amount-out` et la palette de catégories définis ici.
- **Tests** : script de vérification des contrastes des tokens (clair et sombre) ; règle de lint (stylelint ou script `grep` en CI) interdisant les couleurs hexadécimales hors de `theme.css`.
- **Hors périmètre** : refonte de la mise en page des écrans, changement de couleur primaire au-delà de la palette existante, liste des comptes (seuls ses emojis changent).
