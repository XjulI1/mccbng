import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { join, resolve } from 'node:path'
import { createConnection } from 'mysql2/promise'
import bcrypt from 'bcryptjs'
import type { TestProject } from 'vitest/node'
// @ts-expect-error module JS sans types
import { runMigrations } from '../../scripts/db-migrate.mjs'
import { startDatabase, type DbConfig } from '../support/database'

export interface ParityContext {
  lbUrl: string
  nitroUrl: string
  jwtSecret: string
  db: DbConfig
  databases: { lb: string; nitro: string }
  users: { alice: SeedUser; bob: SeedUser }
}
export interface SeedUser { id: string; IDuser: number; email: string; code: string }

declare module 'vitest' {
  export interface ProvidedContext {
    parity: ParityContext
  }
}

const BACK = resolve(__dirname, '../../../back')
const FRONT = resolve(__dirname, '../..')
const LB_DATASOURCE_JSON = join(BACK, 'dist/datasources/mccb-mysql.datasource.config.json')

const freePort = () => new Promise<number>((resolvePort, reject) => {
  const server = createServer()
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address() as { port: number }
    server.close(() => resolvePort(port))
  })
  server.on('error', reject)
})

const waitFor = async (url: string, timeoutMs = 60_000) => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try { if ((await fetch(url)).ok) return } catch { /* pas prêt */ }
    await new Promise(r => setTimeout(r, 300))
  }
  throw new Error(`Serveur injoignable : ${url}`)
}

// Le dist de LoopBack lit sa datasource depuis un JSON compilé : on le remplace dans dist/ (jamais src/).
const pointLoopBackAt = (db: DbConfig, database: string) =>
  writeFileSync(LB_DATASOURCE_JSON, JSON.stringify({ name: 'mccb_mysql', connector: 'mysql', ...db, database }))

export default async function setup(project: TestProject) {
  const database = (await startDatabase()) as Awaited<ReturnType<typeof startDatabase>>
  const names = { lb: 'parity_lb', nitro: 'parity_nitro' }
  const jwtSecret = 'parity-secret'

  // Compte administrateur : le harnais crée plusieurs bases
  const dbRoot: DbConfig = { ...database.admin, database: database.db.database }
  database.db = dbRoot
  const admin = await createConnection({ ...dbRoot, multipleStatements: true })
  for (const name of Object.values(names)) await admin.query('DROP DATABASE IF EXISTS ??; CREATE DATABASE ??', [name, name])

  // Schéma de production (baseline) dans les deux bases
  const users = {
    alice: { id: '00000000-0000-4000-8000-000000000001', IDuser: 501, email: 'alice@parity.test', code: 'alice1' },
    bob: { id: '00000000-0000-4000-8000-000000000002', IDuser: 502, email: 'bob@parity.test', code: 'bob123' }
  }
  const hashes = { alice: await bcrypt.hash(users.alice.code, 4), bob: await bcrypt.hash(users.bob.code, 4) }
  for (const name of [names.lb, names.nitro]) {
    await admin.changeUser({ database: name })
    await runMigrations(admin)
    for (const [key, user] of Object.entries(users)) {
      await admin.query('INSERT INTO `User` (id, IDuser, email, username, secret_key) VALUES (?, ?, ?, ?, ?)',
        [user.id, user.IDuser, user.email, key, hashes[key as 'alice' | 'bob']])
    }
  }
  await admin.end()

  if (!process.env.PARITY_SKIP_BUILD) {
    for (const args of [['--filter', '@mccbng/back', 'build'], ['--filter', '@mccbng/front', 'exec', 'nuxt', 'build', '--dotenv', '.env.none']]) {
      const r = spawnSync('pnpm', args, { cwd: join(BACK, '..'), env: { ...process.env, NODE_ENV: 'production', TZ: 'UTC' }, stdio: 'inherit' })
      if (r.status !== 0) throw new Error(`pnpm ${args.join(' ')} a échoué`)
    }
  }

  // Serveurs
  pointLoopBackAt(database.db, names.lb)
  const lbPort = await freePort()
  const nitroPort = await freePort()
  const common = { ...process.env, TZ: 'UTC', JWT_SECRET: jwtSecret, JWT_TTL_SECONDS: '3600' }
  const procs: ChildProcess[] = [
    spawn('node', ['dist/index.js'], { cwd: BACK, env: { ...common, HOST: '127.0.0.1', PORT: String(lbPort), NODE_ENV: 'production' }, stdio: ['ignore', 'inherit', 'inherit'] }),
    spawn('node', ['.output/server/index.mjs'], {
      cwd: FRONT,
      env: {
        ...common, NODE_ENV: 'production', NITRO_PORT: String(nitroPort), NITRO_HOST: '127.0.0.1',
        DB_HOST: database.db.host, DB_PORT: String(database.db.port), DB_USER: database.db.user, DB_PASSWORD: database.db.password, DB_NAME: names.nitro
      },
      stdio: ['ignore', 'inherit', 'inherit']
    })
  ]
  const lbUrl = `http://127.0.0.1:${lbPort}`
  const nitroUrl = `http://127.0.0.1:${nitroPort}`
  await Promise.all([waitFor(`${lbUrl}/api/ping`), waitFor(`${nitroUrl}/api/ping`)])

  project.provide('parity', { lbUrl, nitroUrl, jwtSecret, db: database.db, databases: names, users })
  return async () => {
    procs.forEach(p => p.kill('SIGTERM'))
    await database.stop()
  }
}
