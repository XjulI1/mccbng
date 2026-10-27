## ADDED Requirements

### Requirement: Plafond d'un compte
Un `Compte` SHALL porter un champ facultatif `Plafond` (`DECIMAL(12,2)`, `null` par défaut), renvoyé comme nombre JSON. `POST`, `PATCH` et `PUT /api/comptes` MUST accepter un nombre positif ou nul, ou `null` pour l'effacer, et MUST refuser une valeur négative (422). Un `PUT` qui omet `Plafond` MUST le conserver. Le plafond est indicatif : il MUST NOT modifier un solde ni une statistique, et un solde au-delà du plafond reste accepté.

#### Scenario: Plafond d'un livret
- **WHEN** `PATCH /api/comptes/{id}` est appelé avec `{ "Plafond": "22950" }`
- **THEN** la réponse est 204 et `GET /api/comptes/{id}` renvoie `Plafond: 22950`

#### Scenario: Plafond négatif
- **WHEN** `POST /api/comptes` ou `PATCH /api/comptes/{id}` est appelé avec `Plafond: -1`
- **THEN** la réponse est 422 et rien n'est modifié

#### Scenario: PUT d'une ancienne version du front
- **WHEN** `PUT /api/comptes/{id}` est appelé sans `Plafond` sur un compte dont le plafond vaut 22950
- **THEN** le plafond vaut toujours 22950

#### Scenario: Effacement
- **WHEN** `PUT /api/comptes/{id}` est appelé avec `Plafond: null`
- **THEN** le compte n'a plus de plafond
