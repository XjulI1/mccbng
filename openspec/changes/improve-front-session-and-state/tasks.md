## 1. Client HTTP et session

- [ ] 1.1 `app/services/http.ts` : classe `ApiError { status, body }`, helper `errorMessage(e, fallback)` ; tests unitaires (corps JSON, corps vide, erreur réseau)
- [ ] 1.2 Intercepteur 401 (hors login) : `onSessionExpired(handler)`, purge de la session locale, `navigateTo('/login')` une seule fois (drapeau remis à zéro au login) ; tests unitaires (trois 401 parallèles → une redirection)
- [ ] 1.3 `services/auth.ts` : `checkUserAuthentification` renvoie `valid | invalid | unknown`, cookies supprimés seulement sur 401/403 ; middleware et `hydrateSession` tolérants au réseau ; tests unitaires
- [ ] 1.4 Stores : remplacer les `.catch(() => isLoading = false)` silencieux par un `finally` et la propagation de l'erreur ; afficher l'erreur des chargements de liste

## 2. Compte actif et listes

- [ ] 2.1 `stores/operation.ts` : `requestSeq` et contrôle de l'`IDcompte` demandé (chargement, « load more », recherche), `isLoading` relâché par la requête courante, `AbortController`
- [ ] 2.2 Pagination par curseur `(CheckOp, DateOp, IDop)` pour la liste du compte et `(DateOp, IDop)` pour la recherche (`services/operation.ts`), curseur = dernière opération reçue du serveur, déduplication par `IDop`
- [ ] 2.3 `stores/compte.ts` : `setNewBalances(IDcompte, sums)` ; repli du favori sur le premier compte visible, puis `null`
- [ ] 2.4 `AccountHeader.vue`, `OperationList.vue` : rendu sûr si `activeAccount` est `null` (état vide)
- [ ] 2.5 Pseudo-comptes : `pseudoAccountLabel` dans le store `compte`, `pseudoOperations` et `recurringOperations` séparés ; adapter les 9 pages (`amortissement`, `recurrOperation`, `biens`, `editUser`, `config`, `stats`, `gestion`, `credits`, `comptesGestion`) ; recharger la liste du compte actif en revenant sur `/` ; supprimer le test sur `"Coûts d'usage"`
- [ ] 2.6 `Home/Operation.vue` et store : pointage optimiste avec rollback et message, `:checked` + `@change`, rafraîchissement des seuls soldes
- [ ] 2.7 Génération des récurrentes : retourner et attendre la promesse (`services/operation.ts`, `stores/compte.ts`) avant de recharger soldes et liste
- [ ] 2.8 Tests unitaires des stores : réponse périmée ignorée, « load more » après changement de compte, curseur après pointage (ni trou ni doublon), soldes ciblés, repli du favori, rollback du pointage

## 3. Vérification

- [ ] 3.1 `pnpm test`, `pnpm type-check`, `pnpm lint:check` verts (aucun nouveau warning)
- [ ] 3.2 Recette manuelle mobile (Safari iOS + Chrome Android) : expiration de session, ouverture hors ligne, changement rapide de compte, pointage en page 3 puis « load more », chacune des 9 pages à pseudo-compte puis retour à l'accueil
