## Why

La liste des opérations est l'écran le plus utilisé de l'application, et la revue UX/UI du 2026-10-27 y relève plusieurs gênes :
- chaque opération est une carte encadrée qui répète sa date : la liste est longue à parcourir et on ne voit pas où commence une journée ;
- la catégorie n'est pas visible, sauf « Aucune » (en italique) ;
- le libellé de l'opération est le `<label>` de la case à cocher : toucher le nom pointe l'opération, alors que l'édition passe par un petit bouton ✏️ séparé ;
- la case à cocher fait 18 px, sous la taille tactile recommandée (44 px) ;
- le montant est dans une pastille encadrée, en vert ou rouge clair (`#4ade80`, `#f87171`) peu lisibles sur fond blanc ;
- le chargement affiche le texte « Chargement… », et un compte sans opération affiche une liste vide sans explication.

## What Changes

- **Regroupement** : deux blocs, « À pointer » puis « Pointées », dans l'ordre déjà renvoyé par l'API (`CheckOp`, puis date décroissante). Dans chaque bloc, les opérations sont regroupées par jour sous un en-tête collant (« Aujourd'hui », « Hier », « Mardi 21 octobre », l'année est ajoutée hors de l'année en cours, « À venir » pour les opérations générées en avance).
- **Ligne d'opération** : ligne compacte sans carte. Libellé, catégorie (pastille), indicateurs discrets (bien lié, crédit, coût d'usage), montant aligné à droite en chiffres tabulaires. Plus de date répétée sur la ligne.
- **Interactions** : toucher la ligne ouvre l'édition ; la case à cocher est une cible distincte d'au moins 44 × 44 px qui seule pointe l'opération ; le bouton ✏️ disparaît.
- **Couleurs des montants** : tokens du thème avec un contraste d'au moins 4,5:1, en clair et en sombre.
- **États** : lignes squelettes au premier chargement et pendant le chargement de la page suivante ; état vide avec un bouton « Nouvelle opération » ; état d'erreur avec « Réessayer » ; fin de liste discrète.
- **Autres listes** : les listes en lecture seule des statistiques reprennent la nouvelle ligne, regroupées par jour sans blocs ; la page Coûts d'usage garde son rendu.
- **Mode recherche** : le compte de chaque opération s'affiche sous le libellé (plus de badge sur la ligne principale).
- **Accessibilité** : liste sémantique (`<section>`, titres de groupe, `<ul>`/`<li>`), libellé accessible de la case « Pointer <libellé> », sens du montant annoncé (« débit », « crédit »).

## Capabilities

### New Capabilities
- `front-operations` : présentation et interactions de la liste des opérations du compte ouvert et des résultats de recherche.

### Modified Capabilities
_Aucune._

## Impact

- **Code** : `app/components/OperationList.vue`, `app/components/Home/Operation.vue`, `app/pages/amortissement.vue` et les trois composants de statistiques qui utilisent la liste (props de regroupement) ; nouveaux `app/utils/operationGroups.ts` (regroupement et libellés de jour) et `app/components/OperationSkeleton.vue`.
- **API** : aucun changement.
- **Dépendances** :
  - à livrer **après `improve-front-session-and-state`**, qui modifie les mêmes composants (pointage optimiste, pagination par curseur, état vide sans compte, erreurs de chargement exposées par le store) ;
  - utilise les tokens de couleur de `improve-front-theme-consistency` s'il est livré avant, sinon les ajoute lui-même dans `theme.css`.
- **Tests** : tests unitaires du regroupement (frontière des blocs, jours, « À venir », année, fuseau local autour de minuit).
- **Hors périmètre** : filtres, sélection multiple, swipe-to-delete, tableau de bord.
