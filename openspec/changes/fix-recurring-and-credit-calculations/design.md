## Context

L'audit du 2026-10-05 a relevé les constats suivants, dans la section « données faussées » et dans les points métier associés :

| Réf. audit | Constat |
|---|---|
| D-H1 | `auto-generation.post.ts` ignore `JourNumOpRecu` et `MoisOpRecu` : il calcule `DernierDateOpRecu` + 1 mois (ou + 1 an) à partir de la date de création |
| D-H2 | `setUTCMonth(+1)` sans borner le jour : 31/01 → 03/03 → 03/04… ; 29/02 → 01/03 indéfiniment |
| D-H3 | Aucune idempotence : appel sans `await` à chaque chargement, tables MyISAM, donc les onglets concurrents doublent les débits |
| D-H4 | Mensualités générées après `DateFin` ou avec `Statut ≠ 'actif'` |
| D-M2 | Création d'un crédit non atomique (Credit InnoDB, récurrente MyISAM) : une récurrente orpheline continue de débiter |
| D-M3 | `PUT`/`PATCH` d'un crédit ne mettent pas à jour sa récurrente |
| D-M4 | Crédit démarrant dans le passé : une seule échéance rattrapée par connexion |
| D-M5 | Restant dû : `Math.abs` sur les montants positifs, intérêts comptés par paiement et non par mois, échéances futures déjà déduites |
| D-M6 | Drapeaux de compte `NULL`, d'où des comptes exclus de `soldeGlobal`, de la série `global`, de `dispo` et de `visible` |
| D-M11 | Sorties non catégorisées (`IDcat = 0`, notamment les mensualités) absentes des totaux de dépense |
| D-B1 | Borne `to` des stats à minuit, dates invalides acceptées |
| D-B2 | `MoisOpRecu` à 1 par défaut (février), `Frequence` et `JourNumOpRecu` non bornés |
| D-B9 | `Math.round(x*100)/100` arrondit mal (1,005 donne 1) ; `SUM` de FLOAT sans arrondi |
| D-B10 / F-M12 | Virement en deux POST côté front, sans atomicité |
| B8 | Sémantique de `dispo` ambiguë (`bloque = 0` sans exclure `children` ni `retraite`) |

Contraintes :
- `Operation` et `OperationRecurrente` sont en MyISAM tant que `harden-db-schema-and-cleanup` n'est pas déployé : aucune solution ne doit dépendre des transactions.
- Le front appelle la génération à chaque chargement (`app/stores/compte.ts`).
- Le formulaire des récurrentes envoie `DernierDateOpRecu = new Date()` et `MoisOpRecu = 1` à la création (`app/components/OperationRecurrenteForm.vue`).

## Goals / Non-Goals

**Goals :**
- Un échéancier déterministe et testable unitairement, indépendant de l'horloge et du nombre d'appels.
- Aucune opération générée en double, quel que soit le nombre d'appels concurrents.
- Aucune première échéance perdue à la création d'une récurrente ou d'un crédit.
- Un restant dû cohérent avec un tableau d'amortissement mensuel.
- Des statistiques qui ne perdent aucune sortie d'argent.
- Un crédit seule source de vérité pour sa récurrente de mensualité.

**Non-Goals :**
- Le passage des montants en `DECIMAL` et des drapeaux en `NOT NULL` : couverts par `harden-db-schema-and-cleanup`. Ce change doit fonctionner avant comme après.
- La recherche, la suggestion de catégories et la pagination : couvertes par `harden-db-schema-and-cleanup` et `improve-front-reliability`.
- Les fréquences autres que mensuelle et annuelle.
- Le rattrapage rétroactif des mensualités d'un crédit saisi a posteriori.
- Une colonne `Operation.IDopRecu` et une contrainte unique `(IDopRecu, DateOp)` : le verrou optimiste (D2) suffit.

## Decisions

