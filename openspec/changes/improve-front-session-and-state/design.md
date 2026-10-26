## Context

La SPA Nuxt (`ssr: false`, auto-imports désactivés, Pinia) appelle l'API via `app/services/http.ts`, qui lève une `Error("HTTP <status>")` sans corps. Les stores avalent la plupart des erreurs (`.catch(() => isLoading = false)`). La session est portée par le cookie HttpOnly `mccbngAuth` (JWT de 6 h, sans refresh token) ; le front ne garde que le cookie `userID`. `checkUserAuthentification` (`services/auth.ts`) supprime les cookies sur **toute** erreur de `GET /api/users/exists`, coupure réseau comprise.

La liste d'un compte est paginée par `limit`/`skip` (35), triée `CheckOp ASC, DateOp DESC` ; le serveur départage par `IDop` (`optimize-api-queries`). Neuf pages appellent `compteStore.setActiveAccount({ NomCompte: '…' })` pour afficher un titre, ce qui écrase le compte actif ; `OperationList` contourne le cas « Coûts d'usage » par un test sur le libellé.

Constats de l'audit traités ici : F-H1, F-H5, F-H6, F-M3, F-M4, F-M5, F-M10, et la génération des récurrentes non attendue. F-M11 (`err.response`) n'existe plus dans le code ; seul l'affichage des messages serveur reste à faire (D1, puis `improve-front-forms`).

## Goals / Non-Goals

**Goals :**
- Une expiration de session toujours ramenée au login, une seule fois.
- Un état du compte actif toujours cohérent avec le dernier choix de l'utilisateur.
- Une liste paginée sans trou ni doublon, même après un pointage.

**Non-Goals :**
- Les formulaires (`improve-front-forms`) et les statistiques (`improve-front-stats-a11y-cleanup`).
- Une session glissante ou un refresh token.
- Le mode hors ligne avec file d'attente des écritures.

## Decisions

### D1. `ApiError` et intercepteur 401
`request()` lève `new ApiError(status, body)`, où `body` est le JSON `{ error: { statusCode, name, message } }` s'il est lisible. Une erreur réseau (`fetch` rejeté) reste une `TypeError`, distincte d'une `ApiError`.

Sur un 401, hors `POST /api/users/login`, le client :
1. exécute les gestionnaires enregistrés par `onSessionExpired(handler)` (point d'accroche du brouillon de formulaire) ;
2. purge la session locale (cookie `userID`, `userStore.closeSession()`) ;
3. appelle `navigateTo('/login')` une seule fois, même si plusieurs requêtes échouent en parallèle (drapeau remis à zéro au login).

`errorMessage(e, fallback)` renvoie `e.body?.error?.message`, ou un message générique (« Connexion impossible » pour une erreur réseau).

### D2. Hors ligne
`checkUserAuthentification` renvoie `'valid' | 'invalid' | 'unknown'`. Seuls 401 et 403 donnent `invalid` et suppriment les cookies. Sur `unknown` (réseau, 5xx), le middleware laisse entrer l'utilisateur avec la session locale ; si `hydrateSession` échoue aussi pour une raison réseau, l'application s'affiche avec un état vide au lieu de déconnecter.

### D3. Requêtes périmées et pagination par curseur
Le store `operation` tient un compteur `requestSeq`, incrémenté à chaque chargement initial (compte ou recherche). Chaque réponse, initiale ou « load more », compare son numéro et l'`IDcompte` demandé à l'état courant ; si l'un diffère, elle est ignorée. `isLoading` n'est relâché que par la requête courante. Un `AbortController` annule en plus la requête précédente pour économiser le réseau.

La page suivante est demandée **après la dernière opération chargée** au lieu de `skip` :

```
or: [
  { CheckOp: { gt: c } },
  { and: [{ CheckOp: c }, { DateOp: { lt: d } }] },
  { and: [{ CheckOp: c }, { DateOp: d }, { IDop: { lt: id } }] }
]
```

Le curseur est la dernière opération reçue du serveur, pas la dernière affichée : une opération pointée localement garde sa position à l'écran sans décaler le curseur. La recherche (`DateOp DESC`, `IDop DESC`) utilise le même principe avec `(DateOp, IDop)`. Les opérations ajoutées sont dédupliquées par `IDop` (une opération créée entre deux pages peut réapparaître).
- *Alternative écartée* : corriger `skip` à chaque pointage, fragile avec les créations et les suppressions.

### D4. Soldes ciblés
`setNewBalances(IDcompte, sums)` met à jour le compte `IDcompte` de la liste et `activeAccount` seulement s'il s'agit du même compte.

### D5. Repli du compte actif
`fetchActiveAccount(id)` se replie sur le favori, puis sur le premier compte visible. Sans aucun compte, `activeAccount` vaut `null` ; `AccountHeader` et `OperationList` affichent un état vide.

### D6. Pseudo-comptes
Les 9 pages à pseudo-compte (`amortissement`, `recurrOperation`, `biens`, `editUser`, `config`, `stats`, `gestion`, `credits`, `comptesGestion`) ne modifient plus `activeAccount` : elles posent `compteStore.pseudoAccountLabel`, remis à `null` en quittant la page. `AccountHeader` affiche ce libellé en priorité. Les opérations de l'amortissement vont dans un état `pseudoOperations` séparé, et les récurrentes dans `recurringOperations` (déjà présent, mais la page lit aujourd'hui `operationsOfActiveAccount`). En revenant sur `/`, la liste du compte actif est rechargée si elle a été vidée. Le test sur `"Coûts d'usage"` dans `OperationList` est supprimé.

### D7. Pointage optimiste
`toggleCheck(op)` inverse `CheckOp` localement, appelle `PATCH /api/operations/{id}`, puis rafraîchit seulement les soldes (`sumForACompte`). En cas d'erreur, il rétablit la valeur et affiche le message. La case passe en `:checked` + `@change` (plus de `v-model` sur un computed). L'opération reste à sa place jusqu'au prochain chargement du compte.

### D8. Génération des récurrentes
`generateRecurringOperations` retourne sa promesse ; le store l'attend avant de recharger les soldes et la liste du compte actif.

## Risks / Trade-offs

- [Pseudo-comptes : changement de comportement de 9 pages] → Recette de chaque page avec `docs/recette-non-regression-multiuser.md`.
- [Une opération pointée reste à sa place jusqu'au rechargement] → Comportement attendu (pas de saut visuel sous le doigt) ; l'ordre serveur est retrouvé au prochain chargement.
- [Hors ligne, données potentiellement périmées affichées] → Accepté : mieux qu'une déconnexion ; les écritures échoueront avec un message (`improve-front-forms`).

## Migration Plan

Déploiement simple de l'image, sans changement d'API ni de base. Rollback par retour à l'image précédente.

## Open Questions

_Aucune._
