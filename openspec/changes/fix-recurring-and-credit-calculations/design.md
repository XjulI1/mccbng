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

Contraintes :
- `Operation` et `OperationRecurrente` sont en MyISAM tant que `harden-db-schema-and-cleanup` n'est pas déployé : aucune solution ne doit dépendre des transactions.
- Le front appelle la génération à chaque chargement (`app/stores/compte.ts`).

## Goals / Non-Goals

**Goals :**
- Un échéancier déterministe et testable unitairement, indépendant de l'horloge et du nombre d'appels.
- Aucune opération générée en double, quel que soit le nombre d'appels concurrents.
- Un restant dû cohérent avec un tableau d'amortissement mensuel.
- Des statistiques qui ne perdent aucune sortie d'argent.

**Non-Goals :**
- Le passage des montants en `DECIMAL` et des drapeaux en `NOT NULL` : couverts par `harden-db-schema-and-cleanup`. Ce change doit fonctionner avant comme après.
- La recherche, la suggestion de catégories et la pagination : couvertes par `harden-db-schema-and-cleanup` et `improve-front-reliability`.
- Les fréquences autres que mensuelle et annuelle.

## Decisions

### D1. Fonction pure `nextDueDate(rec, after)`
Un module `server/utils/schedule.ts` expose `nextDueDate({ Frequence, JourNumOpRecu, MoisOpRecu }, after: Date): Date`. La fonction travaille en dates UTC à minuit.
- **Mensuel** (`Frequence = 3`) : l'échéance tombe dans le mois qui suit celui de `after`, au jour `min(JourNumOpRecu, joursDuMois)`.
- **Annuel** (`Frequence = 7`) : l'échéance tombe l'année qui suit celle de `after`, au mois `MoisOpRecu`, au jour `min(JourNumOpRecu, joursDuMois)`.

Raisonner sur le mois ou l'année *suivants*, et non sur « la plus petite échéance postérieure à `after` », évite qu'une récurrente déjà décalée (dernière date au 3, jour choisi le 25) génère une seconde opération dans le même mois au moment de la bascule.
- *Alternative* : stocker une colonne `ProchaineEcheance`. On l'écarte, car elle demande une migration de schéma et elle est redondante avec cette fonction.

### D2. Réservation par verrou optimiste, puis insertion
Pour chaque récurrente, en boucle :
1. Calculer `next = nextDueDate(rec, last)`.
2. Arrêter si `next > today + anticipation`, avec une anticipation de 15 jours en mensuel et 30 jours en annuel. Cela conserve le comportement historique, qui générait environ 15 jours à l'avance.
3. Exécuter `UPDATE OperationRecurrente SET DernierDateOpRecu = :next WHERE IDopRecu = :id AND DernierDateOpRecu = :last`.
4. Si `affectedRows = 0`, un autre appel a réservé cette échéance : arrêter pour cette récurrente.
5. Sinon, insérer l'`Operation` datée de `next`. Si l'insertion échoue, remettre `DernierDateOpRecu = :last` (compensation) puis journaliser.

La boucle est plafonnée à 24 itérations par récurrente et par appel, pour qu'une donnée aberrante ne déclenche pas une génération sans fin.

On réserve avant d'insérer parce que, sans transaction, l'ordre inverse (insérer puis mettre à jour) laisse une fenêtre où deux appels insèrent la même échéance. Le pire cas devient une échéance réservée mais non insérée après un crash, ce qui est préférable à un doublon, et se voit dans les logs.
- *Alternatives* :
  - `GET_LOCK('recu_<IDuser>')` : simple, mais lié à la connexion du pool, avec un risque de verrou fantôme si la connexion est réutilisée.
  - Une contrainte unique `(IDopRecu, DateOp)` sur `Operation` : c'est la meilleure solution une fois en InnoDB, mais elle exige d'ajouter une colonne `IDopRecu` à `Operation`. On la laisse en question ouverte.

### D3. Fin de crédit
La requête de sélection joint `Credit` à gauche. Une récurrente dont l'`IDcredit` est renseigné est ignorée si `Credit.Statut <> 'actif'`, ou arrêtée dès que `next > Credit.DateFin`. Une récurrente orpheline, dont l'`IDcredit` pointe sur un crédit inexistant, est ignorée et journalisée.

### D4. Création d'un crédit
- Avant InnoDB, on insère `Credit`, puis la récurrente, puis on met à jour `Credit.IDopRecu`.
- En cas d'erreur après l'insertion de la récurrente, un `catch` supprime explicitement la récurrente. La transaction annule le `Credit`.
- Après InnoDB, la transaction suffit et le `catch` devient inoffensif.

`DernierDateOpRecu` est initialisé à la dernière échéance théorique antérieure ou égale à aujourd'hui, ou à la veille de `DateDebut` si le crédit commence dans le futur. Il n'y a pas de rattrapage rétroactif : les mensualités passées d'un crédit saisi a posteriori sont généralement déjà en base, importées ou saisies. La suppression supprime la récurrente avant le crédit, dans la même logique de compensation.