### D1. Fonctions pures d'échéancier
Un module `server/utils/schedule.ts` expose trois fonctions sur `rec = { Frequence, JourNumOpRecu, MoisOpRecu }`, en dates UTC à minuit. Dans toutes, le jour vaut `min(JourNumOpRecu, joursDuMois)`.
- `nextDueDate(rec, after)` : l'échéance de la période qui suit celle de `after`.
  - **Mensuel** (`Frequence = 3`) : le mois qui suit celui de `after`.
  - **Annuel** (`Frequence = 7`) : l'année qui suit celle de `after`, au mois `MoisOpRecu`.
- `prevDueDate(rec, due)` : l'échéance de la période qui précède celle de `due` (le mois précédent, ou l'année précédente au mois `MoisOpRecu`). Elle vérifie `nextDueDate(rec, prevDueDate(rec, due)) = due` pour toute échéance `due`.
- `firstDueOnOrAfter(rec, date)` : la plus petite échéance théorique ≥ `date`.

Raisonner sur le mois ou l'année *suivants* dans `nextDueDate`, et non sur « la plus petite échéance postérieure à `after` », évite qu'une récurrente déjà décalée (dernière date au 3, jour choisi le 25) génère une seconde opération dans le même mois au moment de la bascule.

Cette règle impose de ne jamais initialiser `DernierDateOpRecu` à une date quelconque, sinon la première échéance est sautée. Par exemple, une récurrente au jour 25 créée le 5 octobre avec `DernierDateOpRecu` = 5 octobre aurait sa première échéance le 25 novembre. D'où la règle d'initialisation :

> `DernierDateOpRecu = prevDueDate(rec, firstDueOnOrAfter(rec, max(aujourd'hui, début)))`

`début` vaut `DateDebut` pour un crédit, et aujourd'hui pour une récurrente simple. C'est le serveur qui l'applique, à la création (D4, D5 bis) et lors d'un report de `DateDebut` (D5). La valeur de `DernierDateOpRecu` reçue à la création est ignorée.
- *Alternative* : stocker une colonne `ProchaineEcheance`. On l'écarte, car elle demande une migration de schéma et elle est redondante avec ces fonctions.
- *Alternative* : passer `nextDueDate` à « la plus petite échéance > `after` ». On l'écarte, car elle réintroduit le double débit dans le mois pour les récurrentes décalées.

### D2. Réservation par verrou optimiste, puis insertion
Pour chaque récurrente, en boucle :
1. Calculer `next = nextDueDate(rec, last)`.
2. Arrêter si `next > today + anticipation`, avec une anticipation de 15 jours en mensuel et 30 jours en annuel. Cela conserve le comportement historique, qui générait environ 15 jours à l'avance.
3. Exécuter `UPDATE OperationRecurrente SET DernierDateOpRecu = :next WHERE IDopRecu = :id AND DernierDateOpRecu = :last`.
4. Si `affectedRows = 0`, un autre appel a réservé cette échéance : arrêter pour cette récurrente.
5. Sinon, insérer l'`Operation` datée de `next`. Si l'insertion échoue, compenser par `UPDATE … SET DernierDateOpRecu = :last WHERE IDopRecu = :id AND DernierDateOpRecu = :next`, puis journaliser. La condition sur `:next` empêche d'écraser une réservation faite entre-temps par un autre appel.

La boucle est plafonnée à 24 itérations par récurrente et par appel, pour qu'une donnée aberrante ne déclenche pas une génération sans fin.

On réserve avant d'insérer parce que, sans transaction, l'ordre inverse (insérer puis mettre à jour) laisse une fenêtre où deux appels insèrent la même échéance. Le pire cas devient une échéance réservée mais non insérée après un crash, ce qui est préférable à un doublon, et se voit dans les logs.

La comparaison `DernierDateOpRecu = :last` suppose que la valeur lue revienne à l'identique à l'écriture. `:last` est donc renvoyé tel qu'il a été lu (même fuseau mysql2, heure comprise), et non recalculé à partir d'une date normalisée. Un test vérifie le cas d'une valeur historique qui porte une heure (le front envoyait `new Date()`).
- *Alternatives écartées* :
  - `GET_LOCK('recu_<IDuser>')` : simple, mais lié à la connexion du pool, avec un risque de verrou fantôme si la connexion est réutilisée.
  - Une contrainte unique `(IDopRecu, DateOp)` sur `Operation` : elle exige d'ajouter une colonne `IDopRecu` à `Operation`, et le verrou optimiste suffit.

