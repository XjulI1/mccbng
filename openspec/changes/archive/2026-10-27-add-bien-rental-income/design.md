## Context

La motivation est décrite dans `proposal.md` (Why). Ce qui existe déjà :

- `Bien.IDcredit` relie un bien à son crédit, et `Bien.Usage` connaît déjà la valeur `locatif`.
- `Operation.IDcredit` relie une opération à un crédit. Une opération négative est une mensualité. Une opération positive est un déblocage ou un remboursement, que `remaining-balance` ignore.
- Le CRUD générique (`server/utils/crud.ts`) remet à `NULL` toute colonne nullable absente d'un `PUT`, sauf celles listées dans `preserve`.
- `/api/biens` est servi par les routes génériques `server/api/[resource]/…`. `credits/` et `comptes/` ont leur propre dossier, avec des routes CRUD explicites (`crudRoute`), parce qu'ils exposent des sous-routes (`[id]/payments`, `[id]/banque`).
- Les montants sont des `DECIMAL(12,2)` lus comme nombres, et les sommes calculées en JS passent par `round2`.

## Goals / Non-Goals

**Goals :**
- Relier une opération ou une récurrente à un bien, sans rien changer aux soldes ni aux statistiques.
- Calculer côté serveur la rentabilité d'un bien et celle d'un crédit, avec des règles de flux communes (voir les specs `api-credits-biens`).
- Rendre ces règles testables unitairement, sans base de données.

**Non-Goals :**
- Charges déclaratives (taxe foncière, copropriété, assurance prévues) : seules les charges réellement saisies et liées au bien sont comptées.
- Fiscalité (revenus fonciers, LMNP, intérêts déductibles par année civile).
- Rendements brut et net : une première version les calculait (loyers annuels hors charges, ou loyers perçus moins charges, rapportés au prix total), mais la définition ne convenait pas à l'utilisateur. Ils sont retirés et seront repensés dans un change ultérieur.
- Plusieurs biens sur un même crédit : exclu, un crédit finance au plus un bien (décision 12).
- Graphique ou historique mensuel de la rentabilité.

## Decisions

### 1. Les loyers sont liés au bien, pas au crédit
Une colonne `IDbien` est ajoutée sur `Operation` et `OperationRecurrente`.
- **Alternative écartée : les loyers comme opérations positives liées par `Operation.IDcredit`.** Le sens « positif = déblocage ou remboursement » est déjà spécifié. Les mélanger fausserait `payments`, et rendrait ambigu tout calcul qui sépare loyers et déblocage.
- **Alternative écartée : un loyer déclaratif seul (`Credit.LoyerMensuel`).** Les loyers réels ne seraient pas suivis (vacance, révision annuelle), et un bien sans crédit n'aurait pas de bilan.
- **Bonus :** le même lien porte les charges du bien (opérations négatives), sans colonne de plus.

### 2. Classement des flux par signe, l'`IDcredit` est prioritaire
Une opération dont `IDcredit` est renseigné (`0` vaut absence, comme partout ailleurs) est toujours une opération de crédit : une mensualité si elle est négative, ignorée si elle est positive. Elle n'est jamais un loyer ni une charge, même si elle porte aussi un `IDbien`. Les autres opérations liées au bien sont des loyers si elles sont positives, des charges si elles sont négatives.
- On évite ainsi tout double comptage quand l'utilisateur lie aussi la mensualité ou le déblocage au bien.
- **Alternative écartée : classer selon le `Type` de la catégorie.** Une catégorie « Aucune » (`depense`) sur un loyer le transformerait en charge, et le classement dépendrait d'une saisie annexe. Le signe est déjà la règle de `remaining-balance`.

