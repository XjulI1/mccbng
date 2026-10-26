## Why

L'audit du 2026-10-05 relève dans la SPA (`app/`) des défauts graves de session et d'état, qui font perdre le fil à l'utilisateur sans qu'il le voie :
- une session expirée laisse l'application figée sans retour vers le login, et les erreurs HTTP sont avalées par les stores ;
- une coupure réseau à l'ouverture de la PWA déconnecte l'utilisateur ;
- un changement rapide de compte affiche les opérations ou les soldes d'un autre compte ;
- un favori introuvable fait planter l'accueil ;
- les pages sans compte réel (récurrentes, stats, crédits…) écrasent le compte actif ;
- pointer une opération recharge toute la liste et perd la position de défilement.

L'application est utilisée en PWA mobile, souvent ouverte plus longtemps que la session (6 h) et parfois hors ligne : ces cas sont courants, pas marginaux.

C'est le premier des trois changes issus du découpage d'`improve-front-reliability`. `improve-front-forms` et `improve-front-stats-a11y-cleanup` s'appuient sur lui.

## What Changes

- **Erreurs HTTP typées** : `request()` lève une `ApiError { status, body }`, et un helper `errorMessage(e)` en extrait le message serveur. Les stores remettent leurs indicateurs de chargement dans un `finally` et propagent l'erreur.
- **401 global** : hors `POST /api/users/login`, un 401 purge la session locale et redirige une seule fois vers `/login`, avec un point d'accroche avant la redirection (utilisé par le brouillon d'`improve-front-forms`).
- **Hors ligne ≠ déconnexion** : seul un 401 ou un 403 de `GET /api/users/exists` supprime la session.
- **Compte actif cohérent** :
  - une réponse périmée (autre compte, requête plus ancienne) est ignorée ;
  - les soldes sont appliqués au compte demandé ;
  - **pagination par curseur** `(CheckOp, DateOp, IDop)` au lieu de `skip`, pour la liste du compte comme pour la recherche : ni trou ni doublon quand on pointe, crée ou supprime une opération ;
  - un favori introuvable est remplacé par le premier compte visible, puis par un état vide.
- **Pseudo-comptes isolés** : les 9 pages sans compte réel posent un libellé (`pseudoAccountLabel`) au lieu d'écraser `activeAccount` ; les récurrentes ont leur propre état.
- **Pointage optimiste** : mise à jour locale, `PATCH`, rafraîchissement des seuls soldes ; retour arrière et message en cas d'échec.
- **Génération des récurrentes** : la promesse est attendue avant de recharger les soldes.

## Capabilities

### New Capabilities
_Aucune._

### Modified Capabilities
- `front-auth-session` : expiration de session gérée à tout moment, une indisponibilité réseau ne déconnecte plus.
- `front-state` : erreurs HTTP typées, cohérence du compte actif, pagination par curseur, repli du favori, pseudo-comptes isolés, pointage optimiste.

## Impact

- **Code** :
  - `app/services/{http,auth,operation}.ts`, `app/middleware/auth.global.ts` ;
  - `app/stores/{operation,compte}.ts` ;
  - `AccountHeader.vue`, `OperationList.vue`, `Home/Operation.vue` ;
  - les 9 pages à pseudo-compte : `amortissement`, `recurrOperation`, `biens`, `editUser`, `config`, `stats`, `gestion`, `credits`, `comptesGestion`.
- **API** : aucun changement. La pagination par curseur utilise le filtre existant (`or`, `gt`, `lt`, tri départagé par `IDop` depuis `optimize-api-queries`).
- **Tests** : tests unitaires de `services/http`, `services/auth` et des stores (réponses périmées, curseur, soldes ciblés, repli du favori, pointage).