### D3. Fin de crédit
La requête de sélection joint `Credit` à gauche. Une récurrente dont l'`IDcredit` est renseigné est ignorée si `Credit.Statut <> 'actif'`, ou arrêtée dès que `next > Credit.DateFin`. Une récurrente orpheline, dont l'`IDcredit` pointe sur un crédit inexistant, est ignorée et journalisée.

### D4. Création d'un crédit
- Avant InnoDB, on insère `Credit`, puis la récurrente, puis on met à jour `Credit.IDopRecu`.
- En cas d'erreur après l'insertion de la récurrente, un `catch` supprime explicitement la récurrente. La transaction annule le `Credit`.
- Après InnoDB, la transaction suffit et le `catch` devient inoffensif.

`DernierDateOpRecu` est initialisé selon la règle de D1, avec `début = DateDebut` :
- crédit futur démarrant le 15 mars : `firstDueOnOrAfter` donne le 15 mars, donc `DernierDateOpRecu` = 15 février, et la première mensualité est celle du 15 mars ;
- crédit démarré le 10 janvier 2022 et saisi le 5 octobre 2026 : `firstDueOnOrAfter` donne le 10 octobre, donc `DernierDateOpRecu` = 10 septembre 2026.

Il n'y a pas de rattrapage rétroactif : les mensualités passées d'un crédit saisi a posteriori sont généralement déjà en base, importées ou saisies. Le restant dû (D6) n'est juste que si ces opérations portent l'`IDcredit` du crédit. La suppression supprime la récurrente avant le crédit, dans la même logique de compensation.

### D5. Propagation des modifications d'un crédit
Un hook `onUpdate` sur `creditResource`, déclenché par `PUT` et `PATCH /{id}`, répercute sur la récurrente liée (`IDopRecu`) :
- `MontantMensuel` vers `MontantOpRecu` ;
- `IDcompte`, `IDcat` ;
- `NomCredit` vers `NomOpRecu = "Mensualité <nom>"` ;
- le jour de `DateDebut` vers `JourNumOpRecu`.

Seuls les champs **réellement modifiés** sont propagés : sur les données réelles, une mensualité peut tomber un autre jour que `DateDebut` (crédit signé le 28, prélevé le 5), et modifier seulement le montant ne doit pas déplacer le jour. La mensualité est retrouvée par `IDopRecu`, ou à défaut par `IDcredit` (liens `IDopRecu` historiques cassés en production) ; la suppression d'un crédit supprime de même sa mensualité par `IDopRecu` ou `IDcredit`.

Si `DateDebut` change **et** que le crédit n'a encore généré aucune mensualité, c'est-à-dire si `DernierDateOpRecu` est antérieure à l'**ancienne** `DateDebut`, `DernierDateOpRecu` est recalculé selon la règle de D1 avec la nouvelle `DateDebut`. Sinon, seul `JourNumOpRecu` change, ce qui évite un trou ou un doublon dans les mensualités déjà générées.

Les opérations déjà générées ne sont pas modifiées. Le `PATCH` en masse des crédits est refusé (405, action retirée de la ressource), car la propagation n'a pas de sens sur une sélection.

### D5 bis. Récurrente liée à un crédit en lecture seule
Le crédit est la seule source de vérité de sa mensualité. Sur `/api/operation-recurrentes` :
- `PUT`, `PATCH /{id}` et `DELETE /{id}` sur une récurrente dont `IDcredit` n'est pas `NULL` répondent **409** (`Recurring operation <id> is managed by credit <IDcredit>`) ;
- `IDcredit` n'est plus accepté dans le corps d'un `POST`/`PUT`/`PATCH` (seul le serveur le pose, en D4) ;
- le `PATCH` en masse n'affecte que les récurrentes sans `IDcredit` ;
- à la création d'une récurrente simple, `DernierDateOpRecu` est fixé par le serveur (D1).