### 3. Une route pour le bien, une route pour le crédit, un seul module de calcul
- `GET /api/biens/{id}/rentabilite` : loyers, charges, loyer moyen et bilan d'un bien.
- `GET /api/credits/{id}/rentabilite` : loyers du bien financé et mensualités du crédit (couverture, effort).
- `server/utils/rentabilite.ts` regroupe des fonctions pures, testées dans `tests/unit/server-rentabilite.spec.ts` : classement des flux, calcul de la période, agrégats et ratios. Les deux routes se limitent à lire les lignes et à appeler ces fonctions.
- **Alternative écartée : la seule route bien, qui inclurait les mensualités de son crédit.** Les deux cartes répondent à deux questions différentes (ce que rapporte le bien, ce que les loyers paient du crédit), et un bien acheté comptant n'a pas de crédit.
- **Alternative écartée : la seule route crédit.** Un bien payé comptant n'aurait ni loyer moyen ni bilan.

### 4. Agrégation en JS sur une requête unique
Chaque route lit en une requête les opérations concernées (`IDcompte` dans le périmètre de l'utilisateur via `compteScope`), avec les seules colonnes `IDbien`, `IDcredit`, `MontantOp` et `DateOp`. Elle agrège ensuite en JS, et c'est la fonction pure qui écarte les opérations datées après aujourd'hui, pour que cette règle soit couverte par les tests unitaires :
- route du crédit : `IDbien = :bien financé OR IDcredit = :id` ;
- route du bien : `IDbien = :id`.

Le volume reste de l'ordre de quelques centaines de lignes par crédit, même sur 25 ans. Un index `idx_operation_idbien` permet l'union d'index avec `idx_operation_idcredit`.
- **Alternative écartée : `SUM(CASE …)` groupé par mois en SQL.** Les règles de classement et de période seraient dupliquées entre SQL et tests, pour un gain nul à ce volume.

### 5. Période : la durée de la location
Les dates sont prises en UTC, comme `remaining-balance`. La période va du mois de début de la location au dernier mois complet. Avec `m` l'index du mois courant (`année × 12 + mois`) et `d` celui du début, elle couvre les mois `d` à `m − 1`, soit `mois = max(0, m − d)`.
- **Le début de la location est déclaré** : `Bien.DateMiseEnLocation`. Le classement par signe ne distingue pas un loyer d'une autre entrée liée au bien (cadeau, remboursement de la période d'occupation personnelle). Un ancien logement principal ferait donc démarrer la « location » à l'achat. À défaut de date, le début est le **premier loyer**, pour le bien comme pour le crédit (la plus ancienne date de ses biens, sinon leur premier loyer). Une première version faisait démarrer le bien à son plus ancien flux, charges comprises, et le crédit à sa première mensualité : une facture de travaux antérieure à la location donnait 325 €/mois sur la carte du bien et 650 €/mois sur celle du crédit, et un bien pas encore loué affichait 0 € au lieu de son loyer prévu. Sans date ni loyer, la location n'a pas commencé (`mois = 0`) et les cartes affichent les valeurs attendues.
- **Toute la durée, sans plafond de 12 mois.** Un premier essai sur les 12 derniers mois décrivait bien la situation du moment, mais l'utilisateur raisonne sur toute la location. Les loyers anciens, plus bas, pèsent dans la moyenne : c'est accepté.
- **Le mois en cours est exclu** : un mois partiel, avec un loyer déjà encaissé mais une mensualité pas encore prélevée, fausserait le taux de couverture tout le début du mois.
- **Avant le début de la location**, les opérations (usage personnel, achat) restent dans le cumul du bilan, mais pas dans les indicateurs mensuels.
- Les moyennes et ratios valent `null` quand le dénominateur est nul. Le front se rabat alors sur les valeurs `attendu`.

