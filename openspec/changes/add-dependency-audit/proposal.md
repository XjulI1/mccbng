## Why

La CI (`.github/workflows/ci.yml`) exécute le lint, le type-check, le build et les tests, mais aucun audit des dépendances : une vulnérabilité de gravité haute dans une dépendance d'exécution passerait inaperçue. Aujourd'hui, `pnpm audit --prod --audit-level high` signale deux avis sans correctif publié, limités à l'outillage Nuxt :
- `node-forge` (GHSA-86w9-cpqp-85rv), via `listhen` ;
- `braces` (GHSA-vfj7-8cjw-p6xm), via `nitropack` → `globby`.

L'audit du 2026-10-05 relève aussi deux helpers d'erreur inutilisés (`unprocessable`, `tooManyRequests` dans `server/utils/errors.ts`).

## What Changes

- Étape `pnpm audit --prod --audit-level high` dans la CI, bloquante.
- Liste d'exceptions dans `pnpm-workspace.yaml` (`auditConfig.ignoreGhsas`), chaque entrée commentée avec sa date, son chemin et sa justification, revue à chaque montée de version de Nuxt. La CI affiche les exceptions actives.
- Suppression de `unprocessable` et `tooManyRequests`.

Hors périmètre : warnings ESLint, `any` et `noImplicitAny`, traités par un change dédié au typage, à venir.

## Capabilities

### New Capabilities
- `code-quality` : exigences de qualité vérifiées en CI, en commençant par l'audit des dépendances.

### Modified Capabilities
_Aucune._

## Impact

- **CI** : `.github/workflows/ci.yml` (nouvelle étape dans le job `frontend` ou nouveau job).
- **Configuration** : `pnpm-workspace.yaml` (`auditConfig`).
- **Code** : `server/utils/errors.ts`.
- **Documentation** : `CLAUDE.md` (commande d'audit, procédure de revue des exceptions).
