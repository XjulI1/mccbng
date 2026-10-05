## MODIFIED Requirements

### Requirement: Agrégats de soldes
`GET /api/operations/sumAllCompteForUser` SHALL renvoyer, par compte, les totaux pointés/non pointés (`TotalNotChecked`, etc.) sans filtre de catégorie ; `GET /api/operations/sumForACompte?id=` SHALL faire de même pour un compte de l'utilisateur (404 si autre utilisateur). Les clés MUST être identiques à l'existant et les totaux MUST être arrondis à 2 décimales. Un drapeau de compte `NULL` MUST être interprété comme sa valeur par défaut (`visible` = 1, autres drapeaux = 0) et ne jamais exclure le compte.

#### Scenario: Solde d'un compte
- **WHEN** `GET /api/operations/sumForACompte?id=3` est appelé sur un compte de l'utilisateur
- **THEN** les totaux pointé et non pointé sont renvoyés, toutes catégories confondues, arrondis à 2 décimales

#### Scenario: Compte avec visible NULL
- **WHEN** un compte de l'utilisateur a `visible = NULL`
- **THEN** il figure dans `sumAllCompteForUser` comme un compte visible

### Requirement: Totaux mensuels de dépenses
`GET /api/operations/sumByUserByMonth?monthNumber&yearNumber&IDCompte` et `GET /api/operations/sumCategoriesByUserByMonth?monthNumber&yearNumber` SHALL considérer les opérations des catégories `Type='depense'` ainsi que les sorties non catégorisées (`MontantOp < 0` avec `IDcat` égal à 0, `NULL` ou inexistant), et ne couvrir que les comptes de l'utilisateur. Dans `sumCategoriesByUserByMonth`, les sorties non catégorisées MUST être regroupées sous `IDcat = 0` avec le libellé `Non catégorisé`. Les entrées non catégorisées MUST être ignorées.

#### Scenario: Exclusion des revenus
- **WHEN** un mois contient des opérations `revenu` et `depense`
- **THEN** seules les `depense` sont additionnées

#### Scenario: Mensualité sans catégorie
- **WHEN** un mois contient une mensualité de crédit de -900 € avec `IDcat = 0`
- **THEN** elle est incluse dans le total dépensé et apparaît sous `Non catégorisé`

### Requirement: Opérations récurrentes
Les routes `/api/operation-recurrentes` SHALL fournir le CRUD standard d'`OperationRecurrente` avec scoping hérité, vérification de propriété de `IDcompte` à la création/remplacement, et défauts `JourNumOpRecu=1`, `MoisOpRecu=0` (janvier, mois indexés à partir de 0), `Frequence=3`, `IDcat=0`. Les valeurs MUST être validées : `Frequence` ∈ {3, 7}, `JourNumOpRecu` entier de 1 à 31, `MoisOpRecu` entier de 0 à 11 ; une valeur hors bornes MUST produire 4xx sans écriture.

#### Scenario: Récurrente sur compte d'autrui
- **WHEN** `POST /api/operation-recurrentes` référence le compte d'un autre utilisateur
- **THEN** la réponse est 404

#### Scenario: Fréquence inconnue
- **WHEN** `POST /api/operation-recurrentes` contient `Frequence: 5`
- **THEN** la réponse est 4xx et aucune récurrente n'est créée

#### Scenario: Mois par défaut
- **WHEN** une récurrente est créée sans `MoisOpRecu`
- **THEN** `MoisOpRecu` vaut 0

