## Context

`pnpm audit --prod --audit-level high` échoue aujourd'hui sur deux avis `high` sans version corrigée (`Patched versions: None`) :

| Paquet | Avis | Chemin |
|---|---|---|
| `node-forge` ≤ 1.4.0 | GHSA-86w9-cpqp-85rv | `nuxt > @nuxt/nitro-server > nitropack > listhen`, `nuxt > @nuxt/cli > listhen` |
| `braces` ≤ 3.0.3 | GHSA-vfj7-8cjw-p6xm | `nuxt > @nuxt/nitro-server > nitropack > globby > (fast-glob >) micromatch` |

Ces deux paquets ne servent qu'au serveur de développement et au build : `listhen` (HTTPS du serveur de dev) et `globby` (scan de fichiers au build). Ils ne sont pas exécutés par l'image de production, qui ne lance que `.output/server/index.mjs`. `pnpm audit --prod` les remonte quand même parce que `nuxt` est une dépendance de production.

Le dépôt corrige déjà des avis par `overrides` dans `pnpm-workspace.yaml` (`brace-expansion`, `js-yaml`…), ce qui n'est pas possible ici faute de version corrigée.

## Goals / Non-Goals

**Goals :**
- Toute nouvelle vulnérabilité `high` ou `critical` fait échouer la CI.
- Les exceptions sont explicites, datées, justifiées et visibles dans la sortie de CI.

**Non-Goals :**
- L'audit des dépendances de développement (`--prod` seulement).
- Le lint et le typage strict : change dédié à venir.

## Decisions

### D1. Exceptions dans `auditConfig.ignoreGhsas`
Les exceptions vivent dans `pnpm-workspace.yaml`, lu nativement par `pnpm audit` :

```yaml
auditConfig:
  ignoreGhsas:
    # 2026-10-05 — node-forge via listhen (serveur de dev Nuxt), pas de correctif publié, absent de l'image de prod
    - GHSA-86w9-cpqp-85rv
    # 2026-10-05 — braces via nitropack > globby (build), pas de correctif publié, absent de l'image de prod
    - GHSA-vfj7-8cjw-p6xm
```

La prise en charge de `auditConfig` dans `pnpm-workspace.yaml` par pnpm 12 est vérifiée à l'implémentation. À défaut, on utilise un fichier dédié (`audit-exceptions.json`) filtré par un petit script `scripts/audit.mjs` sur la sortie `pnpm audit --json`.
- *Alternative* : `overrides` vers une version non affectée. Impossible : aucune version corrigée.
- *Alternative* : `--audit-level critical`. Écartée : laisserait passer tout nouvel avis `high`.

### D2. Étape de CI
Nouvelle étape `Audit des dépendances` dans le job `frontend`, après l'installation : elle affiche les exceptions actives (lignes `ignoreGhsas` et leurs commentaires), puis exécute `pnpm audit --prod --audit-level high`.

### D3. Revue des exceptions
À chaque montée de version de Nuxt, et au plus tard tous les trois mois, on relance `pnpm audit --prod` sans les exceptions. Une exception dont l'avis a un correctif ou n'est plus remonté est supprimée. La procédure figure dans `CLAUDE.md`.

### D4. Code mort
`unprocessable` et `tooManyRequests` sont supprimés de `server/utils/errors.ts` (aucun appel ; le rate-limit et le lockout construisent leurs erreurs autrement).

## Risks / Trade-offs

- [Un avis sur un paquet ignoré change de portée (touche le runtime) sans changer d'identifiant] → Revue périodique (D3) ; l'identifiant GHSA reste le même, donc l'exception reste active : risque accepté, limité par la revue.
- [Un avis publié bloque une PR sans rapport] → Voulu : on corrige (montée de version, `overrides`) ou on ajoute une exception justifiée.

## Migration Plan

Aucune migration : configuration et CI uniquement.

## Open Questions

_Aucune._
