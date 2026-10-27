## 1. Schéma et migration

- [x] 1.1 Créer `server/db/migrations/0005_bien_rental_income.sql` (rejouable, sans commentaire) : `Operation.IDbien` + index `idx_operation_idbien`, `OperationRecurrente.IDbien`, `Bien.LoyerMensuel DECIMAL(12,2) NULL`. Vérifier que `tests/api/migrations.spec.ts` rejoue le fichier sans erreur
- [x] 1.2 Ajouter `IDbien` (et l'index) à `operations` et `operationRecurrentes`, puis `LoyerMensuel` (`money`) à `biens` dans `server/db/schema.ts`. Ajouter `'Operation.idx_operation_idbien': 'IDbien'` aux index attendus de `tests/api/schema.spec.ts` et vérifier que `pnpm test:api` passe

## 2. API : lien opération → bien

- [x] 2.1 Ajouter `assertBienInBody` dans `server/utils/resources.ts` et brancher `IDbien: numeric.nullable()` dans les shapes, ainsi que `preserve: ['IDbien']`, sur `operationResource` et `operationRecurrenteResource`. Couvrir dans `tests/api/operations.spec.ts` : lien créé et relu, bien d'autrui → 404 sans écriture, `IDbien: null` retire le lien, `PUT` sans `IDbien` conserve le lien, `PATCH` d'un `IDbien` sur la récurrente d'un crédit → 409
- [x] 2.2 Recopier `IDbien` dans l'`INSERT` de `server/api/operation-recurrentes/auto-generation.post.ts`. Vérifier par un test d'API qu'une récurrente « Loyer » liée génère une opération portant le même `IDbien`
- [x] 2.3 Vérifier par un test d'API (`tests/api/stats.spec.ts`) que lier une opération `revenu` à un bien ne change ni `sumForACompte` ni `incomeVsExpense`

## 3. API : biens

- [x] 3.1 Créer `server/api/biens/` avec les routes CRUD explicites (`index.get`, `index.post`, `index.patch`, `count.get`, `[id].get/put/patch/delete`) via `crudRoute('biens', …)`, sur le modèle de `server/api/credits/`. Vérifier que les tests biens existants de `tests/api/credits-biens.spec.ts` passent toujours
- [x] 3.2 Ajouter le helper `numericMin(min)` dans `server/utils/validate.ts`, puis `LoyerMensuel: numericMin(0).nullable()` dans le shape de `bienResource`. Tester dans `tests/api/credits-biens.spec.ts` : `PATCH` à 650 relu, valeur négative → 4xx sans écriture, bien créé sans loyer → `LoyerMensuel` nul
- [x] 3.3 Ajouter `onDelete` à `bienResource` : remise à `NULL` de `IDbien` sur `Operation` et `OperationRecurrente`. Tester qu'après suppression d'un bien, sa récurrente et ses opérations subsistent avec `IDbien` nul

## 4. Calcul et routes de rentabilité

- [x] 4.1 Créer `server/utils/rentabilite.ts`, en fonctions pures : classement des flux (`IDcredit` prioritaire, signe), période (12 mois civils révolus bornés à la première opération, format `AAAA-MM`), agrégats et ratios de bien et de crédit, `round2`, `null` sur dénominateur nul. Couvrir dans `tests/unit/server-rentabilite.spec.ts` les scénarios « Mois courant exclu », « Location récente », « Déblocage rattaché au bien », « Mensualité liée au bien », « Deux biens sur un même crédit », « Bien loué toute l'année » (4,88 % / 4,35 %), « Investissement locatif » (-250 €, 78,31 %) et « Prévision » (-180 €)
- [x] 4.2 Créer `server/api/biens/[id]/rentabilite.get.ts` : bien de l'utilisateur (404 sinon), requête unique `IDbien = :id` sous `compteScope` (les opérations futures sont écartées par `rentabilite.ts`). Tester dans `tests/api/credits-biens.spec.ts` : bien loué, bien sans opération (`attendu` seul), échéance anticipée ignorée, opération d'un autre utilisateur ignorée, bien d'autrui → 404, et `GET /api/biens/{id}` toujours servi
- [x] 4.3 Créer `server/api/credits/[id]/rentabilite.get.ts` : `findOwnedCredit`, biens liés de l'utilisateur, requête `IDbien IN (…) OR IDcredit = :id` sous `compteScope`, `attendu.mensualite` à 0 si le crédit n'est pas actif ou est échu. Tester : investissement locatif, deux biens sur un crédit, crédit sans bien, crédit d'autrui → 404, `remaining-balance` identique avant et après la saisie des loyers
- [x] 4.4 Documenter les deux routes et le lien `IDbien` dans `docs/architecture.md`, et mettre à jour `CLAUDE.md` (tableau Domain Model : `Bien.LoyerMensuel`, `IDbien` sur `Operation`/`OperationRecurrente` ; Key Features : rentabilité). Relire que les noms de champs correspondent aux specs

## 5. Front : saisie

- [x] 5.1 `OperationForm.vue` et `OperationRecurrenteForm.vue` : `<select>` « Bien » (option « Aucun » → `null`) alimenté par `bienStore.bienList`, chargé si vide, absent sans bien, en lecture seule pour une récurrente de crédit. Vérifier avec `pnpm dev` : lier la récurrente « Loyer » à un bien puis la rouvrir prérempli, et constater l'absence du champ pour un utilisateur sans bien
- [x] 5.2 `BienForm.vue` : champ « Loyer mensuel attendu (hors charges) » affiché si `Usage = 'locatif'`, avec `LoyerMensuel` envoyé dans le corps (vide → `null`). Vérifier avec `pnpm dev` que 650 est enregistré puis relu, et que le champ disparaît pour une résidence principale

## 6. Front : affichage de la rentabilité

- [x] 6.1 Créer `app/utils/rentabilite.ts`, qui transforme une réponse de rentabilité en lignes d'affichage (réel ou prévu, effort ou cash-flow, couverture en % entier, rendements à 2 décimales, ratios `null` omis, absence de bloc). Couvrir dans `tests/unit/front-rentabilite.spec.ts` les scénarios de `front-biens-credits`
- [x] 6.2 Ajouter `fetchBienRentabilite` et `fetchCreditRentabilite` dans les services, puis `bienRentabilites` (biens `locatif`, action `fetchBienRentabilites` appelée par `biens.vue` et après `updateBien`) et `creditRentabilites` (dans la boucle de `fetchCredits`) dans les stores. Étendre `tests/unit/stores.spec.ts` pour vérifier le remplissage des deux maps
- [x] 6.3 `CreditCard.vue` : ligne « Loyers · couverture · effort » ; `BienCard.vue` : bloc « Rentabilité ». Vérifier avec `pnpm dev`, sur un crédit qui finance un bien loué et sur un bien locatif sans loyer, que l'affichage suit les scénarios de la spec
- [x] 6.4 Décrire dans `README.md` (français) la saisie des loyers (lier la récurrente « Loyer » et les charges au bien, loyer attendu) et les indicateurs affichés

## 7. Bilan depuis l'achat

- [x] 7.1 Extraire le calcul d'amortissement de `remaining-balance.get.ts` vers une fonction pure `amortize` dans `server/utils/amortization.ts`, et la lecture des paiements vers `findCreditPayments` dans `server/utils/credits.ts`. Couvrir `amortize` dans `tests/unit/server-amortization.spec.ts` (sans intérêts, avec intérêts, suspension d'échéances) et vérifier que les tests d'API du restant dû passent sans modification
- [x] 7.2 Ajouter `bilan` à `bienRentabilite` et une fonction pure `creditShare` (part au prorata de `prixTotal`, intérêts et mensualités) dans `server/utils/rentabilite.ts`. Couvrir dans `tests/unit/server-rentabilite.spec.ts` les scénarios « Bilan d'un bien loué à crédit », « Crédit partagé entre deux biens » et « Bien acheté comptant sans valeur estimée »
- [x] 7.3 Brancher la part du crédit dans `server/api/biens/[id]/rentabilite.get.ts` (crédit de l'utilisateur, biens liés, paiements sous `compteScope`). Tester dans `tests/api/credits-biens.spec.ts` : `bilan.interets` égal aux `interets` de `remaining-balance`, répartition 80/20 sur un crédit partagé, bien sans crédit
- [x] 7.4 Ajouter `bienBilanBlock` dans `app/utils/rentabilite.ts` (montants signés, mention « valeur non renseignée », ligne d'intérêts seulement avec un crédit, absence de bloc), testée dans `tests/unit/front-rentabilite.spec.ts`. Afficher le bloc dans `BienCard.vue` et le vérifier dans le navigateur sur une base jetable
- [x] 7.5 Documenter le bilan dans `README.md`, `docs/architecture.md` et `CLAUDE.md`

## 8. Abattement pour charges

- [x] 8.1 Ajouter `AbattementCharges DECIMAL(5,2) NULL` au `Bien` dans `0005_bien_rental_income.sql` et `server/db/schema.ts`, ainsi qu'un helper `numericBetween(min, max)` et la validation 0-100 dans `bienResource`. Tester dans `tests/api/credits-biens.spec.ts` : valeur enregistrée et relue, 120 et -1 refusés sans écriture
- [x] 8.2 Appliquer l'abattement de chaque bien à `tauxCouverture` (crédit) et à `partCreditLoyers` (bilan) dans `server/utils/rentabilite.ts`, sans toucher loyers, cash-flow ni gain. Couvrir dans `tests/unit/server-rentabilite.spec.ts` les scénarios « Abattement pour charges », « Bilan avec abattement pour charges » et deux biens à abattements différents, et ajouter un test d'API sur la route du crédit
- [x] 8.3 Ajouter le champ « Part des charges dans le loyer perçu (%) » dans `BienForm.vue` (bien locatif, vide → `null`), puis le vérifier dans le navigateur sur une base jetable
- [x] 8.4 Documenter l'abattement dans `README.md`, `docs/architecture.md` et `CLAUDE.md`

## 9. Durée de la location et loyer hors charges

- [x] 9.1 Ajouter `Bien.DateMiseEnLocation DATETIME NULL` à `0005_bien_rental_income.sql` (d'abord livré en `0006`, fusionné dans `0005` puisque rien n'est déployé), puis l'ajouter à `server/db/schema.ts` et au shape de `bienResource`. Tester l'enregistrement et la relecture dans `tests/api/credits-biens.spec.ts`
- [x] 9.2 Dans `server/utils/rentabilite.ts`, définir la période comme la durée de la location (sans plafond de 12 mois, début = `DateMiseEnLocation`, puis repli sur les opérations), et calculer `loyerMensuelMoyen` (bien et crédit) et `rendementBrut` sur les loyers abattus. Adapter et compléter `tests/unit/server-rentabilite.spec.ts` : « Ancien logement principal mis en location », « Location de plus de 12 mois », « Date de mise en location du bien », loyer moyen abattu
- [x] 9.3 Front : utiliser `loyerMensuelMoyen` du crédit, afficher « depuis <mois année> » sur la ligne du crédit et dans le bloc « Rentabilité », et ajouter le champ « Date de mise en location » à `BienForm.vue`. Mettre à jour `tests/unit/front-rentabilite.spec.ts`, puis vérifier dans le navigateur sur une base jetable
- [x] 9.4 Appliquer la colonne sur la base de test de l'utilisateur, puis documenter dans `README.md`, `docs/architecture.md` et `CLAUDE.md`

## 10. Crédit sans les charges du bien

- [x] 10.1 Retirer les charges de la rentabilité d'un crédit (effort = loyers hors charges − mensualités, `mensualiteMoyenne`, plus de `charges` ni de `cumul.solde`) dans `server/utils/rentabilite.ts`, et adapter `tests/unit/server-rentabilite.spec.ts` et `tests/api/credits-biens.spec.ts`
- [x] 10.2 Afficher la mensualité moyenne sur la ligne du crédit (`app/utils/rentabilite.ts`), adapter `tests/unit/front-rentabilite.spec.ts`, mettre à jour la spec, `README.md`, `docs/architecture.md` et `CLAUDE.md`

## 11. Retrait des rendements

- [x] 11.1 Retirer `rendementBrut`, `rendementNet` et `attendu.rendementBrut` de `bienRentabilite` et la ligne « Rendement » de `BienCard.vue` (le bilan reste), et adapter les tests unitaires, d'API et front
- [x] 11.2 Retirer les rendements de la spec, du design, de la proposition, de `README.md`, `docs/architecture.md` et `CLAUDE.md`

## 12. Début de location commun au bien et au crédit

- [x] 12.1 Fixer le début de la location à la date de mise en location, et à défaut au premier loyer, pour le bien comme pour le crédit (`rentalStart` dans `server/utils/rentabilite.ts`), et couvrir dans `tests/unit/server-rentabilite.spec.ts` : travaux avant le premier loyer, bien qui n'a que des charges, crédit dont le bien n'est pas loué, date déclarée prioritaire
- [x] 12.2 Mettre à jour la règle de période dans la spec, le design, `README.md`, `docs/architecture.md` et `CLAUDE.md`

## 13. Un crédit, un bien

- [x] 13.1 Refuser dans `bienResource` un `IDcredit` déjà porté par un autre bien (409, `assertCreditFree`) et le `PATCH` en masse (405), puis tester dans `tests/api/credits-biens.spec.ts` la création, le PATCH, le PUT, le réenregistrement et le PATCH en masse
- [x] 13.2 Ramener la rentabilité d'un crédit à son seul bien (`bien` au lieu de `biens`), remplacer `creditShare` par `paidOnCredit` (sans prorata), et retirer les tests multi-biens au profit d'un test de `paidOnCredit`
- [x] 13.3 Front : `bien` dans `CreditRentabilite`, crédits déjà affectés exclus du formulaire de bien ; spec, design, proposition, `README.md`, `docs/architecture.md` et `CLAUDE.md` mis à jour

## 14. Saisies successives

- [x] 14.1 Remettre `IDbien` à `null` dans `resetOperationAttribut` de `OperationForm.vue` et `OperationRecurrenteForm.vue`, et ajouter le scénario « Saisies successives » à la spec front

## 15. Intégrité des données

- [x] 15.1 Valider `IDbien` avec `optionalId` (0 et vide → `NULL`, sinon entier positif) sur les opérations et les récurrentes, et tester dans `tests/api/operations.spec.ts`
- [x] 15.2 Ajouter `LoyerMensuel`, `AbattementCharges` et `DateMiseEnLocation` à `preserve` sur `bienResource`, et tester dans `tests/api/credits-biens.spec.ts` qu'un `PUT` qui les omet les conserve et qu'un `null` les efface

- [x] 15.3 Valider aussi `IDcredit` avec `optionalId` sur les opérations et les biens (faille antérieure au change), et tester dans `tests/api/operations.spec.ts` et `tests/api/credits-biens.spec.ts`
- [x] 15.4 Retirer de `CreditRentalLine` le champ `effort`, calculé et testé mais affiché nulle part
- [x] 15.5 Centraliser les recherches de propriété : `findOwned` de `server/utils/crud.ts` (exporté) pour les biens, `ownedCredit` / `findOwnedCredit` (`server/utils/credits.ts`) pour les crédits, utilisés par `assertBienInBody`, `assertCreditInBody` et la route de rentabilité d'un bien ; validations typées sans `Record<string, any>`
- [x] 15.6 Limiter la recherche de `assertCreditFree` aux biens de l'utilisateur, et tester qu'un bien d'un autre utilisateur portant le même `IDcredit` (donnée historique) ne bloque pas
- [x] 15.7 Lire `IDcredit` / `IDbien` à 0 comme une absence de lien dans `flowKind`, ne plus recopier de 0 à l'auto-génération, et tester le classement et une ancienne récurrente à `IDcredit = 0`
- [x] 15.8 Remettre `Bien.IDcredit` à `NULL` à la suppression d'un crédit, et vérifier dans `tests/api/credits-biens.spec.ts` que le bien reste modifiable
- [x] 15.9 Retirer les commentaires d'`amortization.ts` (règle du projet : la logique est documentée par la spec et les tests), restaurer le spy `console.error` et corriger le format du mock (`bien`) dans `tests/unit/stores.spec.ts`, et ne plus relancer `GET /api/biens` à chaque ouverture de formulaire (`biensLoaded` dans le store `bien`, testé)

## 16. Vérification d'intégration

- [ ] 16.1 Lancer `pnpm lint:check`, `pnpm type-check`, `pnpm test` et `pnpm test:api`, tous au vert
- [ ] 16.2 Recette sur une copie de la base : `pnpm db:migrate` deux fois (rejouable), lier la récurrente « Loyer » existante au bien du crédit, lancer l'auto-génération, puis contrôler la carte du crédit (couverture, effort) et la carte du bien (rendements) au regard des opérations réelles
