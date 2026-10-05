## ADDED Requirements

### Requirement: Opérations liées à un crédit cloisonnées
`GET /api/credits/{id}/payments` et `GET /api/credits/{id}/remaining-balance` SHALL ne prendre en compte que les opérations liées au crédit (`IDcredit = id`) **et** appartenant aux comptes de l'utilisateur courant. Une opération d'un autre utilisateur portant le même `IDcredit`, par exemple une donnée antérieure au contrôle de propriété, MUST être ignorée.

#### Scenario: Opération étrangère rattachée au crédit
- **WHEN** une opération d'un compte de B porte l'`IDcredit` d'un crédit de A
- **THEN** elle n'apparaît pas dans `payments` du crédit de A et n'entre pas dans son `remaining-balance`