### 6. `IDbien` dans `preserve`, validé comme `IDcredit`
- Un nouveau contrôle `assertBienInBody` vérifie que le bien appartient à l'utilisateur (404 sinon). Il s'ajoute à `validate` pour `operationResource` et `operationRecurrenteResource`.
- `IDbien` est ajouté à `preserve` sur ces deux ressources, si bien qu'un `PUT` qui l'omet ne coupe pas le lien. Pour la même raison, `LoyerMensuel`, `AbattementCharges` et `DateMiseEnLocation` sont dans `preserve` sur `bienResource` : une ancienne version de la PWA restée en cache ne les efface pas.
- `IDbien` est validé par `optionalId` : `0` et `''` deviennent `NULL` (sinon le lien vaudrait 0, introuvable et invisible dans le formulaire), et toute autre valeur doit être un entier positif. `IDcredit` suit la même règle sur les opérations et les biens, où la faille existait avant ce change ; la base de l'utilisateur ne contenait aucun `0`. Les écrans actuels renvoient la ligne complète, mais une ressource qui perd silencieusement un lien sur un `PUT` partiel est le piège que `preserve` existe pour éviter.
- La récurrente d'un crédit reste protégée par `assertWritable` (409), qui s'exécute avant la validation.
- Le bien reçoit un `onDelete` qui remet `IDbien` à `NULL` sur les opérations et les récurrentes, dans la transaction de `deleteById`.
- `LoyerMensuel` est validé par un nouveau helper `numericMin(0)` dans `server/utils/validate.ts`, sur le modèle de `numericInt`.

### 7. Routes CRUD explicites pour `biens/`
La sous-route `server/api/biens/[id]/rentabilite.get.ts` crée un segment statique `biens` dans le routeur. Pour ne pas dépendre de l'arbitrage entre ce segment et `[resource]/[id]`, `server/api/biens/` reçoit ses routes CRUD explicites (`index.get`, `index.post`, `index.patch`, `count.get`, `[id].get/put/patch/delete`), via `crudRoute('biens', …)`, comme `credits/`. Un test d'API vérifie que `GET /api/biens/{id}` et la sous-route répondent tous les deux.

### 8. Front : rentabilité chargée par les stores, formatage pur dans `app/utils`
- `services/bien.ts` et `services/credit.ts` gagnent chacun une fonction `fetch…Rentabilite`.
- Le store `credit` ajoute `creditRentabilites[IDcredit]`, chargé dans la même boucle que `creditBalances`. La réponse porte `biens`, si bien que la page des crédits n'a pas besoin du store `bien`.
- Le store `bien` ajoute `bienRentabilites[IDbien]`, chargé pour les biens `locatif` par une action distincte, `fetchBienRentabilites()`, appelée par `biens.vue` et après `updateBien`. `fetchBiens` reste une seule requête, car les formulaires d'opération l'appellent pour remplir le champ « Bien ».
- `app/utils/rentabilite.ts` transforme une réponse de rentabilité en lignes d'affichage (réel ou prévu, effort ou cash-flow, ratios omis s'ils sont `null`). Ces fonctions pures sont testées dans `tests/unit/front-rentabilite.spec.ts`. `CreditCard` et `BienCard` se contentent de les afficher.
- `OperationForm` et `OperationRecurrenteForm` affichent un `<select>` « Bien » alimenté par `bienStore.bienList`, chargé à l'ouverture si la liste est vide.
- `BienForm` envoie `LoyerMensuel` (une chaîne vide devient `null`) dans son corps `PUT`/`POST`.

