## Context

Les six formulaires (`OperationForm`, `TransfertForm`, `OperationRecurrenteForm`, `CreditForm`, `BienForm`, `CompteForm`) et la page `editUser.vue` lancent leurs écritures sans `await`, se réinitialisent ou naviguent tout de suite, et portent un `@keypress.enter` sur leur conteneur en plus du `@click` du bouton. `improve-front-session-and-state` fournit `ApiError`, `errorMessage(e)` et `onSessionExpired(handler)`.

État du code utile :
- `fetchCreditById` et `fetchBienById` existent (`services/credit.ts`, `services/bien.ts`) ; il manque l'opération et la récurrente. `CompteForm` bloque déjà l'enregistrement tant que le compte n'est pas chargé.
- `OperationRecurrenteForm` compare déjà `Number(Frequence) === 7` et indexe `MoisOpRecu` à partir de 0 ; seul le type envoyé (chaîne) reste à corriger.
- Le virement passe déjà par `POST /api/operations/transfert` (transaction serveur).
- `app/utils/dates.ts` existe (`monthRange`, `dayRange`, `dateOpWithin` : bornes ISO UTC des filtres, livrés par `optimize-api-queries`).

Constats de l'audit traités ici : F-H2, F-H3, F-H4, F-M1, F-M2, F-M8 (dates des formulaires), F-M12, F-M13, et le `NaN` des montants.

## Goals / Non-Goals

**Goals :**
- Plus aucune saisie perdue ni dupliquée sans que l'utilisateur le voie.
- Une base commune qui réduit la duplication entre les formulaires.

**Non-Goals :**
- La refonte visuelle des formulaires.
- Un composant de confirmation sur mesure (le `confirm()` natif suffit pour cette itération).
- Le swipe-to-delete (non implémenté ; la mention est retirée de la documentation par `improve-front-stats-a11y-cleanup`).

## Decisions

### D1. `useEntityForm`
```ts
const { submitting, error, submit } = useEntityForm()
await submit(async () => { await store.save(entity); onSuccess() })
```
- `submit` ignore un appel tant que `submitting` vaut vrai ;
- il capture l'erreur dans `error` (via `errorMessage`) ; un message spécifique peut être associé à un statut (409 sur l'email → « Cet email est déjà utilisé ») ;
- il n'exécute `onSuccess`, qui réinitialise ou navigue, qu'en cas de succès.

Chaque formulaire devient un `<form @submit.prevent="onSubmit">` avec un bouton `type="submit"` désactivé pendant `submitting` ; les `@keypress.enter` des conteneurs sont supprimés.

### D2. Brouillon en cas d'expiration (`useFormDraft`)
Pendant une soumission, le formulaire s'abonne à `onSessionExpired` : sur un 401, il écrit sa saisie dans `sessionStorage` sous la clé `mccbng.draft:<route.fullPath>`. Au montage, s'il trouve un brouillon pour sa route, il le restaure, le supprime et affiche « Saisie restaurée après reconnexion ». La redirection vers `/login` conserve la route d'origine (`?redirect=`), pour revenir sur le formulaire après reconnexion. Accès à `sessionStorage` dans un `try/catch` : sans stockage, la saisie est perdue mais un message explicite s'affiche. Le brouillon ne contient que les champs de l'entité, jamais de secret (le formulaire de profil n'enregistre pas de brouillon).

### D3. Signe et arrondi (`useMoneySign`)
- `setDebit()` donne `-Math.abs(x)` et `setCredit()` donne `Math.abs(x)` ;
- au blur, un champ vide ou invalide donne `0` ;
- avant l'envoi, le montant passe par `round2`.

Mutualisé entre `OperationForm`, `OperationRecurrenteForm` et `TransfertForm`.

### D4. Édition par identifiant
Quand une route d'édition (`editOperation`, `editOperationRecurrente`, `editCredit`, `editBien`) s'ouvre et que l'entité est absente du store, le formulaire appelle `GET /api/<ressource>/{id}` (ajout de `fetchOperationById` et `fetchRecurrenteById`, réutilisation de `fetchCreditById` et `fetchBienById`). Pendant le chargement, l'enregistrement est désactivé ; un 404 ferme l'overlay avec un message. C'est le comportement actuel de `CompteForm`, généralisé.

### D5. Dates par défaut locales
`todayLocal()` est ajouté à `app/utils/dates.ts` : `YYYY-MM-DD` construit avec `getFullYear`/`getMonth`/`getDate`. Il remplace `new Date().toISOString().split('T')[0]` dans `OperationForm`, `TransfertForm`, `CreditForm` et `BienForm`. Le nom porte le suffixe `Local` pour ne pas être confondu avec les bornes UTC du même fichier. Les dates d'une entité existante, ramenées au format `YYYY-MM-DD` pour l'affichage, utilisent la partie date UTC (stockage en UTC, minuit).

### D6. Suggestion de catégorie
L'auto-sélection n'a lieu que pour une nouvelle opération dont `IDcat` vaut 0 et dont l'utilisateur n'a pas choisi de catégorie. Les réponses hors d'ordre sont ignorées (compteur), le timer de debounce est nettoyé dans `onUnmounted`.

### D7. Virement
Le bouton est désactivé tant que les comptes débiteur et créditeur ne sont pas choisis et distincts. `porteFeuilleCompte.value[0]?.IDcompte` remplace l'accès direct ; la présélection du compte portefeuille se fait dans un `watch` ou à l'initialisation, plus dans un computed.

### D8. Confirmation
`confirmDelete(label)` (`app/utils/confirm.ts`) encapsule `window.confirm` ; toutes les suppressions (formulaires et listes) passent par lui.

## Risks / Trade-offs

- [Régression visuelle des formulaires transformés en `<form>`] → Styles inchangés ; `tests/integration/routes.spec.ts` reste vert.
- [`confirm()` natif peu esthétique sur mobile] → Accepté pour cette itération.
- [Brouillon restauré sur un formulaire dont l'entité a changé entre-temps] → Le brouillon est lié à la route exacte et supprimé dès sa restauration ; l'enregistrement reste soumis à la validation serveur.

## Migration Plan

Déploiement simple de l'image, après `improve-front-session-and-state`. Rollback par retour à l'image précédente.

## Open Questions

_Aucune._
