## 1. Socle

- [ ] 1.1 `theme.css` : tokens sémantiques (montants, `--color-primary-strong`, `--color-on-primary`, navigation, actions, types de compte, catégories, graphiques) en clair et en sombre ; échelles de rayons et d'ombres complétées
- [ ] 1.2 `scripts/check-contrast.mjs` et son test unitaire (texte 4,5:1, graphique 3:1, deux thèmes) ; ajuster les valeurs jusqu'au vert
- [ ] 1.3 `scripts/check-colors.mjs` (couleurs littérales interdites hors `theme.css`, exemption commentée) branché sur `pnpm lint:check`, en mode avertissement jusqu'à la fin du lot 4
- [ ] 1.4 Typographie : suppression de la police et de la couleur de `app.vue`, `tabular-nums` dans `Currency.vue`, taille minimale de 11 px

## 2. Dock

- [ ] 2.1 `NavBar.vue` : fond `--bg-dock`, couleurs `--nav-*`, libellés à 11 px
- [ ] 2.2 `FabMenu.vue` : actions sur les tokens `--action-*` (fin du bleu Bootstrap), FAB masqué sans action
- [ ] 2.3 `app.vue` : `env(safe-area-inset-bottom)` sur le dock et marge basse des pages

## 3. Icônes

- [ ] 3.1 Icônes manquantes ajoutées à `plugins/fontawesome.ts` (`lock`, `piggy-bank`, `eye`, `eye-slash`, `trash`, `pen`, `calendar`, `chart-bar`, `tag`…)
- [ ] 3.2 Emojis remplacés : `CompteForm`, `comptesGestion`, `CompteList/index` (titres de section), boutons des formulaires (✓, 🗑), `OperationRecurrente`, `OperationRecurrenteList`, `Amortissement/Operation`, `Home/Operation` (si `improve-front-operation-list` n'est pas encore livré), optgroup « Suggestions »
- [ ] 3.3 Coche CSS de `OperationForm` sans caractère `✓`

## 4. Couleurs codées en dur

- [ ] 4.1 Gestion : `gestion.vue`, `comptesGestion.vue`, `credits.vue`, `biens.vue`, `CreditCard`, `BienCard`, `CreditList`, `BienList`
- [ ] 4.2 Formulaires : `CompteForm`, `CreditForm`, `BienForm`, `OperationForm`, `OperationRecurrenteForm`, `TransfertForm`
- [ ] 4.3 Divers : `config.vue`, `editUser.vue`, `OperationRecurrente`, `OperationList`, `Home/Operation`, `AccountHeader` (dégradé de la jauge)
- [ ] 4.4 Statistiques : séries Highcharts lues depuis `--chart-*`, graphiques recréés au changement de thème
- [ ] 4.5 `check-colors.mjs` passe en mode bloquant

## 5. Nettoyage

- [ ] 5.1 Inventaire d'usage des utilitaires de `main.css` et des tokens `--btn-*`, `--badge-*`, `--alert-*` ; suppression des inutilisés, réécriture des classes `.btn-*` restantes sur les nouveaux tokens
- [ ] 5.2 Rayons et ombres isolés ramenés aux tokens

## 6. Vérification

- [ ] 6.1 `pnpm test`, `pnpm type-check`, `pnpm lint:check` verts (aucun nouveau warning)
- [ ] 6.2 Recette visuelle écran par écran (accueil, comptes, recherche, gestion, crédits, biens, récurrentes, coûts d'usage, stats, réglages, profil, chaque formulaire, login) en thème clair et sombre, sur iPhone en PWA et sur desktop, avec captures avant / après
