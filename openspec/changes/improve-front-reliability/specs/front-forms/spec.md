## ADDED Requirements

### Requirement: Soumission unique et attendue
Chaque formulaire de saisie (opération, virement, récurrente, crédit, bien, compte, profil) SHALL être un élément `<form>` soumis par un unique déclencheur (`submit`). Le formulaire MUST attendre la réponse de l'API avant toute réinitialisation ou navigation, MUST ignorer toute nouvelle soumission tant qu'une soumission est en cours, et MUST conserver la saisie et afficher le message d'erreur de l'API en cas d'échec.

#### Scenario: Entrée sur le bouton Créer
- **WHEN** l'utilisateur appuie sur Entrée alors que le focus est sur le bouton « Créer » d'un virement
- **THEN** un seul virement est créé

#### Scenario: Double tap
- **WHEN** l'utilisateur appuie deux fois rapidement sur « Créer » d'une opération
- **THEN** une seule opération est créée

#### Scenario: Échec de l'enregistrement
- **WHEN** l'API répond 422 à la création d'une opération
- **THEN** le formulaire reste rempli et affiche le message d'erreur renvoyé par l'API

#### Scenario: Message de conflit
- **WHEN** l'utilisateur modifie son email pour une adresse déjà utilisée et l'API répond 409
- **THEN** le message « Cet email est déjà utilisé » s'affiche

### Requirement: Confirmation des suppressions
Toute suppression déclenchée depuis un formulaire ou une liste SHALL demander une confirmation explicite avant l'appel à l'API.

#### Scenario: Annulation
- **WHEN** l'utilisateur clique sur « Supprimer » une opération puis annule la confirmation
- **THEN** aucune requête de suppression n'est envoyée

### Requirement: Signe et arrondi des montants
Les commandes « Débit » et « Crédit » SHALL forcer respectivement un montant négatif et positif, quelle que soit la valeur courante et le nombre de clics. Un champ montant vide ou invalide MUST valoir 0, jamais `NaN`. Les montants MUST être arrondis à 2 décimales avant envoi à l'API.

#### Scenario: Débit cliqué deux fois
- **WHEN** l'utilisateur saisit 50, puis clique deux fois sur « Débit »
- **THEN** le montant enregistré est -50

#### Scenario: Champ vidé
- **WHEN** l'utilisateur vide le champ montant et quitte le champ
- **THEN** le montant vaut 0

### Requirement: Fréquence et mois des récurrentes
Le formulaire de récurrente SHALL traiter `Frequence` comme un nombre, afficher le sélecteur de mois dès que la fréquence annuelle (7) est choisie, et envoyer `MoisOpRecu` indexé à partir de 0.

#### Scenario: Création annuelle
- **WHEN** l'utilisateur crée une récurrente, choisit « annuelle » puis « Mars »
- **THEN** le sélecteur de mois est visible et la récurrente est envoyée avec `Frequence = 7` et `MoisOpRecu = 2`

### Requirement: Édition chargée par identifiant
Un formulaire d'édition (opération, récurrente, crédit, bien, compte) ouvert par lien direct ou après rechargement SHALL charger l'entité par son identifiant lorsqu'elle est absente du store, MUST désactiver l'enregistrement pendant le chargement et MUST NOT basculer en mode création. Une entité introuvable (404) MUST fermer le formulaire avec un message.

#### Scenario: Rechargement sur un crédit
- **WHEN** l'utilisateur recharge la page `/editCredit/5`
- **THEN** le formulaire affiche le crédit 5 en mode édition et l'enregistrement le met à jour sans en créer un nouveau

#### Scenario: Opération hors de la première page
- **WHEN** l'utilisateur ouvre `/editOperation/12` alors que l'opération 12 n'est pas dans les 35 premières du compte favori
- **THEN** l'opération 12 est chargée et affichée

### Requirement: Dates par défaut locales
Les dates par défaut des formulaires et les bornes des préréglages de statistiques SHALL être calculées dans le fuseau local de l'appareil. Les dates construites pour les filtres des graphiques MUST l'être par `Date.UTC` ou au format ISO 8601 strict.

#### Scenario: Saisie après minuit
- **WHEN** l'utilisateur, en France, ouvre le formulaire d'opération le 6 octobre à 0 h 30
- **THEN** la date proposée est le 6 octobre

#### Scenario: Préréglage Année
- **WHEN** l'utilisateur choisit le préréglage « Année » pour 2026
- **THEN** la plage envoyée commence le 2026-01-01 et se termine le 2026-12-31

### Requirement: Suggestion de catégorie non intrusive
La suggestion automatique de catégorie SHALL ne présélectionner une catégorie que pour une nouvelle opération dont la catégorie n'a pas été choisie. Elle MUST ignorer les réponses arrivées après une saisie plus récente.

#### Scenario: Opération existante
- **WHEN** l'utilisateur ouvre une opération existante catégorisée « Loisirs » dont le nom suggère « Courses » à plus de 70 %
- **THEN** la catégorie reste « Loisirs »

### Requirement: Virement robuste
Le formulaire de virement SHALL empêcher la soumission tant que les comptes débiteur et créditeur ne sont pas choisis et distincts, et MUST fonctionner sans compte portefeuille.

#### Scenario: Utilisateur sans compte portefeuille
- **WHEN** un utilisateur sans compte `porte_feuille` ouvre le formulaire de virement
- **THEN** le formulaire s'affiche sans erreur
