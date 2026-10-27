## Why

Un livret réglementé (livret A, LDDS…) a un plafond de versement. L'application n'en garde aucune trace : pour savoir s'il reste de la marge, il faut se rappeler le plafond et faire le calcul à la main.

Change rédigé après coup : la fonctionnalité a été livrée par les commits `492236b` et `c4ccdc9` sans passer par OpenSpec. Il ne sert qu'à mettre les specs à jour.

## What Changes

- **Colonne** : migration `0006_compte_plafond` ajoute `Compte.Plafond` (`DECIMAL(12,2)`, `NULL` par défaut), un montant indicatif qui n'entre dans aucun solde ni aucune statistique.
- **API** : `Plafond` est accepté par `POST`/`PATCH`/`PUT /api/comptes` (nombre ≥ 0 ou `null`, 422 sinon). Un `PUT` qui l'omet le conserve, pour ne pas l'effacer depuis une ancienne version de la PWA.
- **Front** :
  - champ « Plafond (optionnel) » dans le formulaire de compte (vide ou 0 = pas de plafond, arrondi au centime) ;
  - sur l'en-tête du compte ouvert, le pourcentage du plafond utilisé à côté du nom du compte et une jauge sous les soldes, avec la marge restante (ou le dépassement) en info-bulle.

## Capabilities

### New Capabilities
- `front-comptes` : plafond d'un compte dans le formulaire et sur l'en-tête du compte ouvert.

### Modified Capabilities
- `api-referentiel` : champ `Plafond` d'un compte.

## Impact

- `server/db/migrations/0006_compte_plafond.sql`, `server/db/schema.ts`, `server/utils/resources.ts`
- `app/components/CompteForm.vue`, `app/components/AccountHeader.vue`, `app/utils/plafond.ts`
- Tests : `tests/api/referentiel.spec.ts`, `tests/unit/front-plafond.spec.ts`
