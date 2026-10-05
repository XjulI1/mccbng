import { mkdtemp, readdir, readFile, copyFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createConnection, type Connection, type RowDataPacket } from 'mysql2/promise'
import { afterAll, describe, expect, it } from 'vitest'
// @ts-expect-error module JS sans types
import { LOCK_NAME, MIGRATIONS_DIR, runMigrations } from '../../scripts/db-migrate.mjs'
import { ctx } from './helpers'

// Bases jetables créées à côté de la base de test (compte administrateur du serveur de test)
const created: string[] = []
const open: Connection[] = []

const freshDatabase = async (): Promise<Connection> => {
  const name = `mccbng_migr_${Date.now()}_${created.length}`
  const connection = await createConnection({ ...ctx().admin, multipleStatements: true })
  await connection.query('CREATE DATABASE ??', [name])
  await connection.changeUser({ database: name })
  created.push(name)
  open.push(connection)
  return connection
}

const otherConnection = async (database: string) => {
  const connection = await createConnection({ ...ctx().admin, database, multipleStatements: true })
  open.push(connection)
  return connection
}

// Lignes d'une requête de lecture
const rowsOf = async (connection: Connection, query: string, params: unknown[] = []) =>
  (await connection.query<RowDataPacket[]>(query, params))[0]

const currentDatabase = async (connection: Connection) => {
  const [row] = await rowsOf(connection, 'SELECT DATABASE() AS db')
  return row!.db as string
}

// Répertoire de migrations restreint aux fichiers jusqu'à `last` (inclus)
const migrationsUpTo = async (last: string) => {
  const dir = await mkdtemp(join(tmpdir(), 'mccbng-migr-'))
  for (const file of (await readdir(MIGRATIONS_DIR)).filter(f => f.endsWith('.sql')).sort()) {
    if (file > last) break
    await copyFile(join(MIGRATIONS_DIR, file), join(dir, file))
  }
  return dir
}

// Instantané du schéma : colonnes (type, nullabilité, défaut, collation), index et moteurs
const schemaSnapshot = async (connection: Connection) => {
  const db = await currentDatabase(connection)
  const [columns] = await connection.query(
    'SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLLATION_NAME FROM information_schema.COLUMNS ' +
    'WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME, ORDINAL_POSITION', [db])
  const [indexes] = await connection.query(
    'SELECT TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX, COLUMN_NAME, NON_UNIQUE FROM information_schema.STATISTICS ' +
    'WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX', [db])
  const [tables] = await connection.query(
    'SELECT TABLE_NAME, ENGINE, TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME', [db])
  return { columns, indexes, tables }
}

afterAll(async () => {
  for (const connection of open) await connection.end().catch(() => {})
  if (created.length) {
    const admin = await createConnection(ctx().admin)
    for (const name of created) await admin.query('DROP DATABASE IF EXISTS ??', [name])
    await admin.end()
  }
})

