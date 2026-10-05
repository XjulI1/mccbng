## Why

L'audit du 2026-10-05 relève dans la SPA (`app/`) plusieurs défauts qui font perdre ou corrompre des saisies sans que l'utilisateur le voie :
- les formulaires n'attendent pas la réponse du serveur et se réinitialisent même en cas d'échec ;
- une session expirée laisse l'application figée sans retour vers le login ;
- la touche Entrée crée des doublons ;
- le bouton « Débit » peut enregistrer un crédit ;
- un changement rapide de compte affiche les opérations d'un autre compte.

L'application est utilisée en PWA mobile, souvent ouverte longtemps et parfois hors ligne : ces cas sont courants, pas marginaux.

## What Changes

- **Erreurs HTTP typées et 401 global** : `request()` lève une `ApiError { status, body }`. Sur un 401, la session locale est purgée et l'utilisateur est redirigé vers `/login`. Les messages d'erreur serveur (409, 422…) sont enfin affichés, alors que le code lit aujourd'hui `err.response`, un reste d'axios.
- **Hors ligne ≠ déconnexion** : une erreur réseau ou une 5xx sur `GET /api/users/exists` ne supprime plus la session.
- **Formulaires fiables** :
  - balise `<form @submit.prevent>` et un seul déclencheur, ce qui supprime la double soumission par Entrée ;
  - état `submitting` qui bloque une deuxième soumission ;
  - `await`, avec réinitialisation ou navigation seulement en cas de succès et message d'erreur sinon ;
  - confirmation avant suppression.
- **Montants** :
  - « Débit » et « Crédit » forcent le signe au lieu de l'inverser ;
  - un champ vide ne produit plus `NaN` ;
  - les montants sont arrondis à 2 décimales avant l'envoi ;
  - `v-model.number` sur `Frequence`, pour que le sélecteur de mois des récurrentes annuelles s'affiche.
- **Formulaires d'édition** : un accès direct par lien ou un rechargement charge l'entité par identifiant au lieu d'afficher un formulaire de création, ce qui créait un doublon.
- **Compte actif** :
  - une réponse de requête périmée est ignorée, ce qui supprime les courses entre comptes et sur le « load more » ;
  - les soldes sont appliqués au compte demandé ;
  - un favori introuvable est remplacé par le premier compte visible ;
  - les pseudo-comptes (« Coûts d'usage », « Récurrentes »…) ont leur propre état.
- **Pointage** : mise à jour optimiste avec retour arrière en cas d'erreur, sans recharger toute la liste ni perdre la position de défilement.
- **Dates** : les dates par défaut et les plages de stats sont calculées en heure locale, et non via `toISOString()` en UTC. Les dates construites pour les graphiques suivent un format portable (Safari/iOS).
- **Divers** :
  - la suggestion de catégorie n'écrase plus la catégorie d'une opération existante ;
  - le total des crédits utilise `??` ;
  - le virement est protégé contre l'absence de compte portefeuille ou de compte créditeur ;
  - les graphiques Highcharts sont détruits au démontage ;
  - les timers sont nettoyés ;
  - les `%` et `_` sont échappés dans la recherche ;
  - l'accessibilité de base est corrigée : éléments cliquables, `alt`, overlay en `role="dialog"` avec fermeture par Échap ;
  - le code mort est supprimé.

## Capabilities

### New Capabilities
- `front-forms` : comportement commun des formulaires de saisie (soumission unique et attendue, erreurs, confirmation de suppression, signe et arrondi des montants, chargement par identifiant en édition, dates locales, suggestion de catégorie non intrusive).

### Modified Capabilities
- `front-auth-session` : le middleware et le client HTTP gèrent l'expiration de session à tout moment, et une indisponibilité réseau ne déconnecte plus.
- `front-state` : erreurs HTTP typées, cohérence du compte actif face aux requêtes concurrentes, repli si le favori est introuvable, état séparé des pseudo-comptes, pointage optimiste, déduplication de la pagination.

## Impact

- **Code** :
  - `app/services/http.ts`, `app/services/auth.ts`, `app/middleware/auth.global.ts` ;
  - `app/stores/{operation,compte,stats,credit,bien}.ts` ;
  - les composants `OperationForm`, `TransfertForm`, `OperationRecurrenteForm`, `CreditForm`, `BienForm`, `CompteForm`, `Home/Operation.vue`, `OperationList.vue`, `AccountHeader.vue`, `RouteOverTheContent.vue` ;
  - les graphiques de `components/Stats/*` et les pages `credits.vue`, `editUser.vue`, `config.vue`.
- **Nouveaux fichiers** : `app/composables/useEntityForm.ts` et `useMoneySign.ts`, et `app/utils/date.ts` (dates locales).
- **API** : aucune nouvelle route. Les formulaires d'édition utilisent `GET /api/<ressource>/{id}`, qui existe déjà. Le virement passe par la route du change `fix-recurring-and-credit-calculations`, si celui-ci est livré avant.
- **Tests** : tests unitaires des composables, des stores (courses, repli du favori) et de `services/http`. Les tests d'intégration des routes ne changent pas.
