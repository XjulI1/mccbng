# Roadmap sécurité — connexion

Ce document liste les améliorations de sécurité **non encore implémentées** sur
le flux d'authentification, à reprendre dans une prochaine itération.

État courant (API hébergée dans le serveur Nitro de Nuxt, `server/`), issu en
grande partie du change `harden-api-security` (archivé le 2026-10-05,
`openspec/changes/archive/2026-10-05-harden-api-security`) :

- Login = `email` + code de 6 caractères ; `secret_key` **exclusivement bcrypt**
  (coût 12), une clé en clair est refusée ; comparaison factice de même coût pour
  les emails inconnus. Pas de route d'inscription : les utilisateurs sont créés
  dans phpMyAdmin avec `pnpm hash-code` (`docs/exploitation.md`).
- **Verrouillage du compte** après 5 échecs consécutifs (5 min, 30 min, 2 h, puis
  24 h) et **journal JSON** de chaque tentative (résultat, `IDuser`, IP, UA).
- **Rate-limiting** sur `POST /api/users/login` (5 tentatives / 15 min / IP) via
  `nuxt-security`. IP lue dans `X-Real-IP`, posé par DSM à partir du
  `CF-Connecting-IP` de Cloudflare ; IPv6 comptée par préfixe `/64` ;
  `X-Forwarded-For` jamais lu. Compteur en mémoire (une seule instance).
- **Session** portée uniquement par le cookie `mccbngAuth` (`HttpOnly`,
  `SameSite=Strict`, `Secure`), JWT HS256 avec `iss`/`aud`, TTL 6 h par défaut ;
  le logout révoque toutes les sessions de l'utilisateur (`tokenVersion`) ;
  protection CSRF (`X-Requested-With` + `Origin`).
- Banques partagées en lecture et création seules ; propriété des références
  `IDcompte`/`IDcredit`/`IDcat` contrôlée à l'écriture.
- **En-têtes de sécurité** (`nuxt-security`) : HSTS, `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, et une
  **Content-Security-Policy appliquée**.
- Validation systématique des entrées avec Zod, filtre de liste à liste blanche,
  isolation par utilisateur testée (une ressource d'autrui répond 404).

## Reste à faire

### 1. Schéma de base

- **Tables MyISAM** (`Operation`, `OperationRecurrente`, `Compte`, `Categorie`,
  `Banque`, `User`) : les transactions de l'API n'ont aucun effet. Conversion en
  InnoDB portée par le change `harden-db-schema-and-cleanup`, qui supprime aussi
  la colonne historique `User.id` et la table `UserCredentials`.

### 2. Si l'application est répliquée

- Rate-limit **partagé** : driver `unstorage` externe (Redis) pour
  `#rate-limiter-storage` de `nuxt-security`.

### 3. Détection (optionnel)

- Table `LoginAttempt` (`IDuser`, `ip`, `success`, `at`) pour monitorer et alerter
  sur les patterns suspects (password spraying), si le journal JSON ne suffit plus.

### 4. Facteur d'authentification (optionnel)

- Le code reste à 6 chiffres (10⁶ combinaisons), compensé par le verrouillage et
  le rate-limit. Un code plus long, TOTP ou WebAuthn relèverait d'un change dédié.
