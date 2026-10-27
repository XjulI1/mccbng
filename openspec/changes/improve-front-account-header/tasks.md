## 1. En-tête

- [x] 1.1 `AccountHeader.vue` : nom et pourcentage du plafond sur la première ligne, solde total en grand et solde pointé libellé sur la seconde, « Tout pointé » quand les deux soldes sont égaux
- [x] 1.2 États : « … » avant le chargement des soldes, solde négatif en rouge, pourcentage et jauge en orange à partir de 100 %
- [x] 1.3 Mise en page : bandeau pleine largeur sur mobile (safe area, troncature du nom, police réduite sous 360 px), cartouche centré sur le panneau de droite sur desktop, titre seul centré avec `disabledTotalHeader`

## 2. Vérification

- [x] 2.1 ESLint sans avertissement sur le composant, `vue-tsc --noEmit` sans erreur
- [x] 2.2 Recette visuelle : iPhone SE (320 px) et iPhone récent en PWA (encoche), Android, desktop avec la liste des comptes ; thème clair et sombre ; compte avec un nom long, solde négatif, livret au-delà du plafond, compte entièrement pointé ; pages Stats et Gestion
