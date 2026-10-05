#!/usr/bin/env node
// One-shot : hashe en bcrypt (coût 12) les `User.secret_key` encore en clair (tout ce qui ne commence pas par "$2").
// À exécuter en production AVANT de déployer la version qui refuse les secret_key en clair.
//   node scripts/hash-legacy-secrets.mjs            simulation : liste les utilisateurs concernés, n'écrit rien
//   node scripts/hash-legacy-secrets.mjs --apply    hashe et enregistre
// Configuration : DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME.
import bcrypt from 'bcryptjs'
import { fileURLToPath } from 'node:url'
import { createConnection } from 'mysql2/promise'

const BCRYPT_COST = 12

/** Hashe les secret_key en clair. Retourne les IDuser traités (ou à traiter en simulation). */
export async function hashLegacySecrets(connection, { apply = false, log = () => {} } = {}) {
  const [rows] = await connection.query(
    "SELECT IDuser, secret_key FROM `User` WHERE secret_key IS NOT NULL AND secret_key <> '' AND secret_key NOT LIKE '$2%'"
  )
  for (const row of rows) {
    if (!apply) {
      log(`[simulation] IDuser ${row.IDuser} : secret_key en clair`)
      continue
    }
    const hash = await bcrypt.hash(row.secret_key, BCRYPT_COST)
    // Condition sur l'ancienne valeur : ne pas écraser une clé modifiée entre-temps
    await connection.query('UPDATE `User` SET secret_key = ? WHERE IDuser = ? AND secret_key = ?', [hash, row.IDuser, row.secret_key])
    log(`IDuser ${row.IDuser} : secret_key hashée`)
  }
  return rows.map(row => row.IDuser)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const missing = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'].filter(name => !process.env[name])
  if (missing.length) {
    console.error(`Configuration manquante : ${missing.join(', ')}`)
    process.exit(1)
  }
  const apply = process.argv.includes('--apply')
  const connection = await createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  })
  try {
    const ids = await hashLegacySecrets(connection, { apply, log: console.log })
    if (!ids.length) console.log('Aucune secret_key en clair')
    else if (!apply) console.log(`${ids.length} secret_key en clair : relancer avec --apply pour les hasher`)
    else console.log(`${ids.length} secret_key hashée(s)`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  } finally {
    await connection.end()
  }
}