### 9. Bilan depuis l'achat, sur la carte du bien
L'investissement, c'est le bien : le bilan est porté par `GET /api/biens/{id}/rentabilite` et la carte du bien. Le gain total vaut plus-value (`ValeurActuelle − prixTotal`) + loyers nets cumulés − intérêts versés.
- **Les intérêts, pas les mensualités.** Le capital remboursé devient la part du bien détenue par l'emprunteur : il n'est pas une perte, et la plus-value le compte déjà. Cette décomposition vaut « patrimoine net (valeur − restant dû) − argent sorti de sa poche (apport + mensualités + charges − loyers) » dès que `apport + MontantInitial ≈ prixTotal`, sans dépendre de `ApportCash`, souvent approximatif.
- **Les intérêts du bilan sont ceux de `remaining-balance`.** Le calcul d'amortissement quitte la route pour une fonction pure, `server/utils/amortization.ts`, que les deux routes appellent. Le comportement de `remaining-balance` est inchangé et couvert par ses tests d'API existants.
- **`partCreditLoyers` = loyers cumulés ÷ mensualités payées.** Il répond à « combien les locataires ont payé de mon crédit ».
- **Après la fin du crédit**, les intérêts cessent de croître et chaque loyer augmente le gain : aucun traitement particulier n'est nécessaire.
- **Alternative écartée : bilan sur la carte du crédit.** Il disparaît du point de vue du bien, alors que c'est le bien qui porte la plus-value.

