## 1. Socle

- [ ] 1.1 `app/composables/useEntityForm.ts` (`submitting`, `error`, `submit`, messages par statut) ; tests unitaires (double appel ignoré, erreur conservée, `onSuccess` seulement en cas de succès)
- [ ] 1.2 `app/composables/useMoneySign.ts` (débit/crédit forcés, vide → 0, virgule acceptée, valeur absolue affichée, `round2`) ; tests unitaires
- [ ] 1.3 `app/composables/useFormDraft.ts` (sauvegarde sur `onSessionExpired`, restauration au montage, `try/catch`) et retour sur la route d'origine après reconnexion (`?redirect=`) ; tests unitaires
- [ ] 1.4 `todayLocal()` dans `app/utils/dates.ts` ; tests unitaires autour de minuit (fuseau Europe/Paris)
- [ ] 1.5 `app/utils/confirm.ts` (`confirmDelete`)

## 2. Migration des formulaires

- [ ] 2.1 `OperationForm.vue` : `<form @submit.prevent>`, `useEntityForm`, `useMoneySign`, `useFormDraft`, confirmation de suppression, `todayLocal`, suggestion de catégorie limitée aux nouvelles opérations, réponses périmées ignorées, timer nettoyé
- [ ] 2.2 `OperationForm.vue` et `OperationRecurrenteForm.vue` : groupe « Débit / Crédit » avant le champ montant ; champ montant en `type="text"` + `inputmode="decimal"` (aussi dans `TransfertForm.vue`)
- [ ] 2.3 `TransfertForm.vue` : comme 2.1 ; comptes choisis et distincts, `porteFeuilleCompte.value[0]?.IDcompte`, présélection hors computed
- [ ] 2.4 `OperationRecurrenteForm.vue` : comme 2.1 ; `v-model.number` sur `Frequence` (et `MoisOpRecu`)
- [ ] 2.5 `CreditForm.vue`, `BienForm.vue`, `CompteForm.vue`, `editUser.vue` : `<form>`, `useEntityForm` (409 email → « Cet email est déjà utilisé »), `useFormDraft` (sauf profil), `todayLocal`, suppression des `@keypress.enter`
- [ ] 2.6 Chargement par identifiant : `fetchOperationById`, `fetchRecurrenteById` ; réutiliser `fetchCreditById`, `fetchBienById` ; enregistrement désactivé pendant le chargement ; 404 → fermeture avec message
- [ ] 2.7 Confirmation sur toutes les suppressions (formulaires et listes)
- [ ] 2.8 Remplacer les `formatAmount` dupliqués (`BienForm`, `BienCard`, `CreditCard`, `biens.vue`, `credits.vue`) par `<Currency>` ou un helper unique

## 3. Vérification

- [ ] 3.1 `pnpm test`, `pnpm type-check`, `pnpm lint:check` verts (aucun nouveau warning) ; `tests/integration/routes.spec.ts` inchangé
- [ ] 3.2 Recette manuelle mobile (Safari iOS + Chrome Android) : double tap et Entrée sur chaque formulaire, débit cliqué deux fois, pavé décimal à l'ouverture du champ montant et saisie « 12,50 », rechargement sur `/editCredit/<id>` et `/editOperation/<id>`, saisie à 0 h 30, expiration de session pendant une création puis reconnexion, virement sans compte portefeuille
