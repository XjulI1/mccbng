# Plan de recette — Non régression multi-utilisateurs

Ce plan couvre les modifications apportées sur la branche
`claude/analyze-multiuser-architecture-PsOtk` pour étanchéifier le cloisonnement
des données entre utilisateurs (scoping `IDuser`, scoping via `Compte` pour les
modèles sans colonne `IDuser`, statistiques basées sur le JWT, requêtes SQL
paramétrées).

## Pré-requis

- 2 utilisateurs distincts : **U1** et **U2** (chacun avec son `secret_key` 6 caractères)
- Chaque utilisateur dispose de :
  - 1+ banque utilisée
  - 2+ comptes
  - 5+ opérations
  - 1+ opération récurrente
  - 1+ catégorie personnelle
- Conserver les IDs de U2 pour tenter les accès croisés avec le token de U1
- Catégorie système (`IDuser = 0`) présente en base
- Backend démarré (`pnpm start` dans `back/`) et frontend (`pnpm dev` dans `front/`)
- Accès direct à la base MySQL pour vérifications

## 1. Authentification / signup

| #   | Cas                                            | Attendu                              |
| --- | ---------------------------------------------- | ------------------------------------ |
| 1.1 | Login U1 avec code valide                      | 200, token + userId                  |
| 1.2 | Login code inexistant / mauvais format         | 401                                  |
| 1.3 | `GET /users/whoAmI` avec token U1              | Renvoie U1                           |
| 1.4 | Signup email déjà utilisé                      | 409                                  |
| 1.5 | Signup `secret_key` déjà utilisé               | 409                                  |
| 1.6 | Signup payload contenant un `id`/`IDuser` client | Ignoré, nouvel UUID généré          |

## 2. Banques (catalogue global)

| #   | Cas                          | Attendu                          |
| --- | ---------------------------- | -------------------------------- |
| 2.1 | U1 `GET /banques`            | Liste complète (partagée)        |
| 2.2 | U2 `GET /banques`            | Même liste que U1                |
| 2.3 | U1 `POST /banques`           | Banque visible par U2            |
| 2.4 | Sans token                   | 401                              |

## 3. Comptes (scope `IDuser`)

| #   | Cas                                              | Attendu                            |
| --- | ------------------------------------------------ | ---------------------------------- |
| 3.1 | U1 `GET /comptes`                                | Seulement comptes de U1            |
| 3.2 | U1 `GET /comptes/{idCompteU2}`                   | 404                                |
| 3.3 | U1 `PATCH /comptes/{idCompteU2}`                 | 404, aucune modif                  |
| 3.4 | U1 `DELETE /comptes/{idCompteU2}`                | 404                                |
| 3.5 | U1 `POST /comptes` sans `IDuser`                 | Créé avec `IDuser = U1`            |
| 3.6 | U1 `GET /comptes/{idCompteU1}/banque`            | Banque retournée                   |
| 3.7 | U1 `GET /comptes/{idCompteU2}/banque`            | 404                                |

## 4. Opérations (scope via `Compte`)

| #    | Cas                                                              | Attendu                                                       |
| ---- | ---------------------------------------------------------------- | ------------------------------------------------------------- |
| 4.1  | U1 `GET /operations`                                             | Uniquement opérations sur comptes de U1                       |
| 4.2  | U1 `GET /operations/{idOpU2}`                                    | 404                                                           |
| 4.3  | U1 `PATCH /operations/{idOpU2}`                                  | 404                                                           |
| 4.4  | U1 `DELETE /operations/{idOpU2}`                                 | 404                                                           |
| 4.5  | U1 `POST /operations` avec `IDcompte` de U2                      | 404                                                           |
| 4.6  | U1 `POST /operations` avec `IDcompte` de U1                      | 200                                                           |
| 4.7  | `GET /operations/sumAllCompteForUser` (U1)                       | Totaux sur comptes de U1 uniquement                           |
| 4.8  | `GET /operations/sumForACompte?id={idCompteU2}` (U1)             | 404                                                           |
| 4.9  | `GET /operations/sumByUserByMonth` (U1, avec `IDCompte` de U2)   | 404                                                           |
| 4.10 | `GET /operations/sumCategoriesByUserByMonth` (U1)                | Somme limitée aux comptes U1 et catégories `IDuser IN (0, U1)` |
| 4.11 | `GET /operations/suggestCategories?operationName=ca`             | Suggestions basées uniquement sur historique U1               |

