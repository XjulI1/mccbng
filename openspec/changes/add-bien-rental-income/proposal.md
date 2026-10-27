## Why

Un bien locatif financé par un crédit coûte la mensualité moins le loyer, pas la mensualité seule. Aujourd'hui l'application ne sait pas qu'un loyer est rattaché à un bien : la fiche crédit n'affiche que la mensualité et le restant dû, et ni l'effort d'épargne réel, ni la part du crédit payée par le locataire, ni le bilan du bien ne sont calculables.

Les loyers sont déjà saisis comme opérations (souvent une récurrente « Loyer »), et un bien est déjà lié à son crédit (`Bien.IDcredit`). Il manque le lien entre l'opération et le bien.

## What Changes

- **Lien opération → bien** : nouvelle colonne nullable `IDbien` sur `Operation` et `OperationRecurrente`, validée comme `IDcredit` (bien de l'utilisateur, 404 sinon). L'auto-génération recopie `IDbien` de la récurrente sur l'opération générée. Une opération liée au bien est un loyer si elle est positive, une charge si elle est négative.
- **Loyer attendu** : nouvelle colonne nullable `Bien.LoyerMensuel`, utilisée pour les calculs prévisionnels tant qu'aucun mois complet n'a été encaissé.
- **Abattement pour charges** : nouvelle colonne nullable `Bien.AbattementCharges` (en %). Les loyers étant saisis charges comprises, cette part est retirée pour obtenir le loyer hors charges : loyer moyen affiché et couverture du crédit (taux de couverture et crédit payé par les loyers). L'effort, le cash-flow et le gain total restent calculés sur l'argent réellement encaissé.
- **Date de mise en location** : nouvelle colonne nullable `Bien.DateMiseEnLocation`. Les indicateurs mensuels (loyer moyen, couverture, effort) sont calculés sur toute la durée de la location, à partir de cette date. Le bilan reste sur toute la vie du bien.
- **Suppression d'un bien** : `IDbien` est remis à `NULL` sur les opérations et récurrentes qui le référençaient, dans la même transaction.
- **Suppression d'un crédit** : `IDcredit` est aussi remis à `NULL` sur le bien qu'il finançait, qui sinon ne pouvait plus être modifié (404 sur le crédit disparu).
- **Rentabilité d'un bien** : nouvelle route `GET /api/biens/{id}/rentabilite` qui renvoie, sur la durée de la location (depuis `Bien.DateMiseEnLocation`) et en cumul, les loyers et charges du bien et le loyer mensuel moyen hors charges. Les rendements brut et net, essayés puis écartés, sont reportés à un change ultérieur.
- **Bilan depuis l'achat** : la même route renvoie le gain total de l'investissement, soit la plus-value, plus les loyers nets cumulés, moins les intérêts d'emprunt versés, ainsi que la part des mensualités payée par les loyers. Il reste visible après la fin du crédit, période où chaque loyer s'ajoute au gain.
- **Rentabilité d'un crédit** : nouvelle route `GET /api/credits/{id}/rentabilite` qui rapproche les loyers du bien financé (hors charges) des mensualités du crédit : loyer moyen, mensualité moyenne, effort mensuel et taux de couverture, réels et attendus.
- **Un crédit, un bien** : un crédit finance au plus un bien. L'API refuse d'affecter un crédit déjà porté par un autre bien (409), et le formulaire de bien ne le propose pas.
- **Front** :
  - sélecteur « Bien » dans les formulaires d'opération et de récurrente (absent pour une récurrente gérée par un crédit) ;
  - champ « Loyer mensuel attendu » dans le formulaire de bien ;
  - ligne « Loyers · couverture · effort » sur la carte d'un crédit qui finance un bien loué ;
  - bloc « Rentabilité » et bloc « Bilan depuis l'achat » sur la carte d'un bien locatif.
- **Inchangé, explicitement** : le restant dû (`remaining-balance`) et toutes les statistiques. Les loyers y sont déjà comptés comme opérations d'une catégorie `revenu`, et `LoyerMensuel` n'y entre jamais.

## Capabilities

### New Capabilities
- `front-biens-credits` : saisie du lien opération → bien et du loyer attendu, affichage de la rentabilité sur les cartes de crédit et de bien, et du bilan depuis l'achat sur la carte du bien.

### Modified Capabilities
- `api-credits-biens` : `LoyerMensuel` et cascade de suppression dans le CRUD des biens, nouvelles routes de rentabilité d'un bien (avec bilan depuis l'achat) et d'un crédit, scénario « loyer ignoré » du restant dû.
- `api-operations` : `IDbien` accepté et validé dans le CRUD des opérations et des récurrentes, recopié par l'auto-génération.

## Impact

- **Base de données** : migration `0005_bien_rental_income.sql` (rejouable) qui ajoute `Operation.IDbien`, `OperationRecurrente.IDbien` (index `idx_operation_idbien`) et `Bien.LoyerMensuel DECIMAL(12,2)`, `Bien.AbattementCharges DECIMAL(5,2)` et `Bien.DateMiseEnLocation DATETIME` ; `server/db/schema.ts`.
- **Code serveur** :
  - `server/utils/resources.ts` (validation `IDbien`, `LoyerMensuel`, `onDelete` du bien) ;
  - `server/api/operation-recurrentes/auto-generation.post.ts` (recopie de `IDbien`) ;
  - nouveau `server/utils/rentabilite.ts` (classement des flux et calculs, testé unitairement) ;
  - nouveau `server/utils/amortization.ts`, qui reprend le calcul de `remaining-balance` pour le partager avec le bilan (comportement inchangé) ;
  - nouvelles routes `server/api/biens/[id]/rentabilite.get.ts` et `server/api/credits/[id]/rentabilite.get.ts` ; dossier `server/api/biens/` avec ses routes CRUD explicites (`crudRoute`), comme `credits/` et `comptes/`.
- **Code front** : `OperationForm.vue`, `OperationRecurrenteForm.vue`, `BienForm.vue`, `BienCard.vue`, `CreditCard.vue`, `pages/credits.vue`, stores `bien` et `credit`, services `bien` et `credit`.
- **Utilisateurs** : pour voir les chiffres réels, lier la récurrente « Loyer » existante (et, au choix, les charges du bien) au bien concerné. Rien ne change tant qu'aucune opération n'est liée.
- **Déploiement** : jouer `pnpm db:migrate` (`0005`) avant de démarrer la nouvelle image.
