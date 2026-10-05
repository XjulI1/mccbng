import { getTableConfig, type MySqlTable } from 'drizzle-orm/mysql-core'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import * as schema from '../../server/db/schema'
import { createCategorie, createCompte, createOperation, createUser, get, post, sql, type TestUser } from './helpers'

let user: TestUser
beforeAll(async () => { user = await createUser() })

const BUSINESS_TABLES = ['Banque', 'Bien', 'Categorie', 'Compte', 'Credit', 'Operation', 'OperationRecurrente', 'User']

describe('schéma normalisé (0002)', () => {
  it('tables métier en InnoDB / utf8mb4_unicode_ci', async () => {
    const rows = await sql('SELECT TABLE_NAME AS name, ENGINE AS engine, TABLE_COLLATION AS collation FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?)', [BUSINESS_TABLES])
    expect(rows).toHaveLength(BUSINESS_TABLES.length)
    for (const row of rows) expect(row, row.name).toMatchObject({ engine: 'InnoDB', collation: 'utf8mb4_unicode_ci' })
  })

  it('index secondaires présents, clé UNIQUE IDopRecu supprimée', async () => {
    const rows = await sql('SELECT TABLE_NAME AS t, INDEX_NAME AS i, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() GROUP BY TABLE_NAME, INDEX_NAME')
    const indexes = Object.fromEntries(rows.map(r => [`${r.t}.${r.i}`, r.cols]))
    expect(indexes).toMatchObject({
      'Operation.idx_operation_compte_check_date': 'IDcompte,CheckOp,DateOp',
      'Operation.idx_operation_compte_date': 'IDcompte,DateOp',
      'Operation.idx_operation_idcredit': 'IDcredit',
      'Operation.idx_operation_idcat': 'IDcat',
      'Compte.idx_compte_iduser': 'IDuser',
      'OperationRecurrente.idx_operationrecurrente_idcompte': 'IDcompte',
      'Categorie.idx_categorie_iduser': 'IDuser',
      'Credit.idx_credit_iduser': 'IDuser'
    })
    expect(indexes['OperationRecurrente.IDopRecu']).toBeUndefined()
  })

  it('libellé avec emoji créé puis relu à l\'identique', async () => {
    const compte = await createCompte(user)
    const created = await createOperation(user, compte.IDcompte, { NomOp: 'Resto 🍕' })
    const res = await get(`/api/operations/${created.IDop}`, user.token)
    expect(res.status).toBe(200)
    expect(res.body.NomOp).toBe('Resto 🍕')
  })

  it('drapeaux de compte absents : 0, et 1 pour visible', async () => {
    await sql("INSERT INTO Compte (NomCompte, solde, IDuser) VALUES ('Brut', 0, ?)", [user.IDuser])
    const [row] = await sql('SELECT bloque, porte_feuille, retraite, joint, children, visible FROM Compte WHERE IDuser = ? AND NomCompte = ?', [user.IDuser, 'Brut'])
    expect(row).toEqual({ bloque: 0, porte_feuille: 0, retraite: 0, joint: 0, children: 0, visible: 1 })
  })
})

describe('valeurs numériques exactes (0003)', () => {
  it('plus aucune colonne FLOAT', async () => {
    const rows = await sql("SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND DATA_TYPE IN ('float', 'double')")
    expect(rows).toEqual([])
  })

  it('crédit de 150 000,01 € relu exactement ; montants et taux en nombres JSON', async () => {
    const compte = await createCompte(user)
    const res = await post('/api/credits', user.token, {
      NomCredit: 'Maison', MontantInitial: 150000.01, MontantMensuel: 812.35, TauxInteret: 3.125,
      DateDebut: '2024-03-15', DateFin: '2044-03-15', IDcompte: compte.IDcompte
    })
    expect(res.status).toBe(200)
    const read = await get(`/api/credits/${res.body.IDcredit}`, user.token)
    expect(read.body).toMatchObject({ MontantInitial: 150000.01, MontantMensuel: 812.35, TauxInteret: 3.125 })
    expect(typeof read.body.MontantInitial).toBe('number')
    expect(typeof read.body.TauxInteret).toBe('number')
  })

  it('MontantOp est un nombre JSON', async () => {
    const compte = await createCompte(user)
    const created = await createOperation(user, compte.IDcompte, { MontantOp: -0.1 })
    const res = await get(`/api/operations/${created.IDop}`, user.token)
    expect(res.body.MontantOp).toBe(-0.1)
  })
})

