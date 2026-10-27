## 1. API

- [x] 1.1 Migration `0006_compte_plafond.sql` (`Compte.Plafond DECIMAL(12,2) DEFAULT NULL`, rejouable) et `server/db/schema.ts`
- [x] 1.2 `compteResource` : `Plafond` validé (≥ 0 ou `null`), conservé par un `PUT` qui l'omet ; test dans `tests/api/referentiel.spec.ts`

## 2. Front

- [x] 2.1 `CompteForm.vue` : champ « Plafond (optionnel) », vide ou 0 → `null`, arrondi au centime
- [x] 2.2 `app/utils/plafond.ts` (`plafondJauge`) et tests unitaires
- [x] 2.3 `AccountHeader.vue` : pourcentage à côté du nom du compte, jauge `role="meter"` et info-bulle « Plafond … : reste … / dépassé de … »

## 3. Vérification

- [x] 3.1 `pnpm lint:check`, `pnpm type-check`, `pnpm test` et `pnpm test:api` au vert
