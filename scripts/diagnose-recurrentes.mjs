#!/usr/bin/env node
// Diagnostic des opérations récurrentes avant le passage à l'échéancier JourNumOpRecu / MoisOpRecu.
//   node scripts/diagnose-recurrentes.mjs                     lecture seule : liste les anomalies et les corrections proposées
//   node scripts/diagnose-recurrentes.mjs --apply --ids=1,2   applique la correction proposée aux seules récurrentes listées
//   node scripts/diagnose-recurrentes.mjs --fix-credit-links  répare Credit.IDopRecu quand il ne pointe pas sur la mensualité du crédit
// Configuration : DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, lues dans .env (ou ENV_FILE) et l'environnement (prioritaire).
import { fileURLToPath } from 'node:url'
import { createConnection } from 'mysql2/promise'
import { loadEnv } from './load-env.mjs'

const day = date => (date ? new Date(date).toISOString().slice(0, 10) : null)

// Récurrentes (mensualités de crédit comprises) dont le jour (et le mois en annuel) diffère de DernierDateOpRecu.
// Correction proposée : aligner JourNumOpRecu (et MoisOpRecu en annuel) sur DernierDateOpRecu, qui reflète
// le calendrier réellement suivi jusqu'ici. Un jour borné en fin de mois (31 → 30 avril) n'est pas un écart.
export async function findMisaligned(connection) {
  const [rows] = await connection.query(
    'SELECT r.IDopRecu, c.IDuser, r.NomOpRecu, r.IDcredit, r.Frequence, r.JourNumOpRecu, r.MoisOpRecu, r.DernierDateOpRecu ' +
    'FROM OperationRecurrente r LEFT JOIN Compte c ON c.IDcompte = r.IDcompte ' +
    'WHERE r.Frequence IN (3, 7) AND (' +
    '  (DAY(r.DernierDateOpRecu) <> COALESCE(r.JourNumOpRecu, 1) ' +
    '    AND NOT (DAY(r.DernierDateOpRecu) = DAY(LAST_DAY(r.DernierDateOpRecu)) AND COALESCE(r.JourNumOpRecu, 1) > DAY(r.DernierDateOpRecu))) ' +
    '  OR (r.Frequence = 7 AND MONTH(r.DernierDateOpRecu) - 1 <> COALESCE(r.MoisOpRecu, 0))' +
    ') ORDER BY r.IDopRecu'
  )
  return rows.map((row) => {
    const last = new Date(row.DernierDateOpRecu)
    return {
      ...row,
      DernierDateOpRecu: day(last),
      proposedJourNumOpRecu: last.getUTCDate(),
      proposedMoisOpRecu: row.Frequence === 7 ? last.getUTCMonth() : row.MoisOpRecu
    }
  })
}

// Crédits dont IDopRecu ne désigne pas leur mensualité (récurrente portant leur IDcredit) : la propagation des
// modifications et la suppression en cascade la retrouvent par IDcredit, mais le lien doit être réparé.
export async function findBrokenCreditLinks(connection) {
  const [rows] = await connection.query(
    'SELECT cr.IDcredit, cr.NomCredit, cr.IDopRecu AS IDopRecuActuel, MIN(r.IDopRecu) AS IDopRecuAttendu, COUNT(r.IDopRecu) AS mensualites ' +
    'FROM Credit cr LEFT JOIN OperationRecurrente r ON r.IDcredit = cr.IDcredit ' +
    'GROUP BY cr.IDcredit, cr.NomCredit, cr.IDopRecu ' +
    'HAVING mensualites <> 1 OR NOT (cr.IDopRecu <=> MIN(r.IDopRecu)) ORDER BY cr.IDcredit'
  )
  return rows
}

// Répare les liens quand le crédit a exactement une mensualité ; les autres cas se traitent à la main.
export async function fixCreditLinks(connection) {
  const fixed = []
  const skipped = []
  for (const row of await findBrokenCreditLinks(connection)) {
    if (Number(row.mensualites) !== 1) {
      skipped.push(row.IDcredit)
      continue
    }
    await connection.query('UPDATE Credit SET IDopRecu = ? WHERE IDcredit = ? AND IDopRecu <=> ?', [row.IDopRecuAttendu, row.IDcredit, row.IDopRecuActuel])
    fixed.push({ IDcredit: row.IDcredit, avant: row.IDopRecuActuel, apres: row.IDopRecuAttendu })
  }
  return { fixed, skipped }
}

// Mensualités dont le jour diffère de celui de DateDebut : sans effet tant que DateDebut ne change pas
// (modifier DateDebut réécrit JourNumOpRecu avec son jour).
export async function findCreditDayMismatch(connection) {
  const [rows] = await connection.query(
    'SELECT cr.IDcredit, cr.NomCredit, cr.DateDebut, r.IDopRecu, r.JourNumOpRecu ' +
    'FROM Credit cr INNER JOIN OperationRecurrente r ON r.IDcredit = cr.IDcredit ' +
    'WHERE DAY(cr.DateDebut) <> COALESCE(r.JourNumOpRecu, 1) ORDER BY cr.IDcredit'
  )
  return rows.map(row => ({ ...row, DateDebut: day(row.DateDebut) }))
}