describe('schéma legacy supprimé (0004)', () => {
  it('Stats et UserCredentials absentes, colonnes LoopBack de User supprimées', async () => {
    const tables = await sql("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('Stats', 'UserCredentials')")
    expect(tables).toEqual([])
    const columns = await sql("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'User' AND COLUMN_NAME IN ('id', 'realm', 'emailVerified', 'verificationToken')")
    expect(columns).toEqual([])
  })

  it('whoAmI renvoie toujours le profil', async () => {
    const res = await get('/api/users/whoAmI', user.token)
    expect(res.status).toBe(200)
    expect(Object.keys(res.body).sort()).toEqual(['IDuser', 'email', 'favoris', 'username', 'warningCompte', 'warningTotal'])
  })
})

// Types SQL attendus pour un type de colonne Drizzle (int(11) ↔ int, tinyint(1) ↔ boolean)
const normalizeSqlType = (type: string) => type.replace(/^int\(\d+\)/, 'int').replace(/^tinyint\(1\)$/, 'boolean')

describe('schéma Drizzle aligné sur les migrations', () => {
  const tables = Object.values(schema).filter((value): value is MySqlTable => typeof value === 'object' && value !== null && Symbol.for('drizzle:IsDrizzleTable') in value)

  it('mêmes tables, colonnes, types et nullabilités (les défauts Drizzle sont applicatifs)', async () => {
    const configs = tables.map(table => getTableConfig(table))
    expect(configs.map(c => c.name).sort()).toEqual(BUSINESS_TABLES)
    for (const config of configs) {
      const rows = await sql('SELECT COLUMN_NAME AS name, COLUMN_TYPE AS type, IS_NULLABLE AS nullable FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY COLUMN_NAME', [config.name])
      const actual = rows.map(r => ({ name: r.name, type: normalizeSqlType(r.type), notNull: r.nullable === 'NO' }))
      const expected = config.columns
        .map(c => ({ name: c.name, type: c.getSQLType(), notNull: c.notNull }))
        .sort((a, b) => a.name.localeCompare(b.name))
      expect(actual, config.name).toEqual(expected)
    }
  })

  it('index Drizzle présents en base', async () => {
    for (const config of tables.map(table => getTableConfig(table))) {
      for (const index of config.indexes) {
        const rows = await sql('SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?', [config.name, index.config.name])
        expect(rows[0]?.cols, `${config.name}.${index.config.name}`).toBe(index.config.columns.map(c => (c as { name: string }).name).join(','))
      }
    }
  })
})

describe('transactions réelles', () => {
  afterEach(async () => {
    await sql('DROP TRIGGER IF EXISTS test_echec_operation')
    await sql('DROP TRIGGER IF EXISTS test_echec_credit')
  })

  it('virement dont le crédit échoue : aucune opération persistée', async () => {
    const a = await createCompte(user, { NomCompte: 'A' })
    const b = await createCompte(user, { NomCompte: 'B' })
    const cat = await createCategorie(user, 'Virement', 'transfert')
    await sql("CREATE TRIGGER test_echec_operation BEFORE INSERT ON Operation FOR EACH ROW IF NEW.NomOp = 'echec-virement' AND NEW.MontantOp > 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'échec simulé'; END IF")
    const res = await post('/api/operations/transfert', user.token, {
      fromCompte: a.IDcompte, toCompte: b.IDcompte, montant: 100, DateOp: '2026-10-05', NomOp: 'echec-virement', IDcat: cat.IDcat
    })
    expect(res.status).toBe(500)
    expect(await sql('SELECT IDop FROM Operation WHERE IDcompte IN (?, ?)', [a.IDcompte, b.IDcompte])).toEqual([])
  })

  it('crédit dont la mise à jour d\'IDopRecu échoue : ni crédit ni récurrente', async () => {
    const compte = await createCompte(user)
    await sql("CREATE TRIGGER test_echec_credit BEFORE UPDATE ON Credit FOR EACH ROW IF NEW.NomCredit = 'echec-credit' AND NEW.IDopRecu IS NOT NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'échec simulé'; END IF")
    const res = await post('/api/credits', user.token, {
      NomCredit: 'echec-credit', MontantInitial: 1000, MontantMensuel: 100, DateDebut: '2024-03-15', DateFin: '2025-03-15', IDcompte: compte.IDcompte
    })
    expect(res.status).toBe(500)
    expect(await sql('SELECT IDcredit FROM Credit WHERE IDcompte = ?', [compte.IDcompte])).toEqual([])
    expect(await sql('SELECT IDopRecu FROM OperationRecurrente WHERE IDcompte = ?', [compte.IDcompte])).toEqual([])
  })
})
