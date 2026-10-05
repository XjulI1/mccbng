import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    include: ['tests/**/*.spec.ts'],
    // Tests d'API (MariaDB jetable + serveur) et de parité : lancés par leurs propres configs (test:api, test:parity)
    exclude: ['**/node_modules/**', 'tests/api/**', 'tests/parity/**'],
  },
})
