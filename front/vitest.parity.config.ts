import { defineConfig } from 'vitest/config'

// Parité LoopBack ↔ Nitro : mêmes scénarios contre les deux API (deux bases identiques sur un même MySQL jetable).
// Supprimé avec back/ à la fin de la migration (tâche 9.4).
export default defineConfig({
  test: {
    name: 'parity',
    environment: 'node',
    include: ['tests/parity/**/*.spec.ts'],
    globalSetup: ['tests/parity/global-setup.ts'],
    testTimeout: 120_000,
    hookTimeout: 900_000,
    fileParallelism: false
  }
})
