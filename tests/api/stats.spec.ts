import { beforeAll, describe, expect, it } from 'vitest'
import { createCategorie, createCompte, createOperation, createUser, get, sql, type TestUser } from './helpers'

let alice: TestUser
let bob: TestUser
let compte: any
let courses: any
let paie: any
let virement: any
let sante: any

beforeAll(async () => {
  alice = await createUser()
  bob = await createUser()
  compte = await createCompte(alice, { solde: 1000 })
  await createCompte(alice, { NomCompte: 'Retraite', solde: 500, retraite: true })
  courses = await createCategorie(alice, 'Courses', 'depense')
  sante = await createCategorie(alice, 'Santé', 'depense')
  paie = await createCategorie(alice, 'Paie', 'revenu')
  virement = await createCategorie(alice, 'Virement', 'transfert')

  await createOperation(alice, compte.IDcompte, { NomOp: 'Auchan', MontantOp: -100, IDcat: courses.IDcat, DateOp: '2024-01-10' })
  await createOperation(alice, compte.IDcompte, { NomOp: 'Médecin', MontantOp: -50, IDcat: sante.IDcat, DateOp: '2024-01-12' })
  await createOperation(alice, compte.IDcompte, { NomOp: 'Remboursement Sécu', MontantOp: 30, IDcat: sante.IDcat, DateOp: '2024-01-20' })
  await createOperation(alice, compte.IDcompte, { NomOp: 'Salaire', MontantOp: 2000, IDcat: paie.IDcat, DateOp: '2024-01-28' })
  await createOperation(alice, compte.IDcompte, { NomOp: 'Épargne', MontantOp: -5000, IDcat: virement.IDcat, DateOp: '2024-01-29' })
  await createOperation(alice, compte.IDcompte, { NomOp: 'Auchan 2023', MontantOp: -80, IDcat: courses.IDcat, DateOp: '2023-01-10' })

  // données d'un autre utilisateur : ne doivent jamais apparaître
  const bobCompte = await createCompte(bob)
  const bobCat = await createCategorie(bob, 'Bob dépense', 'depense')
  await createOperation(bob, bobCompte.IDcompte, { MontantOp: -777, IDcat: bobCat.IDcat, DateOp: '2024-01-15' })
})

