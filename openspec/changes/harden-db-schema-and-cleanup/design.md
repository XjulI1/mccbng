## Context

`server/db/migrations/0000_baseline.sql` reproduit le DDL de production : un mélange de MyISAM (`Operation`, `OperationRecurrente`, `Compte`, `Categorie`, `Banque`, `User`) et d'InnoDB (`Credit`, `Bien`, `UserCredentials`), des colonnes en `utf8mb3`, des drapeaux `DEFAULT NULL`, des montants `FLOAT` et aucun index hors clés primaires. Le runner `scripts/db-migrate.mjs` applique les fichiers dans l'ordre, sans verrou, et refuse déjà d'appliquer la baseline sur un schéma existant sans `--baseline`.

Constats de l'audit du 2026-10-05 traités ici :

| Réf. | Constat |
|---|---|
| D-M2, B7, roadmap §1 | MyISAM : transactions sans effet |
| D-M7 | `FLOAT` : 150 000,01 est relu 150 000,02 |
| D-M8 | Pool `utf8mb4`, colonnes `utf8mb3` : erreur sur un emoji |
| D-M9 | Aucun index secondaire ; `MONTH()`/`YEAR()` non indexables |
| D-M10 | `management-info` : 3 requêtes par compte en parallèle (pool de 10) |
| D-M1 / F-M4 | Pagination `LIMIT/OFFSET` sans critère de départage |
| D-B5 / S-B5 | Liste sans `limit` non bornée |
| D-B3 | `like` sans échappement ; recherche par montant via `LIKE` sur un `FLOAT` |
| D-B6 | Runner : pas de verrou, échec partiel non signalé, `--baseline` sur base vide |
| D-B7 | `NATURAL JOIN Compte` fragile |
| D-B12 | Code mort serveur, routes CRUD dupliquées, `UNIQUE IDopRecu` redondant |
| Outils | 131 warnings ESLint ; `noImplicitAny: false` ; `node-forge` et `braces` (high, outillage de build) |

## Goals / Non-Goals

**Goals :**
- Des transactions réelles sur toutes les tables métier.
- Des montants exacts au centime.
- Des requêtes de liste et de stats indexées et bornées.
- Un runner de migrations sûr pour la production.
- Une CI qui empêche la dette de revenir.

**Non-Goals :**
- Les changements de comportement métier (récurrentes, stats) : couverts par `fix-recurring-and-credit-calculations`.
- La pagination par curseur : le départage par clé primaire suffit pour l'infinite scroll actuel.
- L'abandon de la table `Stats`, legacy et inutilisée : à traiter à part, après vérification.

## Decisions

### D1. Deux migrations distinctes
`0001_innodb_utf8mb4_indexes.sql` regroupe :
- `ALTER TABLE … ENGINE=InnoDB, CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci` ;
- `UPDATE Compte SET bloque = 0 WHERE bloque IS NULL`, et de même pour les autres drapeaux (`visible` à 1) ;
- `MODIFY … NOT NULL DEFAULT …` ;
- `DROP INDEX IDopRecu` ;
- `CREATE INDEX …`.

`0002_decimal_amounts.sql` porte `MODIFY … DECIMAL(12,2)` sur `Operation.MontantOp`, `OperationRecurrente.MontantOpRecu`, `Compte.solde`, `Credit.{MontantInitial, MontantMensuel}` et `Bien.{PrixBienNu, ValeurActuelle, FraisAgence, ApportCash, …}` (liste exacte à établir depuis la baseline).

On sépare les deux parce que `0002` modifie des valeurs : `FLOAT` arrondi vers `DECIMAL`. Elle mérite sa propre sauvegarde et sa propre vérification. `0001` est sans risque sur les valeurs.
- *Alternative* : une seule migration. Un rollback partiel serait plus difficile.

### D2. Lecture des DECIMAL en nombres
`mysql2` renvoie les `DECIMAL` en chaînes par défaut, ce qui casserait le contrat JSON consommé par le front. On ajoute `decimalNumbers: true` au pool (`server/db/client.ts`) et `decimal({ precision: 12, scale: 2, mode: 'number' })` dans le schéma Drizzle. `DECIMAL(12,2)` reste représentable exactement en `number` jusqu'à 10¹⁰, une marge suffisante.
- Le calcul côté JS reste en flottants : `round2` est appliqué aux sommes. Les agrégats SQL (`SUM`) sont exacts en `DECIMAL`.

