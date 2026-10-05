#!/usr/bin/env node
// Contrôle de la migration 0003 (FLOAT → DECIMAL) : instantané des montants agrégés, puis comparaison.
//   node scripts/check-amounts.mjs --save avant.json      avant 0003 : enregistre l'instantané
//   node scripts/check-amounts.mjs --compare avant.json   après 0003 : affiche les écarts (au-delà d'un demi-centime)
// Seuls des agrégats sont lus et écrits (sommes par compte, par crédit, par bien) : aucun libellé.
// Configuration : DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, lues dans .env (ou ENV_FILE) et l'environnement (prioritaire).
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createConnection } from 'mysql2/promise'
import { loadEnv } from './load-env.mjs'

// Valeurs lues en double (CAST … AS DOUBLE) : comparables quel que soit le type de colonne (FLOAT ou DECIMAL)
const QUERIES = {
  operations: 'SELECT IDcompte AS k, COUNT(*) AS n, CAST(SUM(MontantOp) AS DOUBLE) AS total FROM Operation GROUP BY IDcompte',
  recurrentes: 'SELECT IDcompte AS k, COUNT(*) AS n, CAST(SUM(MontantOpRecu) AS DOUBLE) AS total FROM OperationRecurrente GROUP BY IDcompte',
  soldes: 'SELECT IDcompte AS k, 1 AS n, CAST(solde AS DOUBLE) AS total FROM Compte',
  credits: 'SELECT IDcredit AS k, 1 AS n, CAST(MontantInitial + MontantMensuel AS DOUBLE) AS total, CAST(TauxInteret AS DOUBLE) AS taux FROM Credit',
  biens: 'SELECT IDbien AS k, 1 AS n, CAST(PrixBienNu + FraisNotaire + COALESCE(FraisAgence, 0) + COALESCE(ApportCash, 0) + COALESCE(ValeurActuelle, 0) AS DOUBLE) AS total, CAST(Surface AS DOUBLE) AS surface FROM Bien'
}

export const snapshot = async (connection) => {
  const result = {}
  for (const [name, query] of Object.entries(QUERIES)) {
    const [rows] = await connection.query(query)
    result[name] = Object.fromEntries(rows.map(({ k, ...values }) => [k, values]))
  }
  return result
}

const round = (value, digits) => (value === null || value === undefined ? value : Number(Number(value).toFixed(digits)))

/** Écarts entre deux instantanés : clés disparues ou apparues, nombres de lignes, valeurs au-delà de la tolérance. */
export const compare = (before, after) => {
  const diffs = []
  for (const name of Object.keys(QUERIES)) {
    const keys = new Set([...Object.keys(before[name] ?? {}), ...Object.keys(after[name] ?? {})])
    for (const key of keys) {
      const a = before[name]?.[key]
      const b = after[name]?.[key]
      if (!a || !b) {
        diffs.push({ table: name, key, avant: a ?? null, apres: b ?? null })
        continue
      }
      for (const field of Object.keys(a)) {
        const digits = field === 'taux' ? 3 : 2
        const delta = (b[field] ?? 0) - (a[field] ?? 0)
        if (field === 'n' ? delta !== 0 : Math.abs(delta) >= 0.005) {
          diffs.push({ table: name, key, champ: field, avant: round(a[field], digits + 4), apres: round(b[field], digits), ecart: round(delta, digits + 2) })
        }
      }
    }
  }
  return diffs
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const envFile = loadEnv()
    if (envFile) console.log(`Configuration lue dans ${envFile}`)
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
  const mode = process.argv.indexOf('--save') > -1 ? '--save' : process.argv.indexOf('--compare') > -1 ? '--compare' : undefined
  const file = mode && process.argv[process.argv.indexOf(mode) + 1]
  if (!file) {
    console.error('Usage : node scripts/check-amounts.mjs --save <fichier.json> | --compare <fichier.json>')
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
    database: process.env.DB_NAME
  })
  try {
    const current = await snapshot(connection)
    if (mode === '--save') {
      await writeFile(file, JSON.stringify(current, null, 2))
      console.log(`Instantané enregistré dans ${file}`)
    } else {
      const diffs = compare(JSON.parse(await readFile(file, 'utf8')), current)
      for (const diff of diffs) console.log(JSON.stringify(diff))
      console.log(diffs.length ? `${diffs.length} écart(s) au-delà d'un demi-centime` : 'Aucun écart au-delà d\'un demi-centime')
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  } finally {
    await connection.end()
  }
}
