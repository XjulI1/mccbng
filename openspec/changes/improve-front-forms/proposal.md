## Why

L'audit du 2026-10-05 relève dans les formulaires de la SPA des défauts qui font perdre, dupliquer ou corrompre des saisies sans que l'utilisateur le voie :
- les formulaires n'attendent pas la réponse du serveur et se réinitialisent même en cas d'échec, sans afficher le message de l'API ;
- la touche Entrée crée des doublons (`@keypress.enter` sur le conteneur en plus du `@click`) ;
- le bouton « Débit » peut enregistrer un crédit (`MontantOp *= -1`) ;
- un lien direct vers un formulaire d'édition ouvre un formulaire de création, ce qui crée un doublon ;
- la suppression part sans confirmation ;
- la date proposée est celle du jour en UTC : entre minuit et 2 h en France, c'est la veille ;
- la suggestion de catégorie écrase la catégorie d'une opération existante ;
- une session expirée pendant la saisie fait perdre l'opération en cours.

C'est le deuxième des trois changes issus du découpage d'`improve-front-reliability`. Il s'appuie sur `improve-front-session-and-state` (`ApiError`, `errorMessage`, intercepteur 401 et `onSessionExpired`).

## What Changes

- **Soumission fiable** : composable `useEntityForm` (`submitting`, `error`, `submit`) ; chaque formulaire devient un `<form @submit.prevent>` à déclencheur unique ; `await` avec réinitialisation ou navigation seulement en cas de succès ; message de l'API affiché sinon.
- **Brouillon en cas d'expiration** : sur un 401 pendant une soumission, la saisie est sauvegardée par route en `sessionStorage`, puis restaurée après reconnexion avec un message.
- **Confirmation avant suppression** (`confirm()` natif dans un helper unique).
- **Montants** (`useMoneySign`) : « Débit » et « Crédit » forcent le signe ; un champ vide vaut 0, jamais `NaN` ; arrondi à 2 décimales avant l'envoi. `v-model.number` sur `Frequence` des récurrentes.
- **Édition par identifiant** : un accès direct ou un rechargement charge l'entité (`GET /api/<ressource>/{id}`) au lieu de passer en création.
- **Dates par défaut locales** : `todayLocal()` dans `app/utils/dates.ts` remplace `toISOString().split('T')[0]` dans les formulaires.
- **Suggestion de catégorie non intrusive** : seulement pour une nouvelle opération sans catégorie choisie, réponses périmées ignorées, timer nettoyé.
- **Virement robuste** : comptes choisis et distincts, fonctionnement sans compte portefeuille, plus d'effet de bord dans un computed.
- **`formatAmount` dupliqués** remplacés par `<Currency>` ou un helper unique.

## Capabilities

### New Capabilities
- `front-forms` : comportement commun des formulaires de saisie (soumission unique et attendue, erreurs, brouillon, confirmation de suppression, signe et arrondi des montants, chargement par identifiant en édition, dates locales, suggestion de catégorie non intrusive, virement robuste).

### Modified Capabilities
_Aucune._

## Impact

- **Code** :
  - composants `OperationForm`, `TransfertForm`, `OperationRecurrenteForm`, `CreditForm`, `BienForm`, `CompteForm` et page `editUser.vue` ;
  - `app/services/{operation,credit,bien}.ts` (chargement par identifiant) ;
  - `BienForm`, `BienCard`, `CreditCard`, `biens.vue`, `credits.vue` (`formatAmount`).
- **Nouveaux fichiers** : `app/composables/{useEntityForm,useMoneySign,useFormDraft}.ts`, `app/utils/confirm.ts` ; `todayLocal` ajouté à `app/utils/dates.ts` (existant).
- **API** : aucune nouvelle route. Les formulaires d'édition utilisent `GET /api/<ressource>/{id}` ; le virement utilise `POST /api/operations/transfert` (déjà en place).
- **Dépendance** : à livrer après `improve-front-session-and-state`.
- **Tests** : tests unitaires des composables, de `todayLocal` (autour de minuit) et du brouillon.
