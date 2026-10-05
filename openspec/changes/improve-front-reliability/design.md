## Context

La SPA Nuxt (`ssr: false`, auto-imports désactivés, Pinia) appelle l'API via `app/services/http.ts`, qui lève une `Error("HTTP <status>")` sans corps. Les stores avalent la plupart des erreurs (`.catch(() => isLoading = false)`), et les formulaires lancent les écritures sans `await`.

Constats de l'audit du 2026-10-05 traités dans ce change :

| Réf. | Constat | Gravité |
|---|---|---|
| F-H1 | Aucune gestion du 401 ni de l'expiration ; erreurs avalées | Haute |
| F-H2 | Formulaires sans `await` ni gestion d'erreur ; suppression sans confirmation | Haute |
| F-H3 | Double soumission par Entrée (`@keypress.enter` sur le conteneur + `@click`) | Haute |
| F-H4 | `MontantOp *= -1` sur « Débit » | Haute |
| F-H5 | Courses entre requêtes sur le compte actif, le « load more » et les soldes | Haute |
| F-H6 | Favori introuvable → `activeAccount` `undefined` → plantage | Haute |
| F-M1 | Lien direct vers un formulaire d'édition → création (doublon) | Moyenne |
| F-M2 | `Frequence === 7` comparé à la chaîne `"7"` | Moyenne |
| F-M3 | Pointer recharge toute la liste ; `v-model` sur un computed en lecture seule | Moyenne |
| F-M4 | Clés `operation-<IDop>` en double si la pagination renvoie des doublons | Moyenne |
| F-M5 | Erreur réseau sur `/users/exists` → déconnexion | Moyenne |
| F-M8/M9 | Dates en UTC (`toISOString`) ; format non ISO pour les graphiques | Moyenne |
| F-M10 | Pseudo-comptes : état mélangé avec la liste d'opérations | Moyenne |
| F-M11 | `err.response` (reste d'axios) : messages serveur jamais affichés | Moyenne |
| F-M12 | Virement : `porteFeuilleCompte.value[0]` sans garde ; effet de bord dans un computed | Moyenne |
| F-M13 | La suggestion écrase `IDcat` d'une opération existante ; réponses hors d'ordre | Moyenne |
| F-M14 | `balance?.solde \|\| MontantInitial` dans `credits.vue` | Moyenne |
| F-B* | Highcharts non détruits, timers non nettoyés, `%`/`_` non échappés, `NaN`, accessibilité, code mort, `any` | Basse |

Les points F-M6 et F-M7 (jeton lisible et logout incomplet) relèvent de `harden-api-security`.

## Goals / Non-Goals

**Goals :**
- Plus aucune saisie perdue ni dupliquée sans que l'utilisateur le voie.
- Un état du compte actif toujours cohérent avec le dernier choix de l'utilisateur.
- Une base commune pour les formulaires, qui réduit la duplication des 5 formulaires.

**Non-Goals :**
- La refonte visuelle des formulaires.
- Le mode hors ligne avec file d'attente des écritures.
- Le passage à `noImplicitAny: true`, qui relève de `harden-db-schema-and-cleanup` (dette technique). On se contente ici de typer les fichiers modifiés.

## Decisions

### D1. `ApiError` et intercepteur 401
`request()` lève `new ApiError(status, body)`, avec `body` contenant le JSON `{ error: { statusCode, name, message } }` s'il est disponible. Sur un 401, hors `POST /api/users/login`, le client :
1. purge la session locale (cookie `userID`, store utilisateur) ;
2. appelle `navigateTo('/login')`, une seule fois même si plusieurs requêtes échouent en parallèle (drapeau).

Si le change de sécurité livre le refresh token, l'intercepteur tente d'abord un refresh, une seule fois.

Un helper `errorMessage(e)` renvoie `e.body?.error?.message` ou un texte générique. Il remplace les `err.response…` existants.

### D2. `useEntityForm`
Un composable commun aux formulaires :

```ts
const { submitting, error, submit } = useEntityForm()
await submit(async () => { await store.save(entity) ; onSuccess() })
```

- `submit` ignore un appel tant que `submitting` vaut vrai ;
- il capture l'`ApiError` dans `error` ;
- il n'exécute `onSuccess`, qui réinitialise le formulaire ou navigue, qu'en cas de succès.

Chaque formulaire devient un `<form @submit.prevent="onSubmit">` avec un bouton `type="submit"`, et les `@keypress.enter` des conteneurs sont supprimés. La suppression passe par `confirm()`.

### D3. Signe des montants (`useMoneySign`)
- `setDebit()` donne `-Math.abs(x)` et `setCredit()` donne `Math.abs(x)` ;
- au blur, un champ vide ou invalide donne `0` (jamais `NaN`) ;
- avant l'envoi, le montant passe par `round2`.

Le composable est mutualisé entre `OperationForm`, `OperationRecurrenteForm` et `TransfertForm`. Le `formatAmount` dupliqué est remplacé par `<Currency>` ou un helper unique.

### D4. Édition par identifiant
Quand une route d'édition (`editOperation`, `editCredit`, `editBien`, `editOperationRecurrente`) s'ouvre et que l'entité est absente du store, le formulaire appelle `GET /api/<ressource>/{id}` (`fetchCreditById` existe déjà ; on ajoute ses équivalents). Pendant le chargement, le bouton d'enregistrement est désactivé. Un 404 ferme l'overlay avec un message. C'est déjà le cas de `CompteForm`, qui bloque l'enregistrement : on généralise.

### D5. Requêtes périmées sur le compte actif
Le store `operation` tient un compteur `requestSeq`, incrémenté à chaque `fetchOperationsOfActiveAccount`. Chaque réponse compare son numéro au compteur courant et à l'`IDcompte` demandé. Si l'un des deux diffère, elle est ignorée.
- `loadMoreOperations` capture `IDcompte` et `requestSeq` au départ, et se termine sans effet si l'un des deux a changé.
- `isLoading` n'est relâché que par la requête courante.
- Les opérations ajoutées sont dédupliquées par `IDop`.
- `setNewBalances(IDcompte, sums)` cible l'identifiant demandé et non le compte actif au moment de la réponse.
- *Alternative* : l'`AbortController`. On l'ajoute en complément pour économiser le réseau, mais le compteur suffit à garantir la cohérence.

### D6. Repli du compte actif et pseudo-comptes
- `fetchActiveAccount(id)` se replie sur le favori, puis sur le premier compte visible. Sans aucun compte, `activeAccount` vaut `null`, et `AccountHeader` comme `OperationList` affichent un état vide.
- Les pages à pseudo-compte (amortissement, récurrentes, stats, config…) ne modifient plus `activeAccount`. Elles posent un `pseudoAccountLabel` dans le store `compte`, et les récurrentes vont dans un état `recurringOperations` séparé.
- En entrant sur `/`, si `activeAccount` n'a pas d'`IDcompte`, le favori est rechargé.
- On supprime le test sur le libellé codé en dur `"Coûts d'usage"` et les filtres de contournement de `OperationList`/`recurrOperation`.

### D7. Pointage optimiste
`toggleCheck(op)` inverse `CheckOp` localement, appelle `PATCH /api/operations/{id}`, puis rafraîchit seulement les soldes (`sumForACompte`). En cas d'erreur, il rétablit la valeur et affiche un message. La case passe en `:checked` + `@change`.

### D8. Dates locales
`app/utils/date.ts` expose :
- `todayLocal()`, qui renvoie `YYYY-MM-DD` à partir de `getFullYear`/`getMonth`/`getDate` ;
- `monthRange(y, m)` et `yearRange(y)`, qui renvoient des chaînes locales ;
- `utcMonthStart(y, m)` et `utcMonthEnd(y, m)`, construits avec `Date.UTC`.

Toutes les occurrences de `toISOString().split('T')[0]` et des chaînes `` `${y}-${m}-01 00:00:00Z` `` sont remplacées.

### D9. Suggestion de catégorie
L'auto-sélection n'a lieu que pour une nouvelle opération dont `IDcat` vaut 0 et dont l'utilisateur n'a pas encore choisi de catégorie. Les réponses hors d'ordre sont ignorées (compteur), et le timer de debounce est nettoyé dans `onUnmounted`.

## Risks / Trade-offs

- [Redirection 401 pendant la saisie d'un formulaire] → Le brouillon en cours est conservé en `sessionStorage` (clé par route) et restauré après reconnexion. Si c'est trop coûteux, on accepte la perte, mais l'utilisateur est prévenu par un message explicite.
- [Régression visuelle sur les formulaires transformés en `<form>`] → Styles inchangés, et les tests de routes (`tests/integration/routes.spec.ts`) restent verts.
- [Changement du comportement des pseudo-comptes (D6)] → Vérification manuelle de chaque page à pseudo-compte avec la recette `docs/recette-non-regression-multiuser.md`.
- [`confirm()` natif peu esthétique sur mobile] → Accepté pour cette itération ; un composant de confirmation pourra suivre.

## Open Questions

- Faut-il conserver le brouillon d'un formulaire lors d'une expiration de session (voir Risques) ?
- Faut-il réintroduire le swipe-to-delete mentionné dans la documentation, ou retirer la mention ?
