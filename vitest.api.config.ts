import { defineConfig } from 'vitest/config'

// Tests d'intégration de l'API : MySQL jetable + serveur Nitro construit (voir tests/api/global-setup.ts).
export default defineConfig({
  test: {
    name: 'api',
    environment: 'node',
    include: ['tests/api/**/*.spec.ts'],
    globalSetup: ['tests/api/global-setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 900_000,
    fileParallelism: false
  }
})