Le front désactive l'édition et la suppression de ces récurrentes et renvoie vers le crédit.
- *Écarté* : la synchronisation dans les deux sens (récurrente → crédit), plus complexe et sujette aux boucles.

### D6. Restant dû
On repart de `solde = MontantInitial` et `cursor = mois(DateDebut)`, où `mois(d) = année(d) × 12 + mois(d)`. Pour chaque opération liée au crédit telle que `MontantOp < 0` et `DateOp ≤ aujourd'hui`, triée par `DateOp ASC` :
1. `n = max(0, mois(DateOp) − cursor)` : le nombre de mois **civils** écoulés ;
2. `interet = solde × taux × n`, avec `taux = TauxInteret / 100 / 12` ;
3. le paiement (valeur absolue) couvre `interet`, puis réduit `solde`, borné à `[0, solde]` ;
4. `cursor = max(cursor, mois(DateOp))`.

Compter en mois civils rend le calcul insensible au jour exact du prélèvement (un prélèvement le 9 au lieu du 10 ne fait ni sauter ni doubler un mois). Un second paiement dans le même mois civil donne `n = 0`, donc pas de seconde ligne d'intérêts.

Arrondi final par `round2(x) = Math.round((x + Number.EPSILON) × 100) / 100`, mutualisé dans `server/utils/money.ts`.
- Écarté : la formule d'annuité théorique, parce qu'elle ignore les remboursements anticipés.
- Écarté : le décompte en mois entiers (ancré sur `DateDebut` ou sur le paiement précédent), qui décale les intérêts d'un mois dès qu'un prélèvement change de jour.

### D7. Drapeaux NULL, regroupements et non catégorisé
- **Drapeaux** : dans le SQL, `COALESCE(bloque,0)`, `COALESCE(retraite,0)`, `COALESCE(children,0)`, `COALESCE(porte_feuille,0)` et `COALESCE(visible,1)`, partout où ces drapeaux filtrent. En production, `children` et `joint` sont déjà `NOT NULL DEFAULT 0` ; le `COALESCE` sur `children` est sans effet mais garde la règle uniforme.
- **Regroupements** de `evolutionSolde` :
  - `global` : `retraite = 0 AND children = 0` (inchangé) ;
  - `retraite` : `retraite = 1` (inchangé) ;
  - `dispo` : `retraite = 0 AND children = 0 AND bloque = 0`. C'est un sous-ensemble de `global`. Auparavant, `dispo` valait `bloque = 0` et incluait donc les comptes retraite et enfants non bloqués.
