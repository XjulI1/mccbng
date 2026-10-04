#!/usr/bin/env node
// Migrations SQL versionnées : applique server/db/migrations/*.sql dans l'ordre alphabétique.
//   node scripts/db-migrate.mjs             applique les migrations en attente
//   node scripts/db-migrate.mjs --baseline  marque 0000_baseline comme jouée SANS l'exécuter (base de prod existante)
// Configuration : DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME.
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createConnection } from 'mysql2/promise'

export const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'server', 'db', 'migrations')
const BASELINE = '0000_baseline.sql'

/** Applique (ou marque comme jouée) les migrations. Retourne la liste des fichiers traités. */
export async function runMigrations(connection, { dir = MIGRATIONS_DIR, baseline = false, log = () => {} } = {}) {
  await connection.query(
    'CREATE TABLE IF NOT EXISTS `__migrations` (`name` VARCHAR(255) NOT NULL PRIMARY KEY, `applied_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)'
  )
  const [appliedRows] = await connection.query('SELECT name FROM `__migrations`')
  const applied = new Set(appliedRows.map(row => row.name))
  const files = (await readdir(dir)).filter(name => name.endsWith('.sql')).sort()
  const done = []

  for (const file of files) {
    if (applied.has(file)) continue

    if (file === BASELINE) {
      const [tables] = await connection.query("SHOW TABLES LIKE 'User'")
      const existing = tables.length > 0
      if (existing && !baseline) {
        throw new Error('Le schéma existe déjà sans suivi de migrations : relancer avec --baseline pour marquer 0000_baseline comme jouée.')
      }
      if (baseline) {
        await connection.query('INSERT INTO `__migrations` (name) VALUES (?)', [file])
        log(`baseline : ${file} marquée comme jouée`)
        done.push(file)
        continue
      }
    }

    log(`applique ${file}`)
    await connection.query(await readFile(join(dir, file), 'utf8'))
    await connection.query('INSERT INTO `__migrations` (name) VALUES (?)', [file])
    done.push(file)
  }
  return done
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const missing = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'].filter(name => !process.env[name])
  if (missing.length) {
    console.error(`Configuration manquante : ${missing.join(', ')}`)
    process.exit(1)
  }
  const connection = await createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  })
  try {
    const done = await runMigrations(connection, { baseline: process.argv.includes('--baseline'), log: console.log })
    console.log(done.length ? `${done.length} migration(s) traitée(s)` : 'Aucune migration en attente')
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  } finally {
    await connection.end()
  }
}
