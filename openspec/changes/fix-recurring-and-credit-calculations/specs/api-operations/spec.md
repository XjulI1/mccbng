## MODIFIED Requirements

### Requirement: Agrégats de soldes
`GET /api/operations/sumAllCompteForUser` SHALL renvoyer, par compte, les totaux pointés/non pointés (`TotalNotChecked`, etc.) sans filtre de catégorie ; `GET /api/operations/sumForACompte?id=` SHALL faire de même pour un compte de l'utilisateur (404 si autre utilisateur). Les clés MUST être identiques à l'existant et les totaux MUST être arrondis à 2 décimales. Un drapeau de compte `NULL` MUST être interprété comme sa valeur par défaut (`visible` = 1, autres drapeaux = 0) et ne jamais exclure le compte. Les opérations datées dans le futur (échéances générées par anticipation) MUST rester comptées dans les totaux.

#### Scenario: Solde d'un compte
- **WHEN** `GET /api/operations/sumForACompte?id=3` est appelé sur un compte de l'utilisateur
- **THEN** les totaux pointé et non pointé sont renvoyés, toutes catégories confondues, arrondis à 2 décimales

#### Scenario: Compte avec visible NULL
- **WHEN** un compte de l'utilisateur a `visible = NULL`
- **THEN** il figure dans `sumAllCompteForUser` comme un compte visible

#### Scenario: Échéance anticipée
- **WHEN** une mensualité non pointée est datée de dans 10 jours
- **THEN** elle est comptée dans `TotalNotChecked`

### Requirement: Totaux mensuels de dépenses
`GET /api/operations/sumByUserByMonth?monthNumber&yearNumber&IDCompte` et `GET /api/operations/sumCategoriesByUserByMonth?monthNumber&yearNumber` SHALL considérer les opérations des catégories `Type='depense'` ainsi que les sorties non catégorisées (`MontantOp < 0` avec `IDcat` égal à 0, `NULL` ou inexistant, mensualités de crédit comprises), et ne couvrir que les comptes de l'utilisateur. Dans `sumCategoriesByUserByMonth`, les sorties non catégorisées MUST être regroupées sous `IDcat = 0`, que le front affiche avec le libellé `Non catégorisé` (la réponse garde ses clés `TotalMonth` et `IDcat`). Les entrées non catégorisées MUST être ignorées.

#### Scenario: Exclusion des revenus
- **WHEN** un mois contient des opérations `revenu` et `depense`
- **THEN** seules les `depense` sont additionnées

#### Scenario: Mensualité sans catégorie
- **WHEN** un mois contient une mensualité de crédit de -900 € avec `IDcat = 0`
- **THEN** elle est incluse dans le total dépensé et apparaît sous `Non catégorisé`

#### Scenario: Entrée sans catégorie
- **WHEN** un mois contient une entrée de +50 € avec `IDcat = 0`
- **THEN** elle n'est comptée ni dans le total dépensé ni sous `Non catégorisé`

### Requirement: Opérations récurrentes
Les routes `/api/operation-recurrentes` SHALL fournir le CRUD standard d'`OperationRecurrente`, avec :
- le scoping hérité ;
- la vérification de propriété de `IDcompte` à la création et au remplacement ;
- les défauts `JourNumOpRecu=1`, `MoisOpRecu=0` (janvier, mois indexés à partir de 0), `Frequence=3`, `IDcat=0`.

Les valeurs MUST être validées : `Frequence` ∈ {3, 7}, `JourNumOpRecu` entier de 1 à 31, `MoisOpRecu` entier de 0 à 11. Une valeur hors bornes MUST produire 4xx sans écriture.

À la création, le serveur MUST ignorer tout `DernierDateOpRecu` reçu. Il le fixe à l'échéance théorique qui précède la première échéance postérieure ou égale à aujourd'hui, pour que la première échéance à venir soit générée.

`IDcredit` MUST NOT être accepté dans le corps d'un `POST`, `PUT` ou `PATCH` : seul le serveur le pose, à la création d'un crédit. Une récurrente dont `IDcredit` n'est pas `NULL` est gérée par son crédit :
- `PUT /{id}`, `PATCH /{id}` et `DELETE /{id}` sur elle MUST répondre 409 sans écriture ;
- le `PATCH` en masse MUST ne l'affecter en aucun cas.

#### Scenario: Récurrente sur compte d'autrui
- **WHEN** `POST /api/operation-recurrentes` référence le compte d'un autre utilisateur
- **THEN** la réponse est 404

