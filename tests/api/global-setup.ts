import { randomBytes } from 'node:crypto'
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { createServer } from 'node:net'
import { createConnection } from 'mysql2/promise'
import { startDatabase } from '../support/database'
import type { TestProject } from 'vitest/node'
// @ts-expect-error module JS sans types
import { runMigrations } from '../../scripts/db-migrate.mjs'

export interface ApiTestContext {
  baseUrl: string
  jwtSecret: string
  db: { host: string; port: number; user: string; password: string; database: string }
  // Compte administrateur du serveur de test (création de bases jetables pour les tests du runner de migrations)
  admin: { host: string; port: number; user: string; password: string }
}

declare module 'vitest' {
  export interface ProvidedContext {
    api: ApiTestContext
  }
}

const freePort = () => new Promise<number>((resolve, reject) => {
  const server = createServer()
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address() as { port: number }
    server.close(() => resolve(port))
  })
  server.on('error', reject)
})

const waitFor = async (url: string, timeoutMs = 60_000) => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return
    } catch { /* serveur pas encore prêt */ }
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  throw new Error(`Serveur de test injoignable : ${url}`)
}

export default async function setup(project: TestProject) {
  const database = await startDatabase()
  const jwtSecret = `test-secret-${randomBytes(16).toString('hex')}`

  const connection = await createConnection({ ...database.db, multipleStatements: true })
  await connection.query('DROP DATABASE IF EXISTS ??; CREATE DATABASE ??', [database.db.database, database.db.database])
  await connection.changeUser({ database: database.db.database })
  await runMigrations(connection)
  await connection.end()

  const env = {
    ...process.env,
    NODE_ENV: 'production',
    TZ: 'UTC',
    DB_HOST: database.db.host,
    DB_PORT: String(database.db.port),
    DB_USER: database.db.user,
    DB_PASSWORD: database.db.password,
    DB_NAME: database.db.database,
    JWT_SECRET: jwtSecret,
    JWT_TTL_SECONDS: '3600'
  }

  if (!process.env.API_TEST_SKIP_BUILD) {
    const build = spawnSync('pnpm', ['exec', 'nuxt', 'build', '--dotenv', '.env.none'], { env, stdio: 'inherit' })
    if (build.status !== 0) throw new Error('nuxt build a échoué')
  }

  const port = await freePort()
  const server: ChildProcess = spawn('node', ['.output/server/index.mjs'], {
    env: { ...env, NITRO_PORT: String(port), NITRO_HOST: '127.0.0.1' },
    stdio: ['ignore', 'inherit', 'inherit']
  })
  const baseUrl = `http://127.0.0.1:${port}`
  await waitFor(`${baseUrl}/api/ping`)

  project.provide('api', { baseUrl, jwtSecret, db: database.db, admin: database.admin })

  return async () => {
    server.kill('SIGTERM')
    await database.stop()
  }
}