describe('runner de migrations', () => {
  it('exécutions concurrentes : la seconde échoue tant que le verrou est pris', async () => {
    const first = await freshDatabase()
    const second = await otherConnection(await currentDatabase(first))
    await first.query('SELECT GET_LOCK(?, 10)', [LOCK_NAME])
    try {
      await expect(runMigrations(second, { lockTimeout: 0 })).rejects.toThrow(/Verrou mccbng_migrate déjà pris/)
      const tables = await rowsOf(second, "SHOW TABLES LIKE 'User'")
      expect(tables).toHaveLength(0)
    } finally {
      await first.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME])
    }
    // Verrou libéré : la migration passe, et le runner libère son propre verrou
    await runMigrations(second, { lockTimeout: 0 })
    const [lock] = await rowsOf(first, 'SELECT IS_FREE_LOCK(?) AS free', [LOCK_NAME])
    expect(lock!.free).toBe(1)
  })

  it('--baseline sur une base vide : refusé, rien n\'est marqué', async () => {
    const connection = await freshDatabase()
    await expect(runMigrations(connection, { baseline: true })).rejects.toThrow(/--baseline refusé/)
    const rows = await rowsOf(connection, 'SELECT name FROM `__migrations`')
    expect(rows).toHaveLength(0)
  })

  it('fichier en échec : nommé dans le message, non marqué, les précédents restent joués', async () => {
    const connection = await freshDatabase()
    const dir = await mkdtemp(join(tmpdir(), 'mccbng-migr-'))
    await writeFile(join(dir, '0001_ok.sql'), 'CREATE TABLE IF NOT EXISTS t1 (id int PRIMARY KEY);')
    await writeFile(join(dir, '0002_fail.sql'), 'CREATE TABLE IF NOT EXISTS t2 (id int PRIMARY KEY);\nALTER TABLE inexistante ADD COLUMN x int;')
    await expect(runMigrations(connection, { dir })).rejects.toThrow(/0002_fail\.sql[\s\S]*partiellement appliqué/)
    const rows = await rowsOf(connection, 'SELECT name FROM `__migrations`')
    expect(rows.map(r => r.name)).toEqual(['0001_ok.sql'])
    await rm(dir, { recursive: true })
  })

  it('les clés AUTO_INCREMENT à 0 (catégorie « Aucune », banque 0) survivent à toutes les migrations', async () => {
    const connection = await freshDatabase()
    const dir = await migrationsUpTo('0001_user_login_security.sql')
    await runMigrations(connection, { dir })
    await rm(dir, { recursive: true })
    // Comme en production : lignes de clé 0 insérées avec NO_AUTO_VALUE_ON_ZERO, données dans les colonnes FLOAT
    await connection.query("SET SESSION sql_mode = CONCAT_WS(',', NULLIF(@@SESSION.sql_mode, ''), 'NO_AUTO_VALUE_ON_ZERO')")
    await connection.query("INSERT INTO Categorie (IDcat, Nom, IDuser, Type) VALUES (0, 'Aucune', 0, 'depense'), (5, 'Courses', 1, 'depense')")
    await connection.query("INSERT INTO Banque (IDbanque, NomBanque) VALUES (0, 'Aucune'), (3, 'Banque')")
    await connection.query("INSERT INTO Compte (IDcompte, NomCompte, solde, IDuser, bloque, visible) VALUES (1, 'Courant', 0, 1, NULL, NULL)")
    await connection.query("INSERT INTO Operation (NomOp, MontantOp, DateOp, IDcompte, IDcat) VALUES ('Resto', -12.345, NOW(), 1, 0), ('Gros', 150000.01, NOW(), 1, 5)")
    await connection.query('SET SESSION sql_mode = DEFAULT')

    await runMigrations(connection)

    const cats = await rowsOf(connection, 'SELECT IDcat, Nom FROM Categorie ORDER BY IDcat')
    expect(cats).toEqual([{ IDcat: 0, Nom: 'Aucune' }, { IDcat: 5, Nom: 'Courses' }])
    const banques = await rowsOf(connection, 'SELECT IDbanque FROM Banque ORDER BY IDbanque')
    expect(banques.map(b => b.IDbanque)).toEqual([0, 3])
    const [compte] = await rowsOf(connection, 'SELECT bloque, visible FROM Compte WHERE IDcompte = 1')
    expect(compte).toEqual({ bloque: 0, visible: 1 })
    // FLOAT → DECIMAL : arrondi au centime (le FLOAT relisait 150000.015625)
    const ops = await rowsOf(connection, 'SELECT IDcat, CAST(MontantOp AS CHAR) AS montant FROM Operation ORDER BY IDop')
    expect(ops).toEqual([{ IDcat: 0, montant: '-12.35' }, { IDcat: 5, montant: '150000.02' }])
  })

  it('chaque migration postérieure à la baseline est rejouable sans erreur ni changement de schéma', async () => {
    const connection = await freshDatabase()
    await runMigrations(connection)
    const before = await schemaSnapshot(connection)
    const files = (await readdir(MIGRATIONS_DIR)).filter(f => f.endsWith('.sql') && f !== '0000_baseline.sql').sort()
    expect(files.length).toBeGreaterThanOrEqual(4)
    for (const file of files) {
      await connection.query(await readFile(join(MIGRATIONS_DIR, file), 'utf8'))
    }
    expect(await schemaSnapshot(connection)).toEqual(before)
  })
})