- **Dépenses non catégorisées** : une opération dont `IDcat` vaut 0, `NULL` ou une catégorie inexistante (ou privée d'un autre utilisateur), et dont `MontantOp < 0`, est comptée comme dépense dans les totaux, le camembert, le top et la heatmap, sous un pseudo-libellé `Non catégorisé` (`IDcat = 0`). `topCategories` et `categoryHeatmap` renvoient ce libellé ; `sumCategoriesByUserByMonth` ne renvoie que `IDcat` (contrat inchangé) et le front affiche `Non catégorisé` pour `IDcat = 0`. `incomeVsExpense` (série `expense`) et `topOperations` appliquent la même règle, pour que tous les graphiques donnent le même total de dépenses ; `topOperations` renvoie `IDcat = 0` pour une sortie non catégorisée. Les mensualités de crédit non catégorisées y sont comprises. Une entrée non catégorisée n'est comptée ni en revenu ni en dépense. Les virements ne tombent jamais dans ce cas, car leur catégorie est obligatoire (D9).
- *Alternative* : exiger une catégorie à la saisie. C'est souhaitable côté UX, mais cela ne corrige pas l'historique.

### D8. Dates des stats
`from` et `to` sont validés par Zod au format `YYYY-MM-DD` ; une date invalide donne 400. Le filtre devient `DateOp >= :from AND DateOp < :to + 1 jour`.

### D9. Virement
`POST /api/operations/transfert` reçoit `{ fromCompte, toCompte, montant > 0, DateOp, NomOp, IDcat }`. `IDcat` est **obligatoire** et s'applique aux deux opérations, comme le fait le front aujourd'hui (21 pour un retrait d'espèces, 25 sinon).
- Il vérifie la propriété des deux comptes (et `fromCompte ≠ toCompte`), ainsi que l'accès à la catégorie (catégorie de l'utilisateur, ou partagée avec `IDuser = 0`).
- Il insère le débit puis le crédit. Si le crédit échoue, le débit est supprimé (compensation).
- Il renvoie les deux opérations.

Le front remplace les deux POST de `createTransfert` par cet appel.

### D10. Opérations datées dans le futur
Les échéances générées par anticipation (D2) restent comptées dans `TotalNotChecked` et dans les soldes, comme aujourd'hui : le solde non pointé fait office de solde prévisionnel. Ce comportement est documenté, mais il ne change pas.

## Risks / Trade-offs

- [Recalage des dates sur `JourNumOpRecu` pour les récurrentes dont ce champ n'a jamais été renseigné volontairement (valeur 1 par défaut dans le formulaire)] → `scripts/diagnose-recurrentes.mjs` propose pour chaque récurrente `JourNumOpRecu` = jour de `DernierDateOpRecu` (et `MoisOpRecu` = son mois en annuel). Avec `--apply --ids=…`, il applique la proposition aux récurrentes retenues après revue. Les récurrentes déjà dérivées (31 → 3) se corrigent à la main dans la même revue.
- [Rattrapage massif au premier appel après une longue absence] → Plafond de 24 échéances par appel. Chaque opération générée est datée de son échéance réelle.
- [Échéance réservée mais non insérée (crash entre UPDATE et INSERT)] → Compensation conditionnelle en cas d'erreur applicative et log d'erreur. Le cas résiduel (crash du processus) se rattrape à la main.
- [Aller-retour de `DernierDateOpRecu` non identique (fuseau, heure stockée), qui bloquerait la réservation] → `:last` repris tel quel de la lecture, test dédié.
- [Changement visible des totaux de dépense, avec l'ajout du « Non catégorisé », mensualités comprises] → À annoncer dans les notes de version. Le libellé est explicite dans les graphiques.
- [Changement visible de `soldeDispo` et de la série `dispo` pour les utilisateurs ayant un compte retraite ou enfant non bloqué] → À annoncer dans les notes de version.
- [Récurrentes de crédit devenues non modifiables depuis l'écran des récurrentes] → Message 409 explicite et renvoi vers le crédit dans le front.
- [`soldeGlobal`, `soldeRetraite` et `soldeDispo` lisent la colonne `Compte.solde`] → Vérifié : `Compte.solde` est le solde d'ouverture saisi à la création du compte, et le front (`TimeSeriesEvolutionSoldes.vue`) cumule les séries journalières à partir de lui. Aucun changement.

## Migration Plan

1. Exécuter `scripts/diagnose-recurrentes.mjs` en production (lecture seule), revoir la liste avec l'utilisateur, puis relancer le script avec `--apply --ids=…` pour les récurrentes retenues.
2. Déployer la génération avec D1 à D3. Vérifier en staging, avec deux onglets ouverts simultanément, qu'aucun doublon n'apparaît.
3. Déployer D4 à D10.
4. Rollback : redéployer l'image précédente. Les données générées entre-temps sont correctes, l'ancienne logique reprend simplement à partir de `DernierDateOpRecu`. Les corrections de `JourNumOpRecu` faites par le script restent valides.

## Open Questions

Aucune. Questions tranchées lors de la revue du 2026-10-05 :
- Crédit saisi a posteriori : pas de rattrapage rétroactif, ni d'option à la création (D4).
- `Operation.IDopRecu` et contrainte unique `(IDopRecu, DateOp)` : non, le verrou optimiste suffit (D2).
- Définition de `dispo` : `retraite = 0 AND children = 0 AND bloque = 0` (D7).
- Opérations générées dans le futur : elles restent comptées dans le solde non pointé (D10).
