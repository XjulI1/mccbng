## MODIFIED Requirements

### Requirement: CRUD des opérations par compte
Les routes `/api/operations` SHALL fournir le CRUD standard d'`Operation` avec scoping hérité (`IDcompte ∈ comptes de l'utilisateur`). La création et le remplacement MUST vérifier que l'`IDcompte` appartient à l'utilisateur (404 sinon). Les défauts `CheckOp=false`, `IDcat=0`, `amortissement=false` MUST être conservés. Le filtre doit supporter la pagination (`limit`/`skip`), l'ordre `CheckOp ASC, DateOp DESC`, et la recherche transverse couplée à `IDcompte inq` : `like` échappé sur `NomOp`, et, lorsque le terme saisi est un nombre (virgule acceptée), comparaison de `MontantOp` en valeur absolue : plage `[x ; x+1[` pour un entier, égalité exacte (`inq: [x, -x]`) pour un décimal.

#### Scenario: Pointage
- **WHEN** `PATCH /api/operations/{id}` met `CheckOp` à `true` sur une opération de l'utilisateur
- **THEN** la réponse est 204 et la valeur est persistée

#### Scenario: Recherche transverse
- **WHEN** le front cherche « loyer » sur tous ses comptes
- **THEN** seules les opérations de ses comptes dont le nom contient « loyer » sont renvoyées

#### Scenario: Recherche par montant décimal
- **WHEN** le front cherche « 12,5 » et que l'utilisateur a des opérations de -12,50 €, 12,50 €, 112,50 € et 12,55 €
- **THEN** seules les opérations de -12,50 € et 12,50 € sont renvoyées par la comparaison de montant

#### Scenario: Recherche par montant entier
- **WHEN** le front cherche « 12 » et que l'utilisateur a des opérations de -12,99 €, 12,00 €, 12,49 €, 13,00 €, 112,00 € et 1 200,00 €
- **THEN** seules les opérations de -12,99 €, 12,00 € et 12,49 € sont renvoyées par la comparaison de montant

#### Scenario: Recherche avec caractère joker
- **WHEN** le front recherche le libellé `100%`
- **THEN** seules les opérations dont le nom contient littéralement `100%` sont renvoyées