### Requirement: Auto-génération des récurrentes
`POST /api/operation-recurrentes/auto-generation` SHALL, pour chaque récurrente des comptes de l'utilisateur, générer toutes les échéances dues, chacune étant une `Operation` non pointée reprenant `NomOpRecu`, `MontantOpRecu`, `IDcompte`, `IDcat` et `IDcredit`, et datée de son échéance.
- L'échéance suivant `DernierDateOpRecu` MUST être calculée ainsi : en mensuel (`Frequence=3`), le mois suivant celui de `DernierDateOpRecu`, au jour `JourNumOpRecu` ; en annuel (`Frequence=7`), l'année suivante, au mois `MoisOpRecu` et au jour `JourNumOpRecu`. Le jour MUST être borné au dernier jour du mois cible.
- Une échéance est due lorsqu'elle est antérieure ou égale à aujourd'hui + 15 jours (mensuel) ou aujourd'hui + 30 jours (annuel).
- Chaque échéance MUST être réservée par une mise à jour conditionnelle de `DernierDateOpRecu` avant l'insertion de l'opération, de sorte que des appels concurrents ne créent jamais deux opérations pour la même échéance ; un échec de l'insertion MUST restaurer la valeur précédente.
- Au plus 24 échéances MUST être générées par récurrente et par appel.
- Une récurrente liée à un crédit dont le `Statut` n'est pas `actif`, à un crédit inexistant, ou dont l'échéance dépasse `Credit.DateFin` MUST NOT générer d'opération.
- La route MUST renvoyer `{}`.

#### Scenario: Mensuelle échue
- **WHEN** une récurrente mensuelle avec `JourNumOpRecu = 25` a un `DernierDateOpRecu` au 25 septembre et que nous sommes le 15 octobre
- **THEN** une opération datée du 25 octobre est créée et `DernierDateOpRecu` vaut le 25 octobre

#### Scenario: Mensuelle récente
- **WHEN** la prochaine échéance d'une récurrente mensuelle est dans plus de 15 jours
- **THEN** aucune opération n'est créée

#### Scenario: Fin de mois
- **WHEN** une récurrente mensuelle a `JourNumOpRecu = 31` et un `DernierDateOpRecu` au 31 janvier 2026
- **THEN** les échéances suivantes sont le 28 février 2026, le 31 mars 2026 puis le 30 avril 2026

#### Scenario: Annuelle un 29 février
- **WHEN** une récurrente annuelle a `MoisOpRecu = 1` et `JourNumOpRecu = 29`, et un `DernierDateOpRecu` au 29 février 2024
- **THEN** les échéances suivantes sont le 28 février 2025 puis le 28 février 2026, puis le 29 février 2028

#### Scenario: Plusieurs mois de retard
- **WHEN** le dernier traitement d'une récurrente mensuelle date de 3 mois
- **THEN** un seul appel génère les 3 échéances manquantes, chacune datée de son échéance

#### Scenario: Appels concurrents
- **WHEN** deux appels d'auto-génération sont exécutés simultanément pour le même utilisateur
- **THEN** chaque échéance due n'est générée qu'une fois

#### Scenario: Crédit terminé
- **WHEN** une récurrente est liée à un crédit dont `DateFin` est passée ou dont le `Statut` vaut `termine`
- **THEN** aucune opération n'est générée pour elle

## ADDED Requirements

### Requirement: Virement entre comptes
`POST /api/operations/transfert` SHALL accepter `{ fromCompte, toCompte, montant, DateOp, NomOp, IDcatDebit?, IDcatCredit? }` avec `montant > 0` et `fromCompte ≠ toCompte`, vérifier que les deux comptes et les catégories fournies sont accessibles à l'utilisateur (404 sinon), puis créer une opération de `-montant` sur `fromCompte` et une opération de `+montant` sur `toCompte`, et renvoyer les deux. Si la seconde création échoue, la première MUST être supprimée, de sorte qu'aucun virement à moitié enregistré ne subsiste.

#### Scenario: Virement valide
- **WHEN** l'utilisateur vire 100 € de son compte A vers son compte B
- **THEN** une opération de -100 € sur A et une de +100 € sur B sont créées et renvoyées

#### Scenario: Compte destinataire d'autrui
- **WHEN** `toCompte` appartient à un autre utilisateur
- **THEN** la réponse est 404 et aucune opération n'est créée

#### Scenario: Échec du crédit
- **WHEN** la création de l'opération créditrice échoue
- **THEN** l'opération débitrice est supprimée et la réponse est une erreur
