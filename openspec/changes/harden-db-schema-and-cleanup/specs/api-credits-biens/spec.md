## MODIFIED Requirements

### Requirement: Création d'un crédit et de sa récurrente
À la création d'un crédit, le serveur SHALL créer une `OperationRecurrente` mensuelle nommée `Mensualité <NomCredit>` (`MontantOpRecu = MontantMensuel`, `JourOpRecu=1`, `JourNumOpRecu` = jour de `DateDebut`, `MoisOpRecu` = mois de `DateDebut` (indexé 0), `Frequence=3`, `IDcompte`, `IDcat`, `IDcredit`), puis renseigner `Credit.IDopRecu` avec son identifiant. `DernierDateOpRecu` MUST être initialisé à l'échéance théorique qui précède la première échéance postérieure ou égale à `max(aujourd'hui, DateDebut)`. Ainsi, la première mensualité d'un crédit futur est celle de `DateDebut`, et aucune mensualité passée n'est générée rétroactivement. Ces écritures MUST s'exécuter dans une même transaction : tout échec MUST laisser la base sans crédit ni récurrente.

#### Scenario: Création d'un crédit futur
- **WHEN** un crédit de 1 000 € / mois démarrant le 15 mars de l'année suivante est créé
- **THEN** une récurrente `Mensualité <nom>` liée existe avec `JourNumOpRecu=15` et `DernierDateOpRecu` au 15 février, le crédit pointe vers elle, et la première mensualité générée est datée du 15 mars

#### Scenario: Crédit démarré dans le passé
- **WHEN** un crédit démarrant le 10 janvier 2022 est créé le 5 octobre 2026
- **THEN** `DernierDateOpRecu` vaut le 10 septembre 2026 et l'auto-génération suivante ne crée que la mensualité du 10 octobre 2026, aucune antérieure

#### Scenario: Échec partiel
- **WHEN** la mise à jour de `Credit.IDopRecu` échoue après la création de la récurrente
- **THEN** la transaction est annulée : ni le crédit ni la récurrente ne sont persistés