## 5. Opérations récurrentes (scope via `Compte`)

| #   | Cas                                                                                                  | Attendu                                                                                                              |
| --- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 5.1 | U1 `GET /operation-recurrentes`                                                                      | Uniquement récurrentes sur comptes U1                                                                                |
| 5.2 | U1 `PATCH /operation-recurrentes/{idU2}`                                                             | 404                                                                                                                  |
| 5.3 | U1 `POST /operation-recurrentes` IDcompte U2                                                         | 404                                                                                                                  |
| 5.4 | U1 `POST /operation-recurrentes/auto-generation`                                                     | Génère des `Operation` pour les seuls comptes U1 ; aucune écriture d'`IDuser` (colonne inexistante) ; `DernierDateOpRecu` mis à jour |
| 5.5 | Vérifier en base qu'aucune `Operation` générée n'a d'`IDcompte` appartenant à un autre utilisateur   | OK                                                                                                                   |

## 6. Catégories

| #   | Cas                                          | Attendu                                                  |
| --- | -------------------------------------------- | -------------------------------------------------------- |
| 6.1 | U1 `GET /categories`                         | Catégories U1 + catégories système (`IDuser = 0`)        |
| 6.2 | U1 `GET /categories/{catU2}`                 | 404                                                      |
| 6.3 | U1 `PATCH /categories/{catU2}`               | 404                                                      |
| 6.4 | U1 `POST /categories` sans `IDuser`          | Créé avec `IDuser = U1`                                  |
| 6.5 | U1 `DELETE /categories/{catSystème}`         | 404 (non propriétaire)                                   |

## 7. Statistiques

| #   | Cas                                                              | Attendu                                              |
| --- | ---------------------------------------------------------------- | ---------------------------------------------------- |
| 7.1 | U1 `GET /stats/evolutionSolde` (sans userID dans URL)            | Évolution basée sur `IDuser` du JWT                  |
| 7.2 | Ancien appel `GET /stats/evolutionSolde/{userID}`                | 404 (route supprimée)                                |
| 7.3 | Vérifier pas d'injection SQL via filtre (requête paramétrée)     | OK                                                   |

## 8. Frontend — flux bout-en-bout

| #   | Scénario                                              | Attendu                                                              |
| --- | ----------------------------------------------------- | -------------------------------------------------------------------- |
| 8.1 | Login U1                                              | Dashboard avec comptes/opérations de U1                              |
| 8.2 | Création opération                                    | Apparaît dans la liste, solde recalculé                              |
| 8.3 | Transfert entre 2 comptes U1                          | 2 opérations créées, soldes cohérents                                |
| 8.4 | Auto-génération récurrentes                           | Nouvelles opérations visibles                                        |
| 8.5 | Stats mensuelles (pie) + évolution (time series)      | Données affichées, aucun appel contenant `/{userID}`                 |
| 8.6 | Logout puis login U2                                  | Aucune donnée de U1 visible (onglet réseau + UI)                     |
| 8.7 | Ajout catégorie perso                                 | Visible par U1, invisible pour U2                                    |
| 8.8 | Mode sombre / clair / système                         | Persistant, pas de régression visuelle                               |
| 8.9 | PWA mobile, swipe sur opération                       | Actions check/uncheck/delete fonctionnelles                          |

## 9. Sécurité transverse

- Rejouer l'ensemble des requêtes des sections §3 à §7 **sans Authorization** → 401
- Tester avec un JWT expiré / altéré → 401
- Injecter un `IDuser` différent dans le body (`POST /comptes`, `POST /categories`) → ignoré, valeur du JWT utilisée
- Vérifier les logs serveur : pas de requêtes SQL construites par concaténation

## 10. Critères de validation

- 100 % des tests §1 à §7 au vert
- Aucune fuite de données entre U1 et U2 (y compris côté onglet réseau)
- `pnpm build` et `pnpm lint` OK sur `back/` et `front/`
- Aucune régression sur : auto-génération récurrentes, stats, suggestions de catégories, transfert, amortissement