### 10. Abattement pour charges : loyer hors charges et couverture
Les loyers sont saisis tels que perçus, charges comprises (loyer + provision). Isoler la provision demanderait de découper chaque opération, ou de classer les opérations par catégorie. `Bien.AbattementCharges` (en %) est un compromis simple : la couverture du crédit (`tauxCouverture`, `partCreditLoyers`) retire cette part des loyers.
- **Appliqué au loyer moyen affiché et à la couverture** (`tauxCouverture`, `partCreditLoyers`) : ces valeurs portent sur le loyer hors charges, comme le loyer attendu.
- **Jamais sur l'argent réellement encaissé.** L'effort, le cash-flow, les loyers nets et le gain total reposent sur l'argent réellement encaissé (provision comprise) et sur les charges payées liées au bien : la provision et les charges s'y compensent déjà. Y appliquer l'abattement compterait les charges deux fois.
- **Pas sur les valeurs attendues**, puisque `LoyerMensuel` est déjà saisi hors charges.
- **Alternatives écartées** : déclarer la provision en euros sur le bien (elle change à chaque régularisation, et il faudrait distinguer la régularisation d'un loyer), stocker la provision sur chaque opération (migration et saisie plus lourdes), classer les remboursements de charges par catégorie (règle jugée trop complexe).
- **La colonne rejoint `0005`**, qui n'est déployée nulle part. Une base de recette où `0005` a déjà été jouée doit être recréée.

### 11. Le crédit ne connaît que loyers et mensualités
La carte du crédit répond à « combien de ma mensualité les loyers paient-ils, et combien reste à ma charge ? ». Les charges du bien (copropriété, taxe foncière, impôt, assurances) n'y entrent pas : elles relèvent du bien (bilan).
- L'effort du crédit vaut `mensualiteMoyenne − loyerMensuelMoyen` (loyers hors charges), si bien que la couverture et la part restant à la charge du propriétaire font 100 %.
- La mensualité moyenne réellement payée est affichée sur la ligne. La carte montre la mensualité actuelle, mais la moyenne sur la location intègre les changements de mensualité et les reports d'échéances : sans elle, l'addition ne tombe pas juste.
- **Alternative écartée : un effort « tout compris »** (mensualités + charges − loyers perçus). Il mélangeait le crédit et le bien, et rendait la ligne incompréhensible face à la couverture.

### 12. Un crédit finance un seul bien
Un crédit est lié à au plus un bien (`Bien.IDcredit` unique parmi les biens). Une première version agrégeait plusieurs biens par crédit (appartement + parking), répartissait intérêts et mensualités au prorata du prix, et appliquait à tous les biens la date de mise en location la plus ancienne : un bien loué plus tard voyait ses entrées antérieures comptées comme des loyers. L'utilisateur ne finance jamais plusieurs biens avec un crédit : la règle est imposée plutôt que gérée.
- **Contrôle côté API** (`assertCreditFree`) : un `IDcredit` déjà porté par un autre bien de l'utilisateur est refusé (409). La recherche est limitée aux biens de l'utilisateur, comme toute lecture du projet, sans compter sur `assertCreditInBody` qui la précède ; le message ne peut donc citer qu'un bien de l'utilisateur, le bien qui le porte pouvant être réenregistré. Le `PATCH` en masse sur les biens est fermé (405), comme pour les crédits : il contournerait ce contrôle.
- **Côté front**, le formulaire de bien ne propose pas un crédit déjà affecté à un autre bien.
- **Pas d'index unique en base** : les références sont contrôlées par l'API dans tout le projet, et les données existantes respectent déjà la règle.

## Risks / Trade-offs

- **[Achat ou apport lié au bien par erreur]** : une sortie de 40 000 € liée au bien deviendrait une charge et ruinerait le cash-flow de la période. → Le libellé du champ dans le formulaire précise « loyers et charges courantes ». Le cumul et la période se recalculent dès que le lien est retiré.
- **[Dépôt de garantie lié au bien]** : il serait compté comme loyer. → Même remède : ne pas le lier. C'est une limite acceptée du classement par signe.
- **[Requêtes N+1 sur la page crédits]** : une requête de rentabilité par crédit s'ajoute à celle du solde restant. → Un utilisateur a quelques crédits. Une route groupée reste possible plus tard sans changer les specs.
- **[Lien `Bien.IDcredit` orphelin]** : avant ce change, supprimer un crédit laissait `Bien.IDcredit` pointer vers un crédit disparu. Le formulaire renvoyait alors cet identifiant et l'API répondait 404, si bien que le bien ne pouvait plus être modifié. → La suppression d'un crédit remet désormais `Bien.IDcredit` à `NULL`, comme pour les opérations. La base de l'utilisateur ne contenait aucun lien orphelin, donc aucune migration de nettoyage n'est nécessaire.
- **[Chevauchement avec `improve-front-reliability`]** : ce change, non commencé, réécrit `OperationForm`, `OperationRecurrenteForm` et `BienForm` (`useEntityForm`) et remplace les `formatAmount` dupliqués. → Les ajouts de ce change restent localisés (un `<select>`, un champ, un bloc de carte). Le change livré en second adapte ces ajouts, sans changer les specs.
- **[Historique incomplet]** : le bilan suppose que tous les loyers et charges depuis le début sont liés au bien, et que toutes les mensualités sont saisies avec leur `IDcredit`. Un crédit créé dans l'application après le début du prêt sous-estime les intérêts et surestime `partCreditLoyers`. → Le README le signale. Les loyers passés se lient en masse par `PATCH /api/operations`.
- **[Fuseau]** : un loyer passé le 1er du mois à 00:30 heure locale tombe la veille en UTC. → Même convention que `remaining-balance`. Les opérations saisies sont datées à minuit UTC.

## Migration Plan

1. `server/db/migrations/0005_bien_rental_income.sql`, rejouable, sans commentaire SQL (la justification va dans le message de commit et la MR) :
   - `ALTER TABLE Operation ADD COLUMN IF NOT EXISTS IDbien INT NULL, ADD INDEX IF NOT EXISTS idx_operation_idbien (IDbien)` ;
   - `ALTER TABLE OperationRecurrente ADD COLUMN IF NOT EXISTS IDbien INT NULL` ;
   - `ALTER TABLE Bien ADD COLUMN IF NOT EXISTS LoyerMensuel DECIMAL(12,2) NULL`.
2. Déploiement : `pnpm db:migrate` sur la base, puis démarrage de la nouvelle image. Les colonnes étant nullables et additives, l'image précédente fonctionne encore sur le schéma migré.
3. Rollback : redéployer l'image précédente. Les colonnes peuvent rester (elles sont ignorées), et aucune donnée existante n'est modifiée.
4. Après déploiement : lier la récurrente « Loyer » au bien depuis son formulaire. Les opérations de loyer passées peuvent être liées une à une, ou en masse par `PATCH /api/operations` avec un filtre sur `NomOp`.
