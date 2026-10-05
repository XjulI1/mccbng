## MODIFIED Requirements

### Requirement: Banques
Les routes `/api/banques` SHALL fournir le CRUD standard de `Banque` (`IDbanque`, `NomBanque`). Les banques restent partagées (sans `IDuser`) : tout utilisateur authentifié MUST pouvoir les lire et en créer. La modification (`PATCH /`, `PATCH /{id}`, `PUT /{id}`) et la suppression (`DELETE /{id}`) MUST être réservées aux administrateurs (`ADMIN_IDUSERS`), sinon 403. La suppression d'une banque référencée par au moins un `Compte` MUST être refusée par 409, sans suppression.

#### Scenario: Liste triée
- **WHEN** le front appelle `GET /api/banques?filter={"order":"NomBanque ASC"}`
- **THEN** les banques sont renvoyées triées par nom

#### Scenario: Renommage en masse par un utilisateur
- **WHEN** un utilisateur non administrateur appelle `PATCH /api/banques` avec `{ "NomBanque": "x" }`
- **THEN** la réponse est 403 et aucune banque n'est modifiée

#### Scenario: Suppression d'une banque utilisée
- **WHEN** un administrateur appelle `DELETE /api/banques/{id}` sur une banque référencée par un compte
- **THEN** la réponse est 409 et la banque est conservée

#### Scenario: Création par un utilisateur
- **WHEN** un utilisateur non administrateur appelle `POST /api/banques`
- **THEN** la banque est créée