export async function diagnose(connection) {
  const misaligned = await findMisaligned(connection)
  const [invalid] = await connection.query(
    'SELECT IDopRecu, NomOpRecu, Frequence, JourNumOpRecu, MoisOpRecu FROM OperationRecurrente ' +
    'WHERE Frequence IS NULL OR Frequence NOT IN (3, 7) ' +
    'OR (JourNumOpRecu IS NOT NULL AND JourNumOpRecu NOT BETWEEN 1 AND 31) ' +
    'OR (MoisOpRecu IS NOT NULL AND MoisOpRecu NOT BETWEEN 0 AND 11) ORDER BY IDopRecu'
  )
  const [credits] = await connection.query(
    'SELECT r.IDopRecu, r.NomOpRecu, r.IDcredit, cr.Statut, cr.DateFin, ' +
    "CASE WHEN cr.IDcredit IS NULL THEN 'crédit inexistant' WHEN COALESCE(cr.Statut, 'actif') <> 'actif' THEN 'crédit non actif' " +
    "ELSE 'crédit échu' END AS anomalie " +
    'FROM OperationRecurrente r LEFT JOIN Credit cr ON cr.IDcredit = r.IDcredit ' +
    "WHERE r.IDcredit IS NOT NULL AND (cr.IDcredit IS NULL OR COALESCE(cr.Statut, 'actif') <> 'actif' OR cr.DateFin < UTC_TIMESTAMP()) " +
    'ORDER BY r.IDopRecu'
  )
  // Doublons probables d'opérations générées : même compte, nom de récurrente, montant et jour
  const [duplicates] = await connection.query(
    'SELECT o.IDcompte, o.NomOp, o.MontantOp, DATE(o.DateOp) AS jour, COUNT(*) AS n, GROUP_CONCAT(o.IDop ORDER BY o.IDop) AS IDops ' +
    'FROM Operation o WHERE o.NomOp IN (SELECT NomOpRecu FROM OperationRecurrente) ' +
    'GROUP BY o.IDcompte, o.NomOp, o.MontantOp, DATE(o.DateOp) HAVING COUNT(*) > 1 ORDER BY jour'
  )
  return {
    creditLinks: await findBrokenCreditLinks(connection),
    creditDays: await findCreditDayMismatch(connection),
    misaligned,
    invalid,
    credits: credits.map(row => ({ ...row, DateFin: day(row.DateFin) })),
    duplicates: duplicates.map(row => ({ ...row, jour: day(row.jour) }))
  }
}

// Applique la correction proposée aux récurrentes `ids`, seulement si elles sont toujours dans la liste des écarts
// et inchangées depuis la lecture. Retourne les modifications effectuées (avant / après) et les ids ignorés.
export async function applyCorrections(connection, ids) {
  const proposals = new Map((await findMisaligned(connection)).map(row => [row.IDopRecu, row]))
  const applied = []
  const skipped = []
  for (const id of ids) {
    const row = proposals.get(id)
    if (!row) {
      skipped.push(id)
      continue
    }
    const [result] = await connection.query(
      'UPDATE OperationRecurrente SET JourNumOpRecu = ?, MoisOpRecu = ? WHERE IDopRecu = ? AND JourNumOpRecu <=> ? AND MoisOpRecu <=> ?',
      [row.proposedJourNumOpRecu, row.proposedMoisOpRecu, id, row.JourNumOpRecu, row.MoisOpRecu]
    )
    if (result.affectedRows !== 1) {
      skipped.push(id)
      continue
    }
    applied.push({
      IDopRecu: id,
      NomOpRecu: row.NomOpRecu,
      avant: { JourNumOpRecu: row.JourNumOpRecu, MoisOpRecu: row.MoisOpRecu },
      apres: { JourNumOpRecu: row.proposedJourNumOpRecu, MoisOpRecu: row.proposedMoisOpRecu }
    })
  }
  return { applied, skipped }
}

const parseIds = (argv) => {
  const arg = argv.find(a => a.startsWith('--ids='))
  if (!arg) return []
  return arg.slice('--ids='.length).split(',').map(v => Number(v.trim())).filter(v => Number.isInteger(v) && v > 0)
}

const section = (title, rows) => {
  console.log(`\n## ${title} (${rows.length})`)
  if (rows.length) console.table(rows)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
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
  const apply = process.argv.includes('--apply')
  const fixLinks = process.argv.includes('--fix-credit-links')
  const ids = parseIds(process.argv)
  if (apply && !ids.length) {
    console.error('--apply exige la liste des récurrentes à corriger : --ids=1,2,3')
    process.exit(1)
  }
  const connection = await createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    timezone: 'Z'
  })
  try {
    if (fixLinks) {
      const { fixed, skipped } = await fixCreditLinks(connection)
      for (const change of fixed) console.log(JSON.stringify({ event: 'credit-lien-repare', ...change }))
      console.log(`${fixed.length} lien(s) réparé(s)`)
      if (skipped.length) console.warn(`À traiter à la main (aucune ou plusieurs mensualités) : crédits ${skipped.join(', ')}`)
    } else if (apply) {
      const { applied, skipped } = await applyCorrections(connection, ids)
      for (const change of applied) console.log(JSON.stringify({ event: 'recurrente-corrigee', ...change }))
      console.log(`${applied.length} récurrente(s) corrigée(s)`)
      if (skipped.length) console.warn(`Ignorées (absentes des écarts ou modifiées entre-temps) : ${skipped.join(', ')}`)
    } else {
      const report = await diagnose(connection)
      section('Crédits dont IDopRecu ne désigne pas la mensualité (--fix-credit-links)', report.creditLinks)
      section('Mensualités dont le jour diffère de celui de DateDebut (information)', report.creditDays)
      section('Jour / mois à recaler (correction proposée)', report.misaligned)
      section('Valeurs hors bornes (Frequence, JourNumOpRecu, MoisOpRecu)', report.invalid)
      section('Récurrentes de crédit inexistant, non actif ou échu', report.credits)
      section('Doublons probables d\'opérations générées', report.duplicates)
      if (report.misaligned.length) {
        console.log('\nPour appliquer les corrections retenues : node scripts/diagnose-recurrentes.mjs --apply --ids=<IDopRecu,…>')
      }
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  } finally {
    await connection.end()
  }
}
