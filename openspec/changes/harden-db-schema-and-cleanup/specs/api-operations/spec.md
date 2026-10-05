## MODIFIED Requirements

### Requirement: Virement entre comptes
`POST /api/operations/transfert` SHALL accepter `{ fromCompte, toCompte, montant, DateOp, NomOp, IDcat }`, avec :
- `montant > 0` ;
- `fromCompte ≠ toCompte` ;
- `IDcat` obligatoire, appliqué aux deux opérations.

Le serveur MUST vérifier que les deux comptes appartiennent à l'utilisateur et que la catégorie lui est accessible (catégorie de l'utilisateur ou partagée, `IDuser = 0`), avec 404 sinon. Il crée ensuite, dans une même transaction, une opération de `-montant` sur `fromCompte` et une opération de `+montant` sur `toCompte`, puis renvoie les deux. Si l'une des créations échoue, la transaction MUST être annulée, de sorte qu'aucun virement à moitié enregistré ne subsiste.

#### Scenario: Virement valide
- **WHEN** l'utilisateur vire 100 € de son compte A vers son compte B avec la catégorie 25
- **THEN** une opération de -100 € sur A et une de +100 € sur B, toutes deux en catégorie 25, sont créées et renvoyées

#### Scenario: Catégorie manquante
- **WHEN** le corps ne contient pas `IDcat`
- **THEN** la réponse est 400 et aucune opération n'est créée

#### Scenario: Compte destinataire d'autrui
- **WHEN** `toCompte` appartient à un autre utilisateur
- **THEN** la réponse est 404 et aucune opération n'est créée

#### Scenario: Échec du crédit
- **WHEN** la création de l'opération créditrice échoue
- **THEN** la transaction est annulée, aucune opération n'est persistée et la réponse est une erreur
