## MODIFIED Requirements

### Requirement: Banques
Les routes `/api/banques` SHALL fournir la lecture (`GET /`, `GET /{id}`) et la création (`POST /`) de `Banque` (`IDbanque`, `NomBanque`). Les banques restent partagées (sans `IDuser`) : tout utilisateur authentifié MUST pouvoir les lire et en créer. La modification (`PATCH /`, `PATCH /{id}`, `PUT /{id}`) et la suppression (`DELETE /{id}`) MUST NOT être exposées par l'API : ces requêtes MUST être refusées (404 ou 405 au format d'erreur uniforme) sans rien modifier. Ces opérations se font directement en base par l'exploitant.

#### Scenario: Liste triée
- **WHEN** le front appelle `GET /api/banques?filter={"order":"NomBanque ASC"}`
- **THEN** les banques sont renvoyées triées par nom

#### Scenario: Renommage en masse
- **WHEN** un utilisateur authentifié appelle `PATCH /api/banques` avec `{ "NomBanque": "x" }`
- **THEN** la requête est refusée et aucune banque n'est modifiée

#### Scenario: Suppression
- **WHEN** un utilisateur authentifié appelle `DELETE /api/banques/{id}`
- **THEN** la requête est refusée et la banque est conservée

#### Scenario: Création par un utilisateur
- **WHEN** un utilisateur authentifié appelle `POST /api/banques`
- **THEN** la banque est créée
