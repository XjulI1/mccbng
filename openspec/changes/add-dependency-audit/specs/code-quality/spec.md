## ADDED Requirements

### Requirement: Audit des dépendances
La CI SHALL exécuter `pnpm audit --prod` sur chaque push et chaque pull request, et échouer sur toute vulnérabilité de gravité haute ou critique, sauf si elle figure dans une liste d'exceptions. Chaque exception MUST porter sa date, son chemin de dépendance et sa justification (dépendance limitée à l'outillage de développement ou de build, sans correctif publié), et MUST être revue à chaque montée de version de Nuxt. La sortie de la CI MUST afficher les exceptions actives.

#### Scenario: Nouvelle vulnérabilité
- **WHEN** une dépendance de production reçoit un avis de gravité haute absent de la liste d'exceptions
- **THEN** la CI échoue

#### Scenario: Exception documentée
- **WHEN** l'avis concerne `node-forge` via `listhen` et figure dans la liste d'exceptions
- **THEN** la CI réussit et sa sortie mentionne l'exception

#### Scenario: Avis de gravité modérée
- **WHEN** une dépendance de production reçoit un avis de gravité modérée
- **THEN** la CI réussit