#### Scenario: Fréquence inconnue
- **WHEN** `POST /api/operation-recurrentes` contient `Frequence: 5`
- **THEN** la réponse est 4xx et aucune récurrente n'est créée

#### Scenario: Mois par défaut
- **WHEN** une récurrente est créée sans `MoisOpRecu`
- **THEN** `MoisOpRecu` vaut 0

#### Scenario: Première échéance dans le mois courant
- **WHEN** une récurrente mensuelle avec `JourNumOpRecu = 25` est créée le 5 octobre avec `DernierDateOpRecu` au 5 octobre dans le corps
- **THEN** `DernierDateOpRecu` vaut le 25 septembre et la première opération générée est datée du 25 octobre

#### Scenario: Échéance du mois déjà passée
- **WHEN** une récurrente mensuelle avec `JourNumOpRecu = 3` est créée le 5 octobre
- **THEN** `DernierDateOpRecu` vaut le 3 octobre et la première opération générée est datée du 3 novembre

#### Scenario: Récurrente d'un crédit
- **WHEN** `PATCH /api/operation-recurrentes/{id}` vise la récurrente `Mensualité <nom>` d'un crédit
- **THEN** la réponse est 409 et la récurrente est inchangée

#### Scenario: Suppression de la récurrente d'un crédit
- **WHEN** `DELETE /api/operation-recurrentes/{id}` vise une récurrente dont `IDcredit` est renseigné
- **THEN** la réponse est 409 et la récurrente comme le crédit restent inchangés

### Requirement: Auto-génération des récurrentes
`POST /api/operation-recurrentes/auto-generation` SHALL, pour chaque récurrente des comptes de l'utilisateur, générer toutes les échéances dues, chacune étant une `Operation` non pointée reprenant `NomOpRecu`, `MontantOpRecu`, `IDcompte`, `IDcat` et `IDcredit`, et datée de son échéance.
- L'échéance suivant `DernierDateOpRecu` MUST être calculée ainsi : en mensuel (`Frequence=3`), le mois suivant celui de `DernierDateOpRecu`, au jour `JourNumOpRecu` ; en annuel (`Frequence=7`), l'année suivante, au mois `MoisOpRecu` et au jour `JourNumOpRecu`. Le jour MUST être borné au dernier jour du mois cible.
- Une échéance est due lorsqu'elle est antérieure ou égale à aujourd'hui + 15 jours (mensuel) ou aujourd'hui + 30 jours (annuel).
- Chaque échéance MUST être réservée par une mise à jour conditionnelle de `DernierDateOpRecu` (de la valeur lue vers l'échéance) avant l'insertion de l'opération. Des appels concurrents ne créent ainsi jamais deux opérations pour la même échéance.
- Un échec de l'insertion MUST restaurer la valeur précédente, par une mise à jour conditionnée à la valeur réservée, sans écraser une réservation postérieure.
- Au plus 24 échéances MUST être générées par récurrente et par appel.
- Une récurrente MUST NOT générer d'opération dans les cas suivants : elle est liée à un crédit dont le `Statut` n'est pas `actif` ; elle est liée à un crédit inexistant ; son échéance dépasse `Credit.DateFin`.
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

#### Scenario: Dernière date avec une heure
- **WHEN** `DernierDateOpRecu` d'une récurrente historique porte une heure (par exemple 5 octobre à 14:37)
- **THEN** la réservation réussit et l'échéance suivante est générée une seule fois

#### Scenario: Crédit terminé
- **WHEN** une récurrente est liée à un crédit dont `DateFin` est passée ou dont le `Statut` vaut `termine`
- **THEN** aucune opération n'est générée pour elle

## ADDED Requirements

### Requirement: Virement entre comptes
`POST /api/operations/transfert` SHALL accepter `{ fromCompte, toCompte, montant, DateOp, NomOp, IDcat }`, avec :
- `montant > 0` ;
- `fromCompte ≠ toCompte` ;
- `IDcat` obligatoire, appliqué aux deux opérations.

Le serveur MUST vérifier que les deux comptes appartiennent à l'utilisateur et que la catégorie lui est accessible (catégorie de l'utilisateur ou partagée, `IDuser = 0`), avec 404 sinon. Il crée ensuite une opération de `-montant` sur `fromCompte` et une opération de `+montant` sur `toCompte`, puis renvoie les deux. Si la seconde création échoue, la première MUST être supprimée, de sorte qu'aucun virement à moitié enregistré ne subsiste.

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
- **THEN** l'opération débitrice est supprimée et la réponse est une erreur
