## ADDED Requirements

### Requirement: Lien d'une opération à un bien
`Operation` et `OperationRecurrente` SHALL porter un `IDbien` facultatif et nullable, accepté dans le corps des `POST`, `PUT` et `PATCH` de `/api/operations` et `/api/operation-recurrentes`. Lorsqu'il est renseigné, il MUST désigner un bien de l'utilisateur courant (404 sans écriture sinon) ; `null` retire le lien. Un `IDbien` à `0` ou vide MUST être enregistré comme `NULL`, et toute autre valeur MUST être un entier positif (4xx sans écriture sinon). Un `PUT` qui omet `IDbien` MUST conserver le lien existant. Le lien n'a aucun effet sur les totaux, agrégats et statistiques existants.

La récurrente d'un crédit reste gérée par son crédit : un `PUT` ou `PATCH` qui lui ajoute un `IDbien` MUST répondre 409 comme toute autre écriture.

#### Scenario: Loyer lié à un bien
- **WHEN** `POST /api/operations` crée une opération de +650 € avec l'`IDbien` d'un bien de l'utilisateur
- **THEN** la réponse est 200 et l'opération relue porte cet `IDbien`

#### Scenario: Bien d'autrui
- **WHEN** `POST /api/operation-recurrentes` référence l'`IDbien` d'un bien d'un autre utilisateur
- **THEN** la réponse est 404 et aucune récurrente n'est créée

#### Scenario: Retrait du lien
- **WHEN** `PATCH /api/operations/{id}` envoie `IDbien: null`
- **THEN** la réponse est 204 et l'opération n'est plus liée à aucun bien

#### Scenario: IDbien à zéro
- **WHEN** `POST /api/operations` ou `POST /api/operation-recurrentes` envoie `IDbien: 0`
- **THEN** l'opération est créée sans bien (`IDbien` nul)

#### Scenario: PUT sans IDbien
- **WHEN** `PUT /api/operations/{id}` remplace une opération liée à un bien sans envoyer `IDbien`
- **THEN** l'opération reste liée au même bien

#### Scenario: Statistiques inchangées
- **WHEN** une opération de catégorie `revenu` est liée à un bien
- **THEN** elle est comptée dans les soldes et les statistiques exactement comme avant d'être liée

### Requirement: Identifiant de crédit vide sur une opération
Dans le corps des `POST`, `PUT` et `PATCH` de `/api/operations`, un `IDcredit` à `0` ou vide SHALL être enregistré comme `NULL`. Toute autre valeur MUST être un entier positif (4xx sans écriture sinon) désignant un crédit de l'utilisateur (404 sinon).

#### Scenario: IDcredit à zéro
- **WHEN** `POST /api/operations` envoie `IDcredit: 0`
- **THEN** l'opération est créée sans crédit (`IDcredit` nul)

#### Scenario: IDcredit négatif
- **WHEN** `PATCH /api/operations/{id}` envoie `IDcredit: -1`
- **THEN** la réponse est 4xx et l'opération est inchangée

## MODIFIED Requirements

### Requirement: Auto-génération des récurrentes
`POST /api/operation-recurrentes/auto-generation` SHALL, pour chaque récurrente des comptes de l'utilisateur, générer toutes les échéances dues, chacune étant une `Operation` non pointée reprenant `NomOpRecu`, `MontantOpRecu`, `IDcompte`, `IDcat`, `IDcredit` et `IDbien` (un `IDcredit` ou un `IDbien` à `0` étant recopié comme `NULL`), et datée de son échéance.
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

#### Scenario: Ancienne récurrente à IDcredit = 0
- **WHEN** une récurrente historique a `IDcredit = 0`
- **THEN** elle génère normalement, et ses opérations ont `IDcredit` nul

#### Scenario: Récurrente de loyer
- **WHEN** une récurrente « Loyer » liée à un bien génère son échéance
- **THEN** l'opération générée porte le même `IDbien`
