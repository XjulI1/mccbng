## Why

L'audit du 2026-10-05 montre que plusieurs calculs produisent des données financières fausses, de façon silencieuse et persistante.
- Les opérations récurrentes ignorent le jour et le mois choisis par l'utilisateur et dérivent en fin de mois.
- Des appels concurrents doublent les débits.
- Les mensualités continuent après la fin du crédit.
- Le restant dû est mal calculé.
- Les statistiques excluent certains comptes et toutes les dépenses non catégorisées.

Comme ces erreurs s'écrivent en base à chaque ouverture de l'application, leur coût de correction augmente avec le temps.

## What Changes

- **Échéancier des récurrentes** : la prochaine échéance est calculée à partir de `JourNumOpRecu` (mensuel) et `MoisOpRecu` + `JourNumOpRecu` (annuel). Le jour est borné au dernier jour du mois, ce qui supprime la dérive du 31 et du 29 février. `DernierDateOpRecu` ne sert plus qu'à savoir où l'on en est.
- **Idempotence et concurrence** : la génération réserve chaque échéance par un verrou optimiste (`UPDATE … WHERE DernierDateOpRecu = :last`) avant d'insérer l'opération. Deux appels simultanés ne créent donc jamais deux fois la même opération, même sur MyISAM.
- **BREAKING (comportement)** : rattrapage complet. Toutes les échéances dues (dans la fenêtre d'anticipation historique de 15 jours en mensuel et 30 jours en annuel) sont générées en un appel, avec un plafond de sécurité, au lieu d'une seule par appel.
- **Fin de crédit** : aucune mensualité n'est générée pour un crédit dont le `Statut` n'est pas `actif` ou dont l'échéance dépasse `DateFin`.
- **Cohérence crédit ↔ récurrente** :
  - modifier un crédit (montant, compte, catégorie, nom, dates) répercute la modification sur sa récurrente ;
  - la création compense un échec partiel (Credit en InnoDB, récurrente en MyISAM) ;
  - un crédit qui démarre dans le passé ne génère pas de rattrapage rétroactif massif.
- **Restant dû** :
  - seules les sorties (`MontantOp < 0`) datées d'aujourd'hui ou avant sont prises en compte ;
  - les intérêts courent par mois entier écoulé depuis `DateDebut` ;
  - l'arrondi à 2 décimales devient correct.
- **Validation des récurrentes** :
  - `Frequence` ∈ {3, 7} ;
  - `JourNumOpRecu` dans 1-31 ;
  - `MoisOpRecu` dans 0-11, avec 0 par défaut au lieu de 1, qui désignait février.
- **Statistiques et soldes** :
  - un drapeau de compte `NULL` prend sa valeur par défaut (0, ou 1 pour `visible`) au lieu d'exclure le compte ;
  - les sorties non catégorisées comptent comme dépense « Non catégorisé » ;
  - la borne `to` inclut toute la journée et les dates sont validées.
- **Virement atomique** : nouvelle route serveur `POST /api/operations/transfert` qui crée le débit et le crédit en une requête, avec compensation. Le front l'utilise à la place des deux POST successifs.

## Capabilities

### New Capabilities
<!-- aucune -->

### Modified Capabilities
- `api-operations` : auto-génération (échéancier, verrou, rattrapage, fin de crédit), validation des récurrentes, totaux mensuels incluant le non catégorisé, agrégats tolérant les drapeaux NULL, nouvelle route de virement.
- `api-credits-biens` : création et suppression robustes, propagation des modifications, calcul du restant dû.
- `api-stats` : séries de solde tolérant les drapeaux NULL, dépenses non catégorisées, bornes de dates.

## Impact

- **Code serveur** :
  - `server/api/operation-recurrentes/auto-generation.post.ts` ;
  - `server/utils/resources.ts` (récurrentes, crédits) et `server/utils/stats.ts` ;
  - `server/api/credits/[id]/remaining-balance.get.ts` ;
  - `server/api/operations/{sumByUserByMonth,sumCategoriesByUserByMonth,sumAllCompteForUser,sumForACompte}.get.ts` ;
  - nouveau `server/api/operations/transfert.post.ts` ;
  - nouvel utilitaire de calcul d'échéances, testé unitairement.
- **Code front** : `app/stores/operation.ts` (`createTransfert`), et les composants de stats pour afficher « Non catégorisé ».
- **Données** : script de diagnostic (lecture seule) qui liste les récurrentes dont `JourNumOpRecu` diffère du jour de `DernierDateOpRecu`, pour une revue manuelle avant bascule. Aucune migration de schéma n'est requise : la conversion InnoDB et les `NOT NULL` sont dans `harden-db-schema-and-cleanup`.
- **Utilisateurs** : au premier chargement après déploiement, les récurrentes en retard sont rattrapées en une fois, et les dates d'échéance peuvent se recaler sur le jour choisi.
