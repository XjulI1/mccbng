#!/usr/bin/env node
// Migrations SQL versionnées : applique server/db/migrations/*.sql dans l'ordre alphabétique.
//   node scripts/db-migrate.mjs             applique les migrations en attente
//   node scripts/db-migrate.mjs --baseline  marque 0000_baseline comme jouée SANS l'exécuter (base de prod existante)
// Configuration : DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, lues dans .env (ou ENV_FILE) et l'environnement (prioritaire).
// Moteur cible : MariaDB. Les migrations postérieures à la baseline sont rejouables (voir docs/db-migrations.md).
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from './load-env.mjs'
import { createConnection } from 'mysql2/promise'

export const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'server', 'db', 'migrations')
export const LOCK_NAME = 'mccbng_migrate'
const BASELINE = '0000_baseline.sql'

// Une clé AUTO_INCREMENT à 0 (catégorie partagée « Aucune », IDcat = 0) doit survivre aux copies de table (ALTER TABLE)
const withNoAutoValueOnZero = (sqlMode) =>
  [...new Set([...String(sqlMode ?? '').split(',').filter(Boolean), 'NO_AUTO_VALUE_ON_ZERO'])].join(',')

const applyFile = async (connection, dir, file) => {
  try {
    await connection.query(await readFile(join(dir, file), 'utf8'))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Échec de la migration ${file} : ${message}\n` +
      'Le DDL MariaDB n\'est pas transactionnel : ce fichier peut avoir été partiellement appliqué. ' +
      'Il n\'est pas marqué comme joué ; corriger la cause puis relancer db:migrate (les migrations sont rejouables).',
      { cause: error }
    )
  }
}

/** Applique (ou marque comme jouée) les migrations. Retourne la liste des fichiers traités. */
export async function runMigrations(connection, { dir = MIGRATIONS_DIR, baseline = false, log = () => {}, lockTimeout = 10 } = {}) {
  const [[{ locked }]] = await connection.query('SELECT GET_LOCK(?, ?) AS locked', [LOCK_NAME, lockTimeout])
  if (locked !== 1) {
    throw new Error(`Verrou ${LOCK_NAME} déjà pris : une autre exécution de db:migrate est en cours sur cette base.`)
  }
  const [[{ sqlMode }]] = await connection.query('SELECT @@SESSION.sql_mode AS sqlMode')
  try {
    await connection.query('SET SESSION sql_mode = ?', [withNoAutoValueOnZero(sqlMode)])
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
        if (baseline && !existing) {
          throw new Error('--baseline refusé : la table User n\'existe pas (base vide ?). Relancer sans --baseline pour créer le schéma.')
        }
        if (baseline) {
          await connection.query('INSERT INTO `__migrations` (name) VALUES (?)', [file])
          log(`baseline : ${file} marquée comme jouée`)
          done.push(file)
          continue
        }
      }

      log(`applique ${file}`)
      // Rétabli avant chaque fichier : une migration précédente a pu modifier sql_mode
      await connection.query('SET SESSION sql_mode = ?', [withNoAutoValueOnZero(sqlMode)])
      await applyFile(connection, dir, file)
      await connection.query('INSERT INTO `__migrations` (name) VALUES (?)', [file])
      done.push(file)
    }
    return done
  } finally {
    await connection.query('SET SESSION sql_mode = ?', [sqlMode]).catch(() => {})
    await connection.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]).catch(() => {})
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // .env de la racine (ou ENV_FILE) ; les variables déjà définies dans l'environnement sont prioritaires
  try {
    const envFile = loadEnv()
    if (envFile) console.log(`Configuration lue dans ${envFile}`)
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
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