describe('stats', () => {
  it('evolutionSolde : soldes par regroupement et séries journalières', async () => {
    const res = await get('/api/stats/evolutionSolde', alice.token)
    expect(res.status).toBe(200)
    expect(res.body.soldeGlobal).toBe(1000)
    expect(res.body.soldeRetraite).toBe(500)
    expect(res.body.soldeDispo).toBe(1000) // dispo = global hors comptes bloqués : le compte retraite n'y est plus
    expect(res.body.global[0]).toHaveProperty('montant')
    expect(res.body.global[0].date).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/)
    const total = res.body.global.reduce((sum: number, p: any) => sum + p.montant, 0)
    expect(total).toBeCloseTo(-100 - 50 + 30 + 2000 - 5000 - 80, 2) // aucun filtre de Type
  })

  it('incomeVsExpense : regroupé par Type, un remboursement net la dépense', async () => {
    const res = await get('/api/stats/incomeVsExpense', alice.token, { yearNumber: 2024 })
    expect(res.body.income[0]).toBe(2000)
    expect(res.body.expense[0]).toBe(-120) // -100 -50 +30 ; virement exclu
    expect(res.body.income[1]).toBe(0)
    expect((await get('/api/stats/incomeVsExpense', alice.token)).status).toBe(400)
  })

  it('yearComparison : dépenses seulement, séries de 12 mois et delta', async () => {
    const res = await get('/api/stats/yearComparison', alice.token, { yearA: 2023, yearB: 2024 })
    expect(res.body.yearA[0]).toBe(-80)
    expect(res.body.yearB[0]).toBe(-120)
    expect(res.body.deltaPct[0]).toBe(-50) // (B - A) / |A| : formule historique conservée
    expect(res.body.deltaPct[1]).toBeNull()
    expect(res.body.yearA).toHaveLength(12)
    expect((await get('/api/stats/yearComparison', alice.token, { yearA: 2023 })).status).toBe(400)
  })

  it('topCategories : Type=depense, plus grosse dépense en premier, limit bornée', async () => {
    const res = await get('/api/stats/topCategories', alice.token, { from: '2024-01-01', to: '2024-12-31' })
    expect(res.body.map((c: any) => c.libelle)).toEqual(['Courses', 'Santé'])
    expect(res.body[0].total).toBe(-100)
    expect(res.body[1].total).toBe(-20)
    const limited = await get('/api/stats/topCategories', alice.token, { from: '2024-01-01', to: '2024-12-31', limit: 1 })
    expect(limited.body).toHaveLength(1)
    expect((await get('/api/stats/topCategories', alice.token, { from: '2024-01-01' })).status).toBe(400)
    const inverted = await get('/api/stats/topCategories', alice.token, { from: '2024-12-31', to: '2024-01-01' })
    expect(inverted.status).toBe(400)
    expect(inverted.body.error.message).toBe('from must be earlier than to')
    expect((await get('/api/stats/topCategories', alice.token, { from: '2026-13-45', to: '2026-12-31' })).status).toBe(400)
    expect((await get('/api/stats/topOperations', alice.token, { from: '2026-02-30', to: '2026-12-31' })).status).toBe(400)
  })

  it('borne `to` inclusive sur toute la journée', async () => {
    const user = await createUser()
    const c = await createCompte(user)
    const cat = await createCategorie(user, 'Courses', 'depense')
    await createOperation(user, c.IDcompte, { MontantOp: -12, IDcat: cat.IDcat, DateOp: '2026-10-05T14:00:00.000Z' })
    const top = await get('/api/stats/topCategories', user.token, { from: '2026-10-05', to: '2026-10-05' })
    expect(top.body).toEqual([{ IDcat: cat.IDcat, libelle: 'Courses', total: -12 }])
    expect((await get('/api/stats/topOperations', user.token, { from: '2026-10-05', to: '2026-10-05' })).body).toHaveLength(1)
  })

  it('catégorie « Aucune » (IDcat 0) : comptée comme toute catégorie de dépense, entrées comprises, dans tous les graphiques', async () => {
    // Comme en production : IDcat = 0 est la catégorie partagée par défaut « Aucune », de Type 'depense'
    await sql("SET SESSION sql_mode = CONCAT(@@SESSION.sql_mode, ',NO_AUTO_VALUE_ON_ZERO')")
    await sql("INSERT IGNORE INTO Categorie (IDcat, Nom, IDuser, Type) VALUES (0, 'Aucune', 0, 'depense')")
    const user = await createUser()
    const c = await createCompte(user)
    const courses = await createCategorie(user, 'Courses', 'depense')
    await createOperation(user, c.IDcompte, { MontantOp: -30, IDcat: courses.IDcat, DateOp: '2025-03-10' })
    await createOperation(user, c.IDcompte, { MontantOp: -900, IDcat: 0, DateOp: '2025-03-05' })
    await createOperation(user, c.IDcompte, { MontantOp: -50, DateOp: '2025-03-20' }) // catégorie par défaut
    await createOperation(user, c.IDcompte, { MontantOp: 400, IDcat: 0, DateOp: '2025-03-21' }) // entrée : vient en déduction

    const top = await get('/api/stats/topCategories', user.token, { from: '2025-03-01', to: '2025-03-31' })
    expect(top.body).toEqual([
      { IDcat: 0, libelle: 'Aucune', total: -550 },
      { IDcat: courses.IDcat, libelle: 'Courses', total: -30 }
    ])
    const year = await get('/api/stats/yearComparison', user.token, { yearA: 2024, yearB: 2025 })
    expect(year.body.yearB[2]).toBe(-580)
    const heatmap = await get('/api/stats/categoryHeatmap', user.token, { yearNumber: 2025 })
    expect(heatmap.body.categories).toEqual([{ IDcat: 0, libelle: 'Aucune' }, { IDcat: courses.IDcat, libelle: 'Courses' }])
    expect(heatmap.body.data).toEqual(expect.arrayContaining([[2, 0, -550], [2, 1, -30]]))

    const month = await get('/api/operations/sumByUserByMonth', user.token, { monthNumber: 3, yearNumber: 2025 })
    expect(month.body[0].MonthNegative).toBe(-580)
    const byCat = await get('/api/operations/sumCategoriesByUserByMonth', user.token, { monthNumber: 3, yearNumber: 2025 })
    expect(byCat.body).toEqual(expect.arrayContaining([{ TotalMonth: -550, IDcat: 0 }, { TotalMonth: -30, IDcat: courses.IDcat }]))
    expect(byCat.body).toHaveLength(2)

    const income = await get('/api/stats/incomeVsExpense', user.token, { yearNumber: 2025 })
    expect(income.body.expense[2]).toBe(-580)
    expect(income.body.income[2]).toBe(0)
    const topOps = await get('/api/stats/topOperations', user.token, { from: '2025-03-01', to: '2025-03-31' })
    expect(topOps.body.map((o: any) => o.MontantOp)).toEqual([-900, 400, -50, -30])
  })

  it('regroupements : drapeaux non fournis lus comme leur défaut SQL, comptes enfant et retraite hors dispo', async () => {
    const user = await createUser()
    const insert = async (NomCompte: string, solde: number, flags: Record<string, number>) => {
      const cols = ['NomCompte', 'solde', 'IDuser', ...Object.keys(flags)]
      const res = await sql(
        `INSERT INTO Compte (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
        [NomCompte, solde, user.IDuser, ...Object.values(flags)]
      ) as unknown as { insertId: number }
      return res.insertId
    }
    // Drapeaux NOT NULL depuis 0002 : un compte inséré sans drapeau prend les défauts SQL (0, et 1 pour visible)
    const ancien = await insert('Ancien', 100, {})
    await insert('Retraite libre', 1000, { bloque: 0, retraite: 1, children: 0 })
    await insert('Enfant', 10000, { bloque: 0, retraite: 0, children: 1 })
    await insert('Bloqué', 100000, { bloque: 1, retraite: 0, children: 0 })
    await createOperation(user, ancien, { MontantOp: -10, DateOp: '2025-01-01' })

    const res = (await get('/api/stats/evolutionSolde', user.token)).body
    expect(res.soldeGlobal).toBe(100100) // Ancien + Bloqué
    expect(res.soldeRetraite).toBe(1000)
    expect(res.soldeDispo).toBe(100) // Ancien seulement
    expect(res.global).toEqual([{ montant: -10, date: '2025-01-01T00:00:00.000Z' }])
    expect(res.dispo).toEqual([{ montant: -10, date: '2025-01-01T00:00:00.000Z' }])

    const all = (await get('/api/operations/sumAllCompteForUser', user.token)).body
    expect(all).toEqual([{ IDCompte: ancien, TotalNotChecked: -10 }]) // visible par défaut
  })

  it('topOperations : transferts exclus, tri par valeur absolue', async () => {
    const res = await get('/api/stats/topOperations', alice.token, { from: '2024-01-01', to: '2024-12-31' })
    const names = res.body.map((o: any) => o.NomOp)
    expect(names[0]).toBe('Salaire')
    expect(names).not.toContain('Épargne')
    expect(res.body.every((o: any) => o.IDcompte === compte.IDcompte)).toBe(true)
  })

  it('categoryHeatmap : matrice mois × catégorie', async () => {
    const res = await get('/api/stats/categoryHeatmap', alice.token, { yearNumber: 2024 })
    expect(res.body.categories.map((c: any) => c.libelle)).toEqual(['Courses', 'Santé'])
    expect(res.body.data).toEqual(expect.arrayContaining([[0, 0, -100], [0, 1, -20]]))
  })

  it('isolation : un utilisateur sans compte reçoit des résultats vides', async () => {
    const nobody = await createUser()
    expect((await get('/api/stats/topCategories', nobody.token, { from: '2024-01-01', to: '2024-12-31' })).body).toEqual([])
    expect((await get('/api/stats/incomeVsExpense', nobody.token, { yearNumber: 2024 })).body.income).toEqual(new Array(12).fill(0))
    const bobTop = await get('/api/stats/topOperations', bob.token, { from: '2024-01-01', to: '2024-12-31' })
    expect(bobTop.body.map((o: any) => o.MontantOp)).toEqual([-777])
  })

  it('sans JWT : 401', async () => {
    expect((await get('/api/stats/evolutionSolde')).status).toBe(401)
  })
})
