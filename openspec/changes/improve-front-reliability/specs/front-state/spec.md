## ADDED Requirements

### Requirement: Erreurs HTTP typées
Le client HTTP (`services/http.ts`) SHALL lever, pour toute réponse non 2xx, une erreur exposant le code HTTP et le corps JSON de l'erreur (`{ error: { statusCode, name, message } }`). Les actions des stores MUST propager l'erreur à l'appelant après avoir remis leurs indicateurs de chargement dans un état cohérent, au lieu de l'ignorer.

#### Scenario: Corps d'erreur disponible
- **WHEN** l'API répond 409 avec `{ error: { message: "A user with this email already exists" } }`
- **THEN** l'erreur levée expose `status = 409` et ce message

### Requirement: Cohérence du compte actif
Le store des opérations SHALL n'appliquer une réponse de chargement ou de pagination que si elle correspond au dernier compte demandé et à la dernière requête émise. Les soldes MUST être appliqués au compte pour lequel ils ont été demandés. Les opérations ajoutées par pagination MUST être dédupliquées par `IDop`.

#### Scenario: Changement rapide de compte
- **WHEN** l'utilisateur sélectionne le compte A puis immédiatement le compte B, et la réponse de A arrive après celle de B
- **THEN** la liste affiche les opérations de B uniquement

#### Scenario: Pagination en vol
- **WHEN** un chargement de page suivante du compte A est en cours et l'utilisateur passe au compte B
- **THEN** aucune opération de A n'est ajoutée à la liste de B

#### Scenario: Solde en retard
- **WHEN** les soldes du compte A arrivent après que l'utilisateur est passé au compte B
- **THEN** l'en-tête de B n'affiche pas les soldes de A

### Requirement: Repli du compte actif
Lorsque le compte favori est absent, supprimé ou invisible, l'application SHALL sélectionner le premier compte visible de l'utilisateur ; sans aucun compte, elle MUST afficher un état vide sans erreur de rendu.

#### Scenario: Favori supprimé
- **WHEN** le compte favori de l'utilisateur a été supprimé et l'utilisateur ouvre `/`
- **THEN** le premier compte visible est affiché

#### Scenario: Nouvel utilisateur sans compte
- **WHEN** un utilisateur sans aucun compte ouvre `/`
- **THEN** la page s'affiche avec un état vide et aucune erreur n'est levée

### Requirement: Pseudo-comptes isolés
Les vues sans compte réel (amortissement, récurrentes, statistiques, configuration…) SHALL afficher leur libellé sans remplacer le compte actif ni la liste de ses opérations. Les opérations récurrentes MUST être stockées séparément des opérations du compte actif. En revenant sur `/`, la liste du compte actif MUST être affichée.

#### Scenario: Retour depuis les récurrentes
- **WHEN** l'utilisateur ouvre la page des récurrentes puis revient sur `/`
- **THEN** l'accueil affiche le compte actif et ses opérations, et « Nouvelle opération » propose ce compte

### Requirement: Pointage sans rechargement
Pointer ou dépointer une opération SHALL mettre à jour l'opération concernée immédiatement, enregistrer la modification puis rafraîchir uniquement les soldes, sans recharger la liste ni perdre la position de défilement. En cas d'échec, l'état précédent MUST être rétabli et un message affiché.

#### Scenario: Pointage en page 3
- **WHEN** l'utilisateur a fait défiler trois pages et pointe une opération
- **THEN** la liste conserve ses trois pages et sa position, et le solde pointé est mis à jour

#### Scenario: Échec du pointage
- **WHEN** l'API refuse le pointage
- **THEN** la case revient à son état précédent
