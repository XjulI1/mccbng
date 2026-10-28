## ADDED Requirements

### Requirement: Accès à l'import
Le menu d'actions (`FabMenu`) de la page des opérations SHALL proposer « Importer » ouvrant l'overlay `/import`, uniquement quand `GET /api/imports/disponibilite` renvoie `disponible: true`. Le compte cible MUST être présélectionné sur le compte actif et rester modifiable avant l'extraction.

#### Scenario: Fonctionnalité désactivée
- **WHEN** le serveur n'a pas de clé Anthropic
- **THEN** l'entrée « Importer » n'apparaît pas dans le menu

#### Scenario: Compte présélectionné
- **WHEN** l'utilisateur ouvre l'import depuis le compte « Courant »
- **THEN** le compte cible proposé est « Courant »

### Requirement: Sources d'import
L'écran de saisie SHALL accepter au moins une source parmi : texte collé, une ou plusieurs photos (sélection de fichiers ou appareil photo du téléphone), et une vidéo. Les sources MUST pouvoir être combinées dans un même lot. Un avertissement MUST rappeler que le contenu est envoyé à un service d'IA externe.

#### Scenario: Photo prise sur mobile
- **WHEN** l'utilisateur choisit « Photo » sur son téléphone
- **THEN** l'appareil photo ou la galerie s'ouvre et la photo est ajoutée à la liste des sources

#### Scenario: Texte collé
- **WHEN** l'utilisateur colle les lignes d'un relevé copiées depuis le site de sa banque
- **THEN** le texte est envoyé comme source et l'extraction peut être lancée sans image

### Requirement: Normalisation des images dans le navigateur
Chaque image SHALL être convertie dans le navigateur avant l'envoi : HEIC/HEIF converti, redimensionné pour que le plus grand côté fasse au plus 1600 px, et réencodé en JPEG. Une image illisible MUST être signalée à l'utilisateur sans bloquer les autres sources.

#### Scenario: Photo iPhone HEIC
- **WHEN** l'utilisateur ajoute une photo HEIC de 4032 px
- **THEN** une image JPEG de 1600 px de grand côté au plus est envoyée

### Requirement: Découpage des vidéos en images
Une vidéo SHALL être découpée dans le navigateur (élément `video` et `canvas`) en images régulièrement espacées (une par seconde par défaut), dont les images quasi identiques à la précédente sont écartées, dans la limite du nombre maximal d'images du lot. Le fichier vidéo MUST NOT être envoyé au serveur.

#### Scenario: Défilement filmé d'un relevé
- **WHEN** l'utilisateur filme 15 secondes de défilement de son application bancaire
- **THEN** au plus 15 images distinctes sont extraites et envoyées comme photos

#### Scenario: Vidéo trop longue
- **WHEN** la vidéo produirait plus d'images que la limite
- **THEN** les images sont espacées pour respecter la limite et l'utilisateur en est informé

### Requirement: Progression de l'extraction
Pendant la préparation des images et l'appel d'extraction, l'écran SHALL afficher une progression et empêcher un second envoi. Une erreur (400, 422, 429, 502, 503) MUST être affichée avec un message compréhensible, les sources saisies étant conservées pour réessayer.

#### Scenario: Erreur temporaire
- **WHEN** l'extraction répond 502
- **THEN** un message invite à réessayer et les photos sélectionnées restent présentes

### Requirement: Revue humaine des lignes
L'écran de revue SHALL afficher chaque ligne du lot avec une case à cocher, la date, le libellé proposé, le montant et la catégorie, tous modifiables, ainsi que l'opération existante en cas de doublon probable. Le libellé brut du relevé (`LibelleSource`) MUST être affiché en discret sous le libellé proposé quand il diffère, avec une action pour le reprendre comme libellé. Les lignes doublons et de confiance faible MUST être mises en évidence. L'écran MUST afficher le nombre de lignes cochées et leur total, et permettre de tout cocher ou décocher et d'ajouter ou supprimer une ligne.

#### Scenario: Correction d'une catégorie
- **WHEN** l'utilisateur change la catégorie proposée d'une ligne
- **THEN** la nouvelle catégorie est celle qui sera validée

#### Scenario: Retour au libellé du relevé
- **WHEN** l'utilisateur préfère le libellé brut « PRLV SEPA EDF » au libellé proposé « Électricité »
- **THEN** une action reprend le libellé brut dans le champ libellé

#### Scenario: Doublon signalé
- **WHEN** une ligne est un doublon probable
- **THEN** elle apparaît décochée, mise en évidence, avec la date, le libellé et le montant de l'opération existante

### Requirement: Validation et retour à la liste
Le bouton « Valider » SHALL envoyer uniquement les lignes cochées à `POST /api/imports/:id/valider`, puis fermer l'overlay, rafraîchir la liste des opérations et les soldes du compte, et afficher le nombre d'opérations créées. Le bouton « Abandonner » MUST supprimer le brouillon après confirmation. Fermer l'overlay sans valider MUST conserver le brouillon pour une reprise ultérieure.

#### Scenario: Validation réussie
- **WHEN** l'utilisateur valide 10 lignes cochées
- **THEN** l'overlay se ferme, les 10 opérations apparaissent dans la liste et le solde du compte est à jour

#### Scenario: Reprise d'un brouillon
- **WHEN** l'utilisateur rouvre l'import alors qu'un brouillon existe
- **THEN** il peut reprendre ce brouillon ou en commencer un nouveau
