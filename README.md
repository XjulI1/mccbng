# mccbng

**mccbng** (mCloud Compte and Budget Next Generation) est une application web de gestion de finances personnelles : suivi multi-banques et multi-comptes, opérations bancaires, opérations récurrentes, budget par catégorie, statistiques, suivi de crédits et de biens immobiliers.

L'application est un package `pnpm` unique (à la racine du dépôt) : une SPA Nuxt 4 (Vue 3, TypeScript, Pinia, PWA ; SSR désactivé, mode sombre, gestes tactiles) dont le serveur Nitro héberge aussi l'**API REST** (`server/`), sur MariaDB, avec authentification JWT. Un seul processus et une seule image Docker servent donc le front et l'API.

---

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Architecture technique](#architecture-technique)
- [Modèle de données](#modèle-de-données)
- [Démarrage rapide](#démarrage-rapide)
- [Configuration](#configuration)
- [Déploiement Docker](#déploiement-docker)

---

## Fonctionnalités

### Authentification et compte utilisateur
- Connexion par **code secret à 6 caractères** (`POST /api/users/login`) — pas de mot de passe à saisir.
- Session portée par un cookie `HttpOnly` (`mccbngAuth`, JWT de 6 h par défaut) illisible en JavaScript ; seul l'identifiant utilisateur (`userID`) est stocké côté front.
- Verrouillage temporaire du compte après 5 échecs consécutifs (5 min, 30 min, 2 h, puis 24 h) ; la déconnexion ferme la session sur tous les appareils.
- Pas d'inscription par l'API : les utilisateurs sont créés dans phpMyAdmin, avec un code hashé par `pnpm hash-code` (voir `docs/exploitation.md`).
- Édition du profil (`PATCH /api/users/me`) : email, username, seuils d'alerte (`warningTotal`, `warningCompte`), favori (`favoris`).
- Vue **Mon compte** (`/editUser`) pour la mise à jour du profil.

### Comptes et banques
- Gestion de plusieurs **banques** et plusieurs **comptes** par banque.
- Chaque compte porte des indicateurs typés : `bloque`, `joint`, `children`, `retraite`, `porte_feuille`, `visible`.
- **Plafond** facultatif par compte (`Plafond`, ex. 22 950 € pour un livret A) : une jauge sous le solde du compte ouvert indique la part utilisée (pourcentage au-delà de 100 % si le plafond est dépassé), le reste disponible au survol. Affichage seul : le plafond ne bloque aucune opération.
- Liste latérale des comptes regroupée par type (disponibles, joints, enfants, retraite, portefeuille, bloqués).
- Calcul automatique des **soldes pointés / non pointés** par compte et des **totaux globaux** par catégorie de comptes.
- Masquage des montants à la volée (`maskAmount` dans le module `user`).

### Opérations bancaires
- CRUD complet des opérations (débit/crédit), avec date, libellé, montant, catégorie, indicateur "pointée" (`CheckOp`) et indicateur d'amortissement.
- Liste paginée par scroll infini (35 opérations par page) côté front.
- **Swipe-to-delete** et clic pour éditer sur mobile.
- **Virement** entre comptes (`/transfert`) : le serveur crée la paire débit + crédit en une requête (`POST /api/operations/transfert`).
- **Recherche** d'opérations par libellé sur tous les comptes (`/search`, loupe de l'en-tête de la liste des opérations).
- **Suggestion intelligente de catégorie** lors de la saisie : `GET /api/operations/suggestCategories` propose les catégories les plus fréquentes pour un libellé similaire.

### Opérations récurrentes
- Modèle de transaction récurrente avec fréquence (3 = mensuelle, 5 = trimestrielle, 7 = annuelle), jour (borné au dernier jour du mois), mois (0 = janvier) et date de dernière échéance générée.
- Génération automatique au chargement : `POST /api/operation-recurrentes/auto-generation` génère toutes les échéances dues jusqu'à 15 jours (mensuel), 20 jours (trimestriel) ou 30 jours (annuel) à l'avance, sans doublon même en cas d'appels simultanés.
- La mensualité d'un crédit se modifie depuis le crédit (lecture seule dans `/recurrOperation`).
- Vue dédiée `/recurrOperation` pour la gestion (création, édition, suppression).

### Récap (page d'accueil)
- Total global des comptes (affiché seulement ici) et progression vers l'objectif annuel (réglé dans le profil), mesurée depuis le 1er janvier, immobilier (valeur actuelle, à défaut prix d'achat), capital restant dû des crédits actifs et immobilier net.
- Taux d'épargne `(revenus − dépenses) / revenus` sur les 6 derniers mois complets, 1 an, 2 ans et 5 ans (mêmes règles que les Stats : `Type` de catégorie, transferts exclus) (`GET /api/stats/recap`).
- La liste des opérations du compte actif est sur `/operations`, ouverte en choisissant un compte.

### Catégorisation et budget
- **Catégories** définies par utilisateur, avec un drapeau `Stats` indiquant si elles entrent dans les statistiques de dépense.
- Vue **Statistiques** (`/stats`) :
  - Somme mensuelle des dépenses (`GET /api/operations/sumByUserByMonth`).
  - Répartition par catégorie en **camembert Highcharts** (`GET /api/operations/sumCategoriesByUserByMonth`).
  - **Évolution temporelle** des soldes (global, retraite, disponible) en time series (`GET /api/stats/evolutionSolde`).
  - Sélecteurs mois / année.

### Crédits (emprunts)
- Modèle **Credit** : nom, prêteur, montant initial, mensualité, taux d'intérêt, date début / fin, compte associé, statut (`actif` par défaut), catégorie.
- À la création d'un crédit, une **opération récurrente mensuelle est générée automatiquement** (`Frequence = 3`) et liée via `IDopRecu`.
- À la suppression, l'opération récurrente associée est supprimée, et les opérations passées comme le bien financé sont dissociés (`IDcredit` mis à `null`).
- Endpoints spécifiques :
  - `GET /api/credits/{id}/remaining-balance` — capital restant dû, principal et intérêts payés (sorties passées seulement, intérêts par mois civil).
  - `GET /api/credits/{id}/payments` — historique des prélèvements liés.
  - `GET /api/credits/{id}/rentabilite` — loyers du bien financé par le crédit, mensualités, effort mensuel et taux de couverture, sans les charges du bien (voir « Loyers et rentabilité »).
- Vue `/credits` : `CreditList` + `CreditCard` (avec barre de progression et, pour un crédit qui finance un bien loué, la ligne « Loyers · couverture · effort ») + `CreditForm`.

### Biens immobiliers
- Modèle **Bien** : nom, ville, type, surface, usage (`principale` par défaut), date d'achat, prix nu, frais de notaire, frais d'agence, apport cash, valeur actuelle estimée, loyer mensuel (`LoyerMensuel` : loyer attendu d'un bien locatif, loyer d'un logement équivalent sinon), rendement d'un placement sûr (`TauxPlacement`, biens non locatifs, 3 % par défaut), lien optionnel vers un crédit (`IDcredit`).
- CRUD scopé utilisateur ; vérification que le crédit lié appartient bien à l'utilisateur. **Un crédit finance un seul bien** : un crédit déjà affecté à un autre bien est refusé (409), et le formulaire ne le propose pas. La suppression d'un bien dissocie ses opérations et récurrentes (`IDbien` mis à `null`).
- Vue `/biens` : `BienList` + `BienCard` (résumé investissement / valorisation, loyer moyen d'un bien locatif, bilan depuis l'achat de tout bien, comparé à la location pour un bien non locatif) + `BienForm`.

### Loyers et rentabilité
- **Saisie** : dans le formulaire d'une opération ou d'une opération récurrente, le champ « Bien » rattache l'opération à un bien (`IDbien`). Lier la récurrente « Loyer » existante pour que les loyers générés ensuite portent le bien, **et lier aussi les loyers déjà encaissés** depuis le début de la location (la recherche par nom les retrouve) : les indicateurs sont des moyennes sur toute la durée de la location, et un mois sans loyer lié compte comme un mois sans loyer. Une opération positive liée au bien est un **loyer**, une opération négative une **charge** (taxe foncière, copropriété, assurance…). Ne lier que les loyers et charges courantes : ni l'achat, ni l'apport, ni le dépôt de garantie.
- Une opération liée à un crédit (mensualité, déblocage) n'est jamais comptée comme loyer ou charge, même si elle porte aussi le bien.
- **Loyer attendu** : le champ « Loyer mensuel attendu » d'un bien locatif sert aux valeurs prévisionnelles tant que la location n'a pas commencé : ni date de mise en location ni loyer lié, ou une location qui démarre au mois en cours ou plus tard. Dès qu'un mois complet de location est écoulé, les cartes affichent les loyers réellement liés, même nuls.
- **Part des charges dans le loyer perçu** : les loyers se saisissent tels que perçus, charges comprises (loyer + provision). Ce pourcentage, à calculer depuis le bail (par exemple 70 € de provision sur 720 € perçus, soit 9,7 %), est retiré des loyers pour obtenir le **loyer hors charges** : loyer moyen affiché et couverture du crédit (750 € perçus avec 10 % donnent 675 €). Les loyers et dépenses et le gain total du bilan restent calculés sur l'argent réellement encaissé et payé : la provision y compense déjà les charges de copropriété liées au bien.
- **Date de mise en location** : à renseigner sur un bien locatif, surtout s'il a d'abord été occupé par son propriétaire. Les indicateurs ci-dessous démarrent à cette date ; sans date, ils démarrent au premier loyer lié au bien ; sans date ni loyer, les cartes affichent les valeurs prévues.
- **Indicateurs** (sur toute la durée de la location : de la date de mise en location au dernier mois complet, mois en cours exclu ; les cartes affichent « depuis <mois année> ») :
  - carte du crédit : loyer mensuel moyen hors charges, **mensualité moyenne** réellement payée (changement de mensualité et report d'échéances compris), **taux de couverture** de cette mensualité par les loyers hors charges, et **effort mensuel** = mensualité moyenne − loyer moyen hors charges (ou cash-flow s'il est positif). Les charges du bien n'y figurent pas : loyers + effort = mensualité ;
  - carte du bien : loyer mensuel moyen hors charges (les rendements ne sont pas calculés pour l'instant).
- **Bilan depuis l'achat** (carte d'un bien) :
  - **plus-value** = valeur actuelle − prix total (0 si la valeur actuelle n'est pas renseignée, ce que la carte indique) ;
  - **loyers et dépenses** = toutes les entrées liées au bien (loyers) − toutes les sorties liées au bien (charges, taxe foncière, assurances, et aussi les dépenses de la période où tu l'occupais si tu les lies) : le bilan couvre toute la vie du bien, location et usage personnel. Les flux qui financent l'achat (apport, acompte notaire, dons pour l'achat) ne doivent **pas** être liés : le prix total est déjà retiré par la plus-value ;
  - **intérêts d'emprunt** = intérêts versés sur le crédit lié, les mêmes que ceux de la carte du crédit ;
  - **loyers évités pendant l'occupation** (bien locatif habité avant sa mise en location) = loyer attendu converti en charges comprises avec la part des charges (650 € et 10 % donnent 722,22 €) × mois écoulés du mois d'achat au mois de la date de mise en location. Les charges de cette période étant liées au bien, ce loyer charges comprises les compense. C'est le loyer d'aujourd'hui appliqué au passé : il surestime un peu ces loyers évités, d'où l'intérêt d'un loyer attendu prudent. La ligne n'apparaît que si le loyer attendu et la date de mise en location sont renseignés et que cette date suit le mois d'achat. Aucun rendement de placement n'est déduit, comme pour le reste du bilan d'un bien locatif ;
  - **gain total** = plus-value + loyers et dépenses − intérêts (+ loyers évités pendant l'occupation). Le capital remboursé n'est pas compté comme une perte, car il est déjà dans la plus-value. Après la fin du crédit, chaque loyer s'ajoute au gain ;
  - **crédit payé par les loyers** = loyers perçus après abattement pour charges ÷ mensualités payées ;
  - pour un bien non locatif (résidence principale ou secondaire), la carte affiche aussi ce bilan, sans loyers : la ligne s'appelle « Dépenses », le total « Bilan » (il ne compte pas le loyer économisé, d'où l'absence de « gain »), sauf si le bien est comparé à la location (ci-dessous) et la part du crédit payée par les loyers n'est pas affichée ;
  - ces chiffres ne sont justes que si tout l'historique est lié au bien (loyers et charges depuis le début de la location) et si toutes les mensualités du crédit sont saisies dans l'application.
- **Comparaison avec la location** (carte d'un bien non locatif dont le « Loyer d'un logement équivalent, charges comprises » est renseigné) : l'achat est-il plus intéressant que d'être resté locataire ? Le bloc « Bilan depuis l'achat » se poursuit avec les deux lignes suivantes et se termine par le gain par rapport à la location au lieu du « Bilan » :
  - **loyers évités** = loyer équivalent × mois écoulés depuis le mois d'achat (mois en cours exclu) ;
  - **rendement si l'argent avait été placé** = ce qu'aurait rapporté l'argent immobilisé dans le bien, placé au taux saisi (3 %/an par défaut), intérêts composés chaque mois : la part du prix total non empruntée dès le mois d'achat, puis le capital remboursé chaque mois sur le crédit lié ;
  - **gain par rapport à la location** = bilan + loyers évités − ce rendement. Positif : l'achat a été plus intéressant que la location.
  - Le résultat dépend surtout de la valeur actuelle et du loyer équivalent : retenir des estimations prudentes (annonces du quartier pour un logement comparable). Les frais d'achat pèsent les premières années : l'achat devient souvent gagnant au bout de 5 à 8 ans. Le modèle ne place pas l'écart mensuel entre ce que coûte le bien et le loyer évité.
- Les loyers ne modifient ni le capital restant dû du crédit, ni les soldes, ni les statistiques (ils y figurent déjà comme opérations de catégorie `revenu`). Le loyer attendu n'entre dans aucun solde ni graphique.

### Amortissement
- Vue `/amortissement` qui filtre les opérations marquées `amortissement = 1` (typiquement le capital remboursé sur les crédits) avec un rendu spécifique.

### Configuration et UX
- **Thèmes** : clair / sombre / système (composable `useTheme`), persistance `localStorage`, suivi du `prefers-color-scheme`, attribut `data-theme` sur `<html>`.
- **PWA** : manifeste « MCCB NG », mode `standalone`, service worker `autoUpdate` via `@vite-pwa/nuxt`.
- **Mobile** : panneau gauche escamotable au swipe, layout responsive (breakpoint 768 px).
- **Outils de debug** : intégration optionnelle d'Eruda (panneau dev mobile) chargé à la demande via `useDebugTools` et togglée dans `/config`.
- Vue `/config` : recharger l'application, éditer le compte, basculer le thème, activer les outils de debug, se déconnecter.

---

## Architecture technique

### Stack

| Couche       | Technologies |
|--------------|--------------|
| Frontend     | Nuxt 4 (SPA, `ssr: false`, `compatibilityVersion: 5`, auto-imports désactivés), Vue 3.5, Pinia, TypeScript 5, SCSS, Highcharts 12, FontAwesome, `vue3-touch-events`, `@vite-pwa/nuxt`, Vitest |
| API          | Serveur Nitro de Nuxt (Node.js ≥ 26, TypeScript 5), Drizzle ORM + `mysql2`, Zod, `jsonwebtoken`, `bcryptjs`, `nuxt-security` |
| Base données | MariaDB 10.11 (InnoDB, utf8mb4, migrations SQL versionnées : voir `docs/db-migrations.md`) |
| Build / déploiement | Docker (multi-stage), Node/Nitro, `pnpm` |

### Vue d'ensemble

```
                     ┌─────────────────────┐
                     │   Browser / PWA     │
                     │  (nuxt spa + pinia) │
                     └──────────┬──────────┘
                                │ fetch, cookie HttpOnly
                                ▼
   ┌──────────────────────────────────────────────────┐
   │   Nuxt / Nitro (port 8080)                       │
   │   - SPA + service worker                         │
   │   - API REST /api/**  (server/api)         │
   │   - middleware CSRF + JWT, Zod, erreurs JSON     │
   │   - nuxt-security : en-têtes, CSP, rate-limit    │
   └──────────────────────────────┬───────────────────┘
                                  ▼
                        ┌──────────────────┐
                        │  MariaDB 10.11   │
                        └──────────────────┘
```

### API serveur (`server/`)

```
server/
├── api/                    # une route par fichier (file-based routing Nitro)
│   ├── [resource]/*.ts     #   CRUD générique : banques, categories
│   ├── comptes|operations|operation-recurrentes|credits|biens/*.ts   # CRUD + routes spécifiques
│   ├── users/*.ts, ping.get.ts
│   ├── stats/*.ts          #   statistiques
│   └── [...path].ts        #   404 JSON pour toute route /api inconnue
├── middleware/auth.ts      # CSRF puis JWT du cookie sur /api/** (sauf ping et login)
├── plugins/                # contrôle de la configuration au démarrage, fermeture du pool MySQL
├── db/                     # schema.ts (Drizzle), client.ts (pool mysql2), migrations/*.sql
└── utils/                  # auth, config, crud, filter, resources, scope, sql, stats, errors…
```

- **Configuration** (`utils/config.ts`) : lue dans `process.env` à l'exécution (voir [Configuration](#configuration)) ; le serveur refuse de démarrer en production si une variable obligatoire manque.
- **CRUD générique** (`utils/crud.ts`, `utils/resources.ts`) : chaque ressource est décrite une fois (table, scope, schémas Zod, défauts, hooks de cascade) et expose les 8 routes standard (`POST /`, `GET /count`, `GET /`, `PATCH /`, `GET|PATCH|PUT|DELETE /{id}`).
- **Filtre de liste** (`utils/filter.ts`) : le paramètre `filter` (`where`, `order`, `limit`, `skip`, `include`) est interprété avec une liste blanche de colonnes et d'opérateurs (jamais interpolé dans le SQL).
- **Sécurité par scope** (`utils/scope.ts`) :
  - **Direct** : `Bien`, `Credit`, `Compte`, `Categorie` portent un champ `IDuser` ; toute requête est combinée à `IDuser = <utilisateur du JWT>`. Les catégories partagées (`IDuser = 0`) sont lisibles par tous mais non modifiables.
  - **Hérité** : `Operation` et `OperationRecurrente` n'ont pas d'`IDuser` ; on filtre sur `IDcompte ∈ comptes de l'utilisateur`. Une ressource d'autrui répond **404**.
- **Authentification** : l'utilisateur courant est toujours retrouvé par `IDuser` (clé primaire), jamais par la colonne `id`, non unique en production.
- **Erreurs** : format uniforme `{ "error": { "statusCode", "name", "message" } }` (`defineApiHandler`) ; une erreur inattendue renvoie un 500 générique, détaillée seulement dans les logs.
- **SQL analytique** (`utils/sql.ts`, `utils/stats.ts`) : requêtes brutes paramétrées pour les agrégats et les statistiques.
- **Migrations** : fichiers SQL versionnés (`server/db/migrations`), appliqués par `scripts/db-migrate.mjs` (voir `docs/db-migrations.md`).

### Architecture frontend (`app/`)

```
nuxt.config.ts          → ssr:false, compatibilityVersion 5, auto-imports off, PWA, SCSS global
server/                → API REST hébergée par Nitro (voir plus haut)
app/app.vue            → layout : AccountHeader (top) + CompteList (gauche) + NuxtPage + NavBar (bas)
app/pages/             → routes file-based ; les overlays sont des pages enfants (RouteOverTheContent)
app/middleware/        → auth.global.ts : redirection /login, réhydratation de la session
app/stores/            → Pinia, 9 stores (setup stores)
app/services/*.ts      → couche API (fetch) — un fichier par domaine
app/composables/       → useTheme, useDebugTools (singletons via useGlobal*)
app/components/        → cartes / formulaires / listes par domaine
app/plugins/           → FontAwesome (global), vue3-touch-events (client)
app/assets/styles/     → variables.scss + theme.css (custom properties) + main.css
```

**Stores Pinia** (9) : `user`, `compte`, `operation`, `category`, `stats`, `display`, `credit`, `bien`, `banque`.

**Pattern d'overlay** : les routes enfant (`/newOperation`, `/editCredit/:id`, `/newBien`, etc.) instancient toutes le même composant `RouteOverTheContent` qui rend dynamiquement le formulaire (`operation-form`, `credit-form`, `bien-form`, `transfert-form`, `operation-recurrente-form`, `search`, `compte-form`) selon le `componentName` déclaré dans la meta de la page (`definePageMeta`). Cela évite de gérer un état modal ailleurs.

**Nuxt / PWA** :
- Le front appelle l'API en chemin relatif (`/api/**`), servie par le même serveur Nitro.
- Aucun auto-import : tous les `ref`, `useRoute`, `defineStore`, composants… sont importés explicitement.
- Service worker auto-update (`service-worker.js`), manifeste `MCCB NG` / `MCCB`, icônes 192/512 ; le shell SPA est prérendu pour le fallback de navigation.
- Production : image Node qui exécute la sortie Nitro (`.output/server/index.mjs`), port 8080.

### Flux d'authentification

1. Le front appelle `POST /api/users/login` avec `{ email, code }` (code de 6 caractères).
2. Le serveur retrouve l'utilisateur par email et compare le code à `secret_key` (bcrypt uniquement : une `secret_key` en clair est refusée). Une comparaison factice de même coût est faite si l'email est inconnu pour égaliser les temps de réponse. Après 5 échecs consécutifs, le compte est verrouillé (5 min, 30 min, 2 h, puis 24 h) sans le révéler. Chaque tentative produit une ligne de log JSON (`"event":"login"`), sans le code.
3. Un JWT `{ name, email, IDuser, tv }` est signé en HS256 (`JWT_SECRET`, émetteur et audience `mccbng`, durée `JWT_TTL_SECONDS`, 6 h par défaut) et posé uniquement dans le cookie `mccbngAuth` (`HttpOnly`, `SameSite=Strict`, `Secure` en production) ; la réponse contient `{ userId: <IDuser> }`.
4. Le front ne conserve que `IDuser`, dans le cookie `userID`.
5. Le navigateur renvoie le cookie à chaque requête ; le front ajoute `X-Requested-With: mccbng`, exigé sur toute méthode non sûre (protection CSRF, 403 sinon). Le middleware `server/middleware/auth.ts` vérifie le JWT et la `tokenVersion` de l'utilisateur (incrémentée au logout, ce qui révoque toutes ses sessions), et `getCurrentUserId` scope chaque requête à l'utilisateur. Un header `Authorization: Bearer` est refusé.
6. Le login est limité à 5 essais par IP et par fenêtre de 15 minutes (`nuxt-security`). L'IP est lue dans `X-Real-IP`, posé par le reverse proxy (Synology DSM, à partir du `CF-Connecting-IP` de Cloudflare), à défaut l'adresse de la socket ; une IPv6 est comptée par son préfixe `/64`, et `X-Forwarded-For` n'est jamais pris en compte. Les en-têtes de sécurité et la CSP sont appliqués à toutes les réponses.

---

## Modèle de données

| Entité | Clé primaire | Champs principaux | Liens |
|--------|--------------|-------------------|-------|
| **User** | `IDuser` (non auto-incrémenté) | `email` (unique), `username`, `secret_key` (bcrypt), `favoris`, `warningTotal`, `warningCompte`, `failedLoginCount`, `lockedUntil`, `tokenVersion` | — |
| **Banque** | `IDbanque` | `NomBanque` | `hasMany Compte` |
| **Compte** | `IDcompte` | `NomCompte`, `solde` (DECIMAL), `IDuser`, `IDbanque`, `bloque`, `joint`, `children`, `retraite`, `porte_feuille`, `visible`, `Plafond?` | `belongsTo Banque` |
| **Operation** | `IDop` | `NomOp`, `MontantOp` (DECIMAL), `DateOp`, `CheckOp`, `IDcompte`, `IDcat`, `amortissement`, `IDcredit?`, `IDbien?` | scopée via `Compte` |
| **OperationRecurrente** | `IDopRecu` | `NomOpRecu`, `MontantOpRecu` (DECIMAL), `JourOpRecu`, `JourNumOpRecu`, `MoisOpRecu`, `Frequence` (3=mensuel, 5=trimestriel, 7=annuel), `DernierDateOpRecu`, `IDcompte`, `IDcat`, `IDcredit?`, `IDbien?` | scopée via `Compte` |
| **Categorie** | `IDcat` | `Nom`, `IDuser` (0 = catégorie partagée), `Type` (`depense` / `revenu` / `transfert`) | — |
| **Credit** | `IDcredit` | `NomCredit`, `NomPreteur?`, `MontantInitial` (DECIMAL), `MontantMensuel`, `TauxInteret?`, `DateDebut`, `DateFin`, `IDcompte`, `IDopRecu?`, `IDuser`, `Statut` (def `actif`), `IDcat` | — |
| **Bien** | `IDbien` | `NomBien`, `Ville`, `TypeBien`, `Surface?`, `Usage` (def `principale`), `DateAchat`, `PrixBienNu`, `FraisNotaire`, `FraisAgence`, `ApportCash`, `ValeurActuelle?`, `LoyerMensuel?`, `AbattementCharges?`, `DateMiseEnLocation?`, `IDcredit?`, `IDuser` | — |

> Les montants financiers utilisent le type SQL `DECIMAL(12,2)` (exact au centime), lus comme des nombres JSON ; les sommes calculées côté applicatif sont arrondies à 2 décimales.

### Endpoints REST principaux

| Méthode | Route | Description |
|--------:|-------|-------------|
| `POST`  | `/api/users/login` | Authentification par `email` + `code` (6 car.) — **publique** |
| `POST`  | `/api/users/logout` | Révoque toutes les sessions de l'utilisateur et efface le cookie |
| `GET`   | `/api/users/whoAmI` | Profil de l'utilisateur courant |
| `PATCH` | `/api/users/me` | Mise à jour du profil |
| `GET`   | `/api/users/exists` | Vérifie la validité de la session |
| `GET`   | `/api/ping` | Healthcheck — **public** |
| `GET`, `POST` | `/api/banques` | Banques partagées : lecture et création uniquement (modification et suppression en base) |
| `*`     | `/api/comptes`, `/api/categories` | CRUD scopés utilisateur |
| `*`     | `/api/operations` | CRUD opérations + endpoints d'analytics |
| `GET`   | `/api/operations/sumAllCompteForUser` | Totaux pointés / non pointés par compte |
| `GET`   | `/api/operations/sumForACompte?id=` | Totaux pour un compte |
| `GET`   | `/api/operations/sumByUserByMonth?monthNumber=&yearNumber=&IDCompte=` | Total dépenses du mois (catégories `Type = depense`, catégorie par défaut « Aucune » comprise) |
| `POST`  | `/api/operations/transfert` | Virement : débit + crédit en une requête |
| `GET`   | `/api/operations/sumCategoriesByUserByMonth?monthNumber=&yearNumber=` | Répartition mensuelle par catégorie |
| `GET`   | `/api/operations/suggestCategories?operationName=&limit=` | Suggestion par similarité de libellé |
| `*`     | `/api/operation-recurrentes` | CRUD opérations récurrentes |
| `POST`  | `/api/operation-recurrentes/auto-generation` | Génère les opérations dues |
| `*`     | `/api/credits` | CRUD crédits (création auto d'une op. récurrente) |
| `GET`   | `/api/credits/{id}/remaining-balance` | Capital restant dû / payé |
| `GET`   | `/api/credits/{id}/payments` | Historique de prélèvement |
| `GET`   | `/api/credits/{id}/rentabilite` | Loyers, mensualités, effort et couverture du crédit (sans les charges du bien) |
| `*`     | `/api/biens` | CRUD biens immobiliers |
| `GET`   | `/api/biens/{id}/rentabilite` | Loyers, charges, loyer moyen et bilan du bien |
| `GET`   | `/api/stats/recap` | Récap de la home : immobilier, capital restant dû, taux d'épargne 6 mois / 1 / 2 / 5 ans |
| `GET`   | `/api/stats/evolutionSolde` | Time series `global`, `retraite`, `dispo` |
| `GET`   | `/api/stats/yearComparison`, `topCategories`, `incomeVsExpense`, `topOperations`, `categoryHeatmap` | Statistiques annuelles et par catégorie |

> Toutes les routes (sauf `ping` et `login`) exigent le cookie de session ; les méthodes non sûres exigent en plus `X-Requested-With: mccbng`. Les listes acceptent un paramètre `filter` JSON (`where`, `order`, `limit`, `skip`, `include`).

---

## Démarrage rapide

### Pré-requis
- Node.js ≥ 26 (cf. `.nvmrc`)
- pnpm ≥ 10 (cf. `packageManager` dans `package.json`)
- MariaDB 10.11 (en local ou via Docker)
- Docker pour les tests d'API (MariaDB jetable via Testcontainers)

### Installation

```bash
pnpm install
```

### Base de données

```bash
# DB_* lues dans .env (ou ENV_FILE=…), l'environnement restant prioritaire
pnpm db:migrate                  # base vide : crée le schéma
pnpm db:migrate -- --baseline    # base de production existante : marque la baseline comme jouée
```

Voir `docs/db-migrations.md` pour la procédure complète.

### Lancer l'application (port 8080)

```bash
# variables DB_* et JWT_SECRET dans l'environnement ou dans .env
pnpm dev
```

### Tests / linting

```bash
pnpm test        # unitaires + intégration front (Vitest, environnement Nuxt)
pnpm test:api    # tests d'intégration de l'API sur un MariaDB 10.11 jetable (Docker requis)
pnpm lint
pnpm type-check
```

---

## Configuration

Toute la configuration serveur passe par des variables d'environnement, lues à l'exécution (aucun fichier de configuration embarqué dans l'image).

| Variable | Obligatoire | Rôle |
|----------|-------------|------|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | oui | connexion MariaDB |
| `JWT_SECRET` | oui en production | secret de signature des sessions (le garder fixe : un changement déconnecte tout le monde) |
| `JWT_TTL_SECONDS` | non | durée de vie du JWT en secondes (21600, soit 6 h, par défaut) |

En développement, `JWT_SECRET` peut être omis (un secret éphémère est généré, avec un avertissement). Le front appelle toujours l'API en chemin relatif (`/api`).

**Reverse proxy** : la chaîne est client → Cloudflare → proxy inversé Synology DSM → conteneur. DSM doit poser `X-Real-IP` avec l'IP du client fournie par Cloudflare (en-tête personnalisé `X-Real-IP` = `$http_cf_connecting_ip`), et le NAS ne doit être joignable que par Cloudflare (sinon `CF-Connecting-IP` peut être forgé). Le compteur du rate-limit est en mémoire : un stockage partagé serait nécessaire si l'application était répliquée. Procédures d'administration (création d'utilisateur, déverrouillage, banques) : `docs/exploitation.md`.

---

## Déploiement Docker

Une seule image contient le front **et** l'API :

```bash
pnpm docker:staging:build && pnpm docker:staging:push
pnpm docker:latest:build  && pnpm docker:latest:push
```

- Multi-stage `node:26-slim` (pnpm installé avec npm, car Node 26 n'embarque plus corepack) → `node:26-slim` qui exécute `.output/server/index.mjs` sur le port 8080, avec un healthcheck. Le contexte de build est la **racine du dépôt** (`docker build .`).
- Au démarrage, le conteneur sort avec un message explicite si `DB_*` ou `JWT_SECRET` manque.
- Les migrations SQL ne sont pas jouées par l'image : les lancer depuis le poste ou la CI avant de déployer une version qui en apporte (`docs/db-migrations.md`).
- Registre : `dockregistry.xju.fr/mccbng/front:{staging,latest}`.

Un `docker-compose.build.yml` et un script `build-and-push.sh` sont disponibles à la racine pour orchestrer le build (le conteneur de build utilise `docker:24-cli`, compatible avec l'API Docker du NAS).

### Historique et retour arrière

L'API LoopBack 4 (`back/`, image `mccbng/api`) a été remplacée par l'API Nitro. Pour revenir en arrière, redéployer les anciennes images `front` (qui proxifiait vers `API_URL`) et `api` encore présentes dans le registre. Le schéma de base de données n'a pas été modifié par la migration.

---

## Licence

MIT — © Xavier Julien
