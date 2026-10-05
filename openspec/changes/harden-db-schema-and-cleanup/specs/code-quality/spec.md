## ADDED Requirements

### Requirement: Lint sans avertissement
`pnpm lint:check` SHALL échouer dès le premier avertissement ESLint (`--max-warnings 0`) et MUST être exécuté par la CI sur chaque push.

#### Scenario: Avertissement introduit
- **WHEN** un commit introduit un `any` explicite signalé par ESLint
- **THEN** la CI échoue

### Requirement: Typage strict
La configuration TypeScript SHALL activer `noImplicitAny`, et `pnpm type-check` MUST réussir en CI sans `@ts-expect-error` ni `@ts-ignore` nouveaux.

#### Scenario: Paramètre non typé
- **WHEN** une fonction avec un paramètre implicitement `any` est ajoutée
- **THEN** `pnpm type-check` échoue

### Requirement: Audit des dépendances
La CI SHALL exécuter `pnpm audit --prod` et échouer sur toute vulnérabilité de gravité haute ou critique, sauf si elle figure dans une liste d'exceptions datée et justifiée (dépendance limitée à l'outillage de build, sans correctif publié), revue à chaque montée de version de Nuxt.

#### Scenario: Nouvelle vulnérabilité
- **WHEN** une dépendance d'exécution reçoit un avis de gravité haute
- **THEN** la CI échoue

#### Scenario: Exception documentée
- **WHEN** l'avis concerne `node-forge` via l'outillage de build et figure dans la liste d'exceptions
- **THEN** la CI réussit et la sortie mentionne l'exception
