## 1. Audit

- [ ] 1.1 Vérifier que pnpm 12 lit `auditConfig.ignoreGhsas` dans `pnpm-workspace.yaml` ; sinon, écrire `scripts/audit.mjs` et `audit-exceptions.json` (D1)
- [ ] 1.2 Ajouter les deux exceptions (`node-forge`, `braces`) avec date, chemin et justification
- [ ] 1.3 Vérifier en local : `pnpm audit --prod --audit-level high` réussit avec les exceptions et échoue sans elles

## 2. CI

- [ ] 2.1 `.github/workflows/ci.yml` : étape « Audit des dépendances » (affichage des exceptions, puis `pnpm audit --prod --audit-level high`)
- [ ] 2.2 Ajouter `pnpm audit:check` dans `package.json` si un script est nécessaire (D1)

## 3. Code mort et documentation

- [ ] 3.1 Supprimer `unprocessable` et `tooManyRequests` de `server/utils/errors.ts` ; `pnpm type-check` et `pnpm test` verts
- [ ] 3.2 `CLAUDE.md` : commande d'audit et procédure de revue des exceptions (D3)
