## 1. Regroupement

- [ ] 1.1 `app/utils/operationGroups.ts` : `groupOperations` (blocs « À pointer » / « Pointées », jours, page suivante ajoutée au dernier jour) et `dayLabel` (Aujourd'hui, Hier, À venir, année hors année courante, fuseau local)
- [ ] 1.2 Tests unitaires : frontière entre les blocs sur deux pages, jour réparti sur deux pages, recherche sans bloc, libellés autour de minuit et du 1er janvier, date future

## 2. Liste

- [ ] 2.1 `OperationList.vue` : rendu par blocs et par jours (`<section>`, titres, `<ul>`), en-têtes de jour collants sous l'en-tête de l'application, props `grouped` (faux pour l'amortissement) et `split-by-check` (faux pour la recherche et les listes des statistiques)
- [ ] 2.2 `OperationSkeleton.vue` ; squelettes au premier chargement et pendant le chargement de la page suivante, `prefers-reduced-motion` respecté
- [ ] 2.3 États vide (compte et recherche), erreur avec « Réessayer », fin de liste discrète
- [ ] 2.4 Transition de déplacement d'une opération pointée (`<TransitionGroup>`)

## 3. Ligne d'opération

- [ ] 3.1 `Home/Operation.vue` : ligne compacte sans carte, date retirée de la ligne, libellé et ligne secondaire (catégorie, indicateurs bien / crédit / coût d'usage, compte en mode recherche)
- [ ] 3.2 Pastille de catégorie : couleur déterministe depuis `IDcat` dans une palette de 8 tokens, « Aucune » en gris
- [ ] 3.3 Ligne cliquable vers `/editOperation/<id>`, case à cocher séparée de 44 × 44 px avec `aria-label` « Pointer / Dépointer <libellé> », suppression du bouton ✏️
- [ ] 3.4 Montant en chiffres tabulaires, signe affiché, tokens `--color-amount-in` / `--color-amount-out` (ajoutés à `theme.css` s'ils n'existent pas encore), sens annoncé aux lecteurs d'écran

## 4. Vérification

- [ ] 4.1 `pnpm test`, `pnpm type-check`, `pnpm lint:check` verts (aucun nouveau warning) ; `tests/integration/routes.spec.ts` inchangé
- [ ] 4.2 Recette mobile (Safari iOS en PWA, Chrome Android) et desktop, thème clair et sombre : défilement long avec en-têtes collants, pointage d'une opération (changement de bloc), ouverture de l'édition en touchant la ligne, case touchée sans ouvrir l'édition, compte vide, coupure réseau pendant le chargement de la page suivante, recherche, listes des statistiques (lecture seule, sans blocs), page Coûts d'usage inchangée
