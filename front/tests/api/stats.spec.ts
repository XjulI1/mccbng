import { beforeAll, describe, expect, it } from 'vitest'
import { createCategorie, createCompte, createOperation, createUser, get, type TestUser } from './helpers'

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
    expect(res.body.soldeDispo).toBe(1500)
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
