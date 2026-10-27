## Context

`OperationList.vue` affiche les opérations du compte ouvert (ou les résultats de recherche) avec un défilement infini par pages de 35. Le rendu de chaque ligne est délégué à un composant passé en prop (`OperationRenderer`), aujourd'hui `Home/Operation.vue`. L'API trie la liste du compte par `CheckOp ASC, DateOp DESC` (les opérations à pointer d'abord), la recherche par `DateOp DESC`. `improve-front-session-and-state` remplace la pagination par `skip` par un curseur `(CheckOp, DateOp, IDop)` et rend le pointage optimiste : une opération pointée change de bloc sans rechargement.

La catégorie n'a ni couleur ni icône en base (`Categorie` : `IDcat`, `Nom`, `IDuser`, `Type`).

## Goals / Non-Goals

**Goals :**
- Parcourir la liste plus vite : repères de jour, lignes compactes, catégorie visible.
- Séparer clairement « pointer » et « modifier » sur mobile.
- Des montants lisibles en thème clair comme en sombre.

**Non-Goals :**
- Filtres, sélection multiple, swipe-to-delete.
- Couleur ou icône de catégorie stockée en base.
- Le tableau de bord d'accueil (envisagé plus tard, change séparé).

## Decisions

### D1. Deux blocs, puis des jours
Le regroupement suit le tri serveur au lieu de le refaire : regrouper uniquement par date mélangerait les opérations pointées et à pointer, qui arrivent dans deux séquences distinctes au fil des pages. `groupOperations(operations, { splitByCheck })` (`app/utils/operationGroups.ts`) renvoie `[{ key, title, days: [{ key, label, operations }] }]`.
- Liste du compte : blocs « À pointer » et « Pointées » ; un bloc vide n'est pas affiché.
- Recherche et listes des statistiques (lecture seule) : un seul bloc sans titre, regroupé par jour.
- Une page qui arrive complète le dernier jour du dernier bloc au lieu d'en créer un nouveau (clé de jour `YYYY-MM-DD`).

Le titre du bloc affiche le nombre d'opérations chargées seulement quand toutes les pages sont chargées (sinon le nombre serait faux).

### D2. Libellés de jour
`dayLabel(date, now)` en fuseau local (`getFullYear`/`getMonth`/`getDate`, pas `toISOString`) :
- jour courant → « Aujourd'hui », veille → « Hier » ;
- date future → « À venir · mardi 4 novembre » (opérations générées par les récurrentes jusqu'à 15 ou 30 jours à l'avance) ;
- sinon « Mardi 21 octobre », avec l'année hors de l'année courante.

Ces en-têtes sont collants (`position: sticky`) juste sous l'en-tête de l'application (`top: $header-height-and-margin`).

### D3. Ligne d'opération
Structure : `[case à cocher] [libellé + ligne secondaire] [montant]`.
- Ligne secondaire : pastille de catégorie, indicateurs (icône `home` pour un bien, `credit-card` pour un crédit, `history` pour un coût d'usage), compte en mode recherche.
- Couleur de la pastille : choisie de façon déterministe à partir de `IDcat` dans une palette de 8 couleurs du thème ; « Aucune » (`IDcat = 0`) en gris neutre. Pas de colonne en base.
- Montant : texte aligné à droite, `font-variant-numeric: tabular-nums`, signe toujours affiché, tokens `--color-amount-in` / `--color-amount-out`.
- Pas de bordure ni d'ombre par ligne : séparateur fin entre lignes, fond de carte par groupe de jour.

### D4. Cibles tactiles
- La ligne entière (hors case) est un lien vers `/editOperation/<id>` : un `<NuxtLink>` couvre le libellé et le montant.
- La case à cocher est un `<input type="checkbox">` dans un `<label>` de 44 × 44 px minimum, séparé du lien, avec `aria-label="Pointer <libellé>"` (« Dépointer » si elle est cochée). Un `@click.stop` évite d'ouvrir l'édition.
- Le bouton ✏️ est supprimé ; le libellé n'est plus le `<label>` de la case.
- En lecture seule (`readOnly`), ni case ni lien.

### D5. États de la liste
- Premier chargement : 6 lignes squelettes (`OperationSkeleton.vue`, animation désactivée avec `prefers-reduced-motion`).
- Page suivante : 2 lignes squelettes à la place de « Chargement… ».
- Erreur (exposée par le store depuis `improve-front-session-and-state`) : message et bouton « Réessayer » qui relance le chargement de la page en échec.
- Vide : « Aucune opération sur ce compte » et un bouton « Nouvelle opération » (`/newOperation`) ; en recherche, « Aucun résultat pour « terme » ».
- Fin de liste : un trait discret au lieu du texte en italique.

### D6. Composant de rendu
`OperationList` garde la prop `OperationRenderer` mais prend en charge le regroupement et les états ; le rendu d'un groupe passe au renderer chaque opération comme aujourd'hui. Usages actuels :
- accueil (`pages/index.vue`) : deux blocs et jours ;
- statistiques (`PieByCategorie`, `TopCategories`, `CategoryHeatmap`, en `readOnly` avec `Home/Operation.vue`) : jours sans blocs, prop `split-by-check` à faux ; la nouvelle ligne s'y applique en lecture seule ;
- coûts d'usage (`pages/amortissement.vue`, renderer `Amortissement/Operation.vue`) : inchangé, prop `grouped` à faux.

## Risks / Trade-offs

- [Une opération pointée change de bloc et la liste « saute »] → Le pointage optimiste déplace la ligne ; une transition courte (`<TransitionGroup>`, désactivée avec `prefers-reduced-motion`) rend le déplacement lisible.
- [En-têtes collants et en-tête fixe de l'application] → Les en-têtes de jour se placent sous l'en-tête de l'application ; vérification sur iOS (Safari gère mal `sticky` dans un conteneur `overflow: hidden`, qu'il faut éviter sur les parents).
- [Couleur de catégorie dérivée de l'identifiant] → Deux catégories peuvent partager une couleur ; le nom reste toujours affiché, la couleur n'est qu'un repère.
- [Perte du bouton ✏️ pour les habitués] → La ligne entière devient la cible, plus grande ; le changement est visible dès la première utilisation.