### D5. Propagation des modifications
Un hook `onUpdate` sur `creditResource`, déclenché par `PUT` et `PATCH /{id}`, répercute sur la récurrente liée (`IDopRecu`) :
- `MontantMensuel` vers `MontantOpRecu` ;
- `IDcompte`, `IDcat` ;
- `NomCredit` vers `NomOpRecu = "Mensualité <nom>"` ;
- le jour de `DateDebut` vers `JourNumOpRecu`.

Les opérations déjà générées ne sont pas modifiées. Le `PATCH` en masse des crédits est refusé (422), car la propagation n'a pas de sens sur une sélection.

### D6. Restant dû
On repart de `solde = MontantInitial` et `cursor = DateDebut`. Pour chaque opération liée au crédit telle que `MontantOp < 0` et `DateOp ≤ aujourd'hui`, triée par `DateOp ASC` :
1. `mois = max(0, nombre de mois entiers entre cursor et DateOp)` ;
2. `interet = solde × taux × mois` ;
3. le paiement couvre `interet`, puis réduit `solde`, borné à `[0, solde]` ;
4. `cursor` avance de `mois` mois.

Arrondi final par `round2(x) = Math.round((x + Number.EPSILON) × 100) / 100`, mutualisé dans `server/utils/money.ts`.
- Écarté : la formule d'annuité théorique, parce qu'elle ignore les remboursements anticipés.

### D7. Drapeaux NULL et non catégorisé
- **Drapeaux** : dans le SQL, `COALESCE(bloque,0)`, `COALESCE(retraite,0)`, `COALESCE(children,0)`, `COALESCE(porte_feuille,0)` et `COALESCE(visible,1)`, partout où ces drapeaux filtrent.
- **Dépenses non catégorisées** : une opération dont `IDcat` vaut 0, `NULL` ou une catégorie inexistante, et dont `MontantOp < 0`, est comptée comme dépense dans les totaux, le camembert, le top et la heatmap, sous un pseudo-libellé `Non catégorisé` (`IDcat = 0`). Une entrée non catégorisée n'est comptée ni en revenu ni en dépense.
- *Alternative* : exiger une catégorie à la saisie. C'est souhaitable côté UX, mais cela ne corrige pas l'historique.

### D8. Dates des stats
`from` et `to` sont validés par Zod au format `YYYY-MM-DD` ; une date invalide donne 400. Le filtre devient `DateOp >= :from AND DateOp < :to + 1 jour`.

### D9. Virement
`POST /api/operations/transfert` reçoit `{ fromCompte, toCompte, montant > 0, DateOp, NomOp, IDcatDebit?, IDcatCredit? }`.
- Il vérifie la propriété des deux comptes (et `fromCompte ≠ toCompte`) et des catégories.
- Il insère le débit puis le crédit. Si le crédit échoue, le débit est supprimé (compensation).
- Il renvoie les deux opérations.

Le front remplace les deux POST de `createTransfert` par cet appel.

## Risks / Trade-offs

- [Recalage des dates sur `JourNumOpRecu` pour les récurrentes dont ce champ n'a jamais été renseigné volontairement (valeur 1 par défaut)] → Script de diagnostic avant bascule. L'utilisateur corrige `JourNumOpRecu` des récurrentes listées, ou une migration ponctuelle aligne `JourNumOpRecu` sur le jour de `DernierDateOpRecu` pour celles qu'il désigne.
- [Rattrapage massif au premier appel après une longue absence] → Plafond de 24 échéances par appel. Chaque opération générée est datée de son échéance réelle.
- [Échéance réservée mais non insérée (crash entre UPDATE et INSERT)] → Compensation en cas d'erreur applicative et log d'erreur. Le cas résiduel (crash du processus) se rattrape à la main.
- [Changement visible des totaux de dépense, avec l'ajout du « Non catégorisé »] → À annoncer dans les notes de version. Le libellé est explicite dans les graphiques.
- [La sémantique `dispo` (bloque = 0 sans exclure children ni retraite) reste ambiguë] → Inchangée ici, consignée dans les questions ouvertes.

## Migration Plan

1. Exécuter le script de diagnostic des récurrentes en production et faire la revue avec l'utilisateur.
2. Déployer la génération avec D1 à D3. Vérifier en staging, avec deux onglets ouverts simultanément, qu'aucun doublon n'apparaît.
3. Déployer D4 à D9.
4. Rollback : redéployer l'image précédente. Les données générées entre-temps sont correctes, l'ancienne logique reprend simplement à partir de `DernierDateOpRecu`.

## Open Questions

- Pour un crédit saisi a posteriori : rattrapage rétroactif ou non (D4, choix par défaut : non) ? Faut-il une option à la création ?
- Faut-il ajouter `Operation.IDopRecu` et une contrainte unique `(IDopRecu, DateOp)` une fois en InnoDB ?
- Définition attendue de `dispo` (B8 de l'audit) : faut-il exclure `children` et `retraite` comme `global` ?
- Les opérations générées dans le futur (anticipation de 15 jours) doivent-elles rester comptées dans le solde non pointé ?