### D3. Sécurité du runner
- `SELECT GET_LOCK('mccbng_migrate', 10)` en début d'exécution : échec explicite si le verrou n'est pas obtenu. `RELEASE_LOCK` dans un `finally`.
- `--baseline` vérifie que la table `User` existe ; sinon, refus avec un message.
- En cas d'erreur pendant un fichier, le message nomme le fichier et rappelle que le DDL MySQL n'est pas transactionnel : le fichier peut être partiellement appliqué.
- Les nouvelles migrations sont écrites de façon vérifiable : `information_schema` est contrôlé avant chaque `ALTER` via une procédure temporaire, ou le fichier est documenté comme non rejouable avec sa procédure de reprise.
- *Alternative* : passer à un outil tiers (drizzle-kit migrate, Flyway). On l'écarte : le runner actuel est testé et suffisant.

### D4. Pagination et limites
`utils/crud.ts` ajoute systématiquement `pk` (`DESC` si le dernier critère est `DESC`, `ASC` sinon) comme dernier critère d'`ORDER BY`. Sans `limit`, `DEFAULT_MAX_LIMIT` s'applique ; on vérifie que le front n'attend jamais plus. Sinon on documente une limite plus haute par ressource, par exemple pour les catégories.

### D5. Requêtes de dates indexables
`sumByUserByMonth`, `sumCategoriesByUserByMonth` et `stats.ts` calculent les bornes `[début, début du mois ou de l'année suivants)` en JS et filtrent `DateOp >= ? AND DateOp < ?`. Cela s'aligne avec D8 de `fix-recurring-and-credit-calculations` : si ce change est livré en premier, il reprend la même fonction.

### D6. `like` et recherche par montant
- `utils/filter.ts` échappe `\`, `%` et `_` dans la valeur fournie à `like` (avec `ESCAPE '\\'`) ; le joker reste ajouté par le code appelant.
- La recherche par montant : si le terme est numérique (virgule acceptée), elle filtre `MontantOp = ?` ou `ABS(MontantOp) = ?` au lieu d'un `LIKE` sur un nombre.

### D7. Routes CRUD unifiées
Les fichiers explicites `server/api/{comptes,operations,operation-recurrentes,credits}/` qui ne font que déléguer au CRUD générique sont remplacés par le routage `[resource]`. Les routes spécifiques (`management-info`, `sumForACompte`…) restent explicites. Les tests de routes servent de filet de sécurité.

### D8. Qualité
- **ESLint** : correction des 131 warnings, puis `--max-warnings 0` dans `lint:check`.
- **TypeScript** : `noImplicitAny: true` réactivé dans `nuxt.config.ts`, après correction. Si le volume est trop grand, on procède par lots (`server/` d'abord), avec `// @ts-expect-error` interdit.
- **Audit** : `pnpm audit --prod --audit-level high` en CI. Les advisories sans correctif publié et limitées au build (`node-forge` via `listhen`, `braces` via `nitropack`) sont listées dans une allowlist datée et revues à chaque montée de Nuxt.

## Risks / Trade-offs

- [`ALTER TABLE` sur `Operation` verrouille la table pendant la conversion] → Exécution hors heures d'usage, après sauvegarde (`mysqldump`). On mesure d'abord la durée sur une copie.
- [Index sur des `VARCHAR` en `utf8mb4` : limite de 767 octets sur les anciens formats de ligne] → Vérifier la version de MariaDB/MySQL et `innodb_default_row_format=DYNAMIC`. Les index prévus portent sur des colonnes numériques et des dates, donc ne sont pas concernés.
- [Valeurs `FLOAT` déjà imprécises arrondies différemment en `DECIMAL`] → Avant `0002`, un script compare `SUM` par compte avant et après sur une copie. On accepte un écart au centime, documenté.
- [Le front reçoit des chaînes si `decimalNumbers` est oublié] → Test API qui vérifie que `typeof MontantOp === 'number'`.
- [Unification des routes CRUD (D7) : régression d'URL] → `tests/api` et `tests/integration/routes.spec.ts` doivent rester verts sans modification de leurs attentes.

## Migration Plan

1. Sauvegarde complète de la production.
2. Répétition de `0001` puis `0002` sur une copie de production : mesurer la durée, comparer les sommes par compte, lancer `pnpm test:api` contre la copie.
3. Fenêtre de maintenance : arrêter l'application, puis `pnpm db:migrate`, déployer la version compatible (`decimalNumbers`) et redémarrer.
4. Rollback : restaurer la sauvegarde. Les migrations ne sont pas réversibles automatiquement ; `docs/db-migrations.md` décrit les `ALTER` inverses de `0001`.

## Open Questions

- Version exacte de MySQL ou MariaDB en production (formats de ligne, collation `utf8mb4_unicode_ci` ou `utf8mb4_0900_ai_ci`) ?
- Liste exhaustive des colonnes monétaires de `Bien` à convertir.
- Faut-il supprimer la table legacy `Stats` dans le même lot ?
