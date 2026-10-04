import { beforeAll, describe, expect, it } from 'vitest'
import {
  createCategorie, createCompte, createOperation, createUser, del, get, patch, post, put, sql, type TestUser
} from './helpers'

let alice: TestUser
let bob: TestUser

beforeAll(async () => {
  alice = await createUser()
  bob = await createUser()
})

describe('opérations', () => {
  it('création : défauts, FLOAT exact, date ISO ; compte d\'autrui → 404', async () => {
    const compte = await createCompte(alice)
    const op = await createOperation(alice, compte.IDcompte, { MontantOp: -12.34, DateOp: '2024-01-15' })
    expect(op).toMatchObject({ MontantOp: -12.34, CheckOp: false, IDcat: 0, amortissement: false, DateOp: '2024-01-15T00:00:00.000Z' })

    const bobCompte = await createCompte(bob)
    const res = await post('/api/operations', alice.token, { NomOp: 'x', MontantOp: 1, DateOp: '2024-01-01', IDcompte: bobCompte.IDcompte })
    expect(res.status).toBe(404)
    expect(res.body.error.message).toBe(`Compte ${bobCompte.IDcompte} not found`)
  })

  it('corps invalide : 422', async () => {
    const compte = await createCompte(alice)
    const res = await post('/api/operations', alice.token, { NomOp: 'x', MontantOp: 'abc', DateOp: '2024-01-01', IDcompte: compte.IDcompte })
    expect(res.status).toBe(422)
  })

  it('pointage via PATCH, PUT, DELETE ; isolation entre utilisateurs', async () => {
    const compte = await createCompte(alice)
    const op = await createOperation(alice, compte.IDcompte)
    expect((await patch(`/api/operations/${op.IDop}`, alice.token, { CheckOp: true })).status).toBe(204)
    expect((await get(`/api/operations/${op.IDop}`, alice.token)).body.CheckOp).toBe(true)

    expect((await get(`/api/operations/${op.IDop}`, bob.token)).status).toBe(404)
    expect((await patch(`/api/operations/${op.IDop}`, bob.token, { CheckOp: false })).status).toBe(404)
    expect((await del(`/api/operations/${op.IDop}`, bob.token)).status).toBe(404)

    // déplacer une opération vers le compte d'autrui est interdit
    const bobCompte = await createCompte(bob)
    expect((await patch(`/api/operations/${op.IDop}`, alice.token, { IDcompte: bobCompte.IDcompte })).status).toBe(404)

    const replaced = await put(`/api/operations/${op.IDop}`, alice.token, { NomOp: 'Remplacée', MontantOp: -5, DateOp: '2024-02-02', IDcompte: compte.IDcompte })
    expect(replaced.status).toBe(204)
    expect((await get(`/api/operations/${op.IDop}`, alice.token)).body).toMatchObject({ NomOp: 'Remplacée', CheckOp: false, IDcat: 0 })
    expect((await del(`/api/operations/${op.IDop}`, alice.token)).status).toBe(204)
  })

  it('pagination, ordre CheckOp ASC / DateOp DESC, recherche or/like transverse', async () => {
    const carol = await createUser()
    const c1 = await createCompte(carol, { NomCompte: 'C1' })
    const c2 = await createCompte(carol, { NomCompte: 'C2' })
    for (let i = 1; i <= 5; i++) {
      await createOperation(carol, c1.IDcompte, { NomOp: `Loyer ${i}`, DateOp: `2024-01-0${i}`, MontantOp: -i })
    }
    await createOperation(carol, c2.IDcompte, { NomOp: 'Courses', DateOp: '2024-01-10', MontantOp: -99 })

    const page1 = await get('/api/operations', carol.token, {
      filter: { where: { IDcompte: c1.IDcompte }, order: 'CheckOp ASC, DateOp DESC', limit: 2, skip: 0 }
    })
    const page2 = await get('/api/operations', carol.token, {
      filter: { where: { IDcompte: c1.IDcompte }, order: 'CheckOp ASC, DateOp DESC', limit: 2, skip: 2 }
    })
    expect(page1.body.map((o: any) => o.NomOp)).toEqual(['Loyer 5', 'Loyer 4'])
    expect(page2.body.map((o: any) => o.NomOp)).toEqual(['Loyer 3', 'Loyer 2'])

    const search = await get('/api/operations', carol.token, {
      filter: {
        where: { IDcompte: { inq: [c1.IDcompte, c2.IDcompte] }, or: [{ NomOp: { like: '%loyer%' } }, { MontantOp: { like: '%loyer%' } }] },
        order: 'DateOp DESC'
      }
    })
    expect(search.body).toHaveLength(5)

    // inq vers les comptes d'autrui : le scope utilisateur s'applique en plus
    const bobCompte = await createCompte(bob)
    const leak = await get('/api/operations', carol.token, { filter: { where: { IDcompte: { inq: [bobCompte.IDcompte] } } } })
    expect(leak.body).toEqual([])
    const count = await get('/api/operations/count', carol.token, { where: { IDcompte: c1.IDcompte } })
    expect(count.body).toEqual({ count: 5 })
  })
})

describe('agrégats', () => {
  it('sumAllCompteForUser / sumForACompte : toutes catégories, comptes visibles uniquement', async () => {
    const dave = await createUser()
    const visible = await createCompte(dave, { NomCompte: 'V' })
    const hidden = await createCompte(dave, { NomCompte: 'H', visible: false })
    const transfert = await createCategorie(dave, 'Virement', 'transfert')
    await createOperation(dave, visible.IDcompte, { MontantOp: 100, CheckOp: true })
    await createOperation(dave, visible.IDcompte, { MontantOp: -30, CheckOp: false, IDcat: transfert.IDcat })
    await createOperation(dave, hidden.IDcompte, { MontantOp: 7, CheckOp: true })

    const all = (await get('/api/operations/sumAllCompteForUser', dave.token)).body
    expect(all).toHaveLength(1)
    expect(all[0]).toMatchObject({ TotalChecked: 100, TotalNotChecked: -30 })

    const one = (await get('/api/operations/sumForACompte', dave.token, { id: visible.IDcompte })).body
    expect(one).toMatchObject({ TotalChecked: 100, TotalNotChecked: -30 })

    const other = await createCompte(bob)
    expect((await get('/api/operations/sumForACompte', dave.token, { id: other.IDcompte })).status).toBe(404)
  })

  it('sumAllCompteForUser : un compte dont toutes les opérations sont non pointées est listé', async () => {
    const gus = await createUser()
    const mixte = await createCompte(gus, { NomCompte: 'Mixte' })
    const nonPointe = await createCompte(gus, { NomCompte: 'Non pointé' })
    await createOperation(gus, mixte.IDcompte, { MontantOp: 100, CheckOp: true })
    await createOperation(gus, nonPointe.IDcompte, { MontantOp: 300 })

    const all = (await get('/api/operations/sumAllCompteForUser', gus.token)).body
    expect(all).toHaveLength(2)
    expect(all.find((r: any) => r.IDCompte === mixte.IDcompte)).toMatchObject({ TotalChecked: 100 })
    const ligne = all.find((r: any) => r.IDCompte === nonPointe.IDcompte)
    expect(ligne).toMatchObject({ TotalNotChecked: 300 })
    expect(ligne.TotalChecked).toBeUndefined()
  })

  it('totaux mensuels : Type=depense uniquement', async () => {
    const erin = await createUser()
    const compte = await createCompte(erin)
    const dep = await createCategorie(erin, 'Courses', 'depense')
    const rev = await createCategorie(erin, 'Paie', 'revenu')
    await createOperation(erin, compte.IDcompte, { MontantOp: -40, IDcat: dep.IDcat, DateOp: '2024-03-10' })
    await createOperation(erin, compte.IDcompte, { MontantOp: -10.5, IDcat: dep.IDcat, DateOp: '2024-03-20' })
    await createOperation(erin, compte.IDcompte, { MontantOp: 2000, IDcat: rev.IDcat, DateOp: '2024-03-25' })
    await createOperation(erin, compte.IDcompte, { MontantOp: -70, IDcat: dep.IDcat, DateOp: '2024-04-01' })

    const month = await get('/api/operations/sumByUserByMonth', erin.token, { monthNumber: 3, yearNumber: 2024 })
    expect(month.body[0].MonthNegative).toBe(-50.5)
    const withCompte = await get('/api/operations/sumByUserByMonth', erin.token, { monthNumber: 3, yearNumber: 2024, IDCompte: compte.IDcompte })
    expect(withCompte.body[0].MonthNegative).toBe(-50.5)
    const byCat = await get('/api/operations/sumCategoriesByUserByMonth', erin.token, { monthNumber: 3, yearNumber: 2024 })
    expect(byCat.body).toEqual([{ TotalMonth: -50.5, IDcat: dep.IDcat }])
    expect((await get('/api/operations/sumByUserByMonth', erin.token, { monthNumber: 3, yearNumber: 2024, IDCompte: (await createCompte(bob)).IDcompte })).status).toBe(404)
  })

  it('suggestCategories : fréquence, bornes de limit, nom trop court', async () => {
    const fay = await createUser()
    const compte = await createCompte(fay)
    const a = await createCategorie(fay, 'A')
    const b = await createCategorie(fay, 'B')
    for (let i = 0; i < 3; i++) await createOperation(fay, compte.IDcompte, { NomOp: 'Boulangerie Dupont', IDcat: a.IDcat })
    await createOperation(fay, compte.IDcompte, { NomOp: 'BOULANGERIE du coin', IDcat: b.IDcat })

    const res = (await get('/api/operations/suggestCategories', fay.token, { operationName: 'boulang' })).body
    expect(res.map((r: any) => r.IDcat)).toEqual([a.IDcat, b.IDcat])
    expect(res[0]).toMatchObject({ count: 3, weight: 75 })
    expect((await get('/api/operations/suggestCategories', fay.token, { operationName: 'boulang', limit: 1 })).body).toHaveLength(1)
    expect((await get('/api/operations/suggestCategories', fay.token, { operationName: 'b' })).body).toEqual([])
    expect((await get('/api/operations/suggestCategories', fay.token, { operationName: 'boulang', limit: 500 })).status).toBe(200)
    // jamais les opérations d'autrui
    expect((await get('/api/operations/suggestCategories', bob.token, { operationName: 'boulang' })).body).toEqual([])
  })
})

describe('opérations récurrentes', () => {
  const recurrente = (IDcompte: number, extra: Record<string, unknown> = {}) => ({
    NomOpRecu: 'Loyer', MontantOpRecu: -500, JourOpRecu: 1, DernierDateOpRecu: '2024-01-05', IDcompte, ...extra
  })

  it('CRUD : défauts, compte d\'autrui → 404', async () => {
    const compte = await createCompte(alice)
    const created = await post('/api/operation-recurrentes', alice.token, recurrente(compte.IDcompte))
    expect(created.status).toBe(200)
    expect(created.body).toMatchObject({ JourNumOpRecu: 1, MoisOpRecu: 1, Frequence: 3, IDcat: 0 })
    const bobCompte = await createCompte(bob)
    expect((await post('/api/operation-recurrentes', alice.token, recurrente(bobCompte.IDcompte))).status).toBe(404)
    expect((await get(`/api/operation-recurrentes/${created.body.IDopRecu}`, bob.token)).status).toBe(404)
    expect((await del(`/api/operation-recurrentes/${created.body.IDopRecu}`, alice.token)).status).toBe(204)
  })

  it('auto-génération : mensuelle échue, récente, annuelle ; idempotence', async () => {
    const gina = await createUser()
    const compte = await createCompte(gina)
    const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()
    const due = (await post('/api/operation-recurrentes', gina.token, recurrente(compte.IDcompte, { NomOpRecu: 'Échue', DernierDateOpRecu: daysAgo(20) }))).body
    const recent = (await post('/api/operation-recurrentes', gina.token, recurrente(compte.IDcompte, { NomOpRecu: 'Récente', DernierDateOpRecu: daysAgo(5) }))).body
    const yearly = (await post('/api/operation-recurrentes', gina.token, recurrente(compte.IDcompte, { NomOpRecu: 'Annuelle', Frequence: 7, DernierDateOpRecu: daysAgo(400) }))).body
    const yearlyRecent = (await post('/api/operation-recurrentes', gina.token, recurrente(compte.IDcompte, { NomOpRecu: 'Annuelle récente', Frequence: 7, DernierDateOpRecu: daysAgo(100) }))).body

    const res = await post('/api/operation-recurrentes/auto-generation', gina.token, {})
    expect(res.status).toBe(200)
    expect(res.body).toEqual({})

    const ops = await sql('SELECT NomOp, CheckOp FROM Operation WHERE IDcompte = ?', [compte.IDcompte])
    expect(ops.map((o: any) => o.NomOp).sort()).toEqual(['Annuelle', 'Échue'])
    expect(ops.every((o: any) => o.CheckOp === 0)).toBe(true)

    const [after] = await sql('SELECT DernierDateOpRecu FROM OperationRecurrente WHERE IDopRecu = ?', [due.IDopRecu])
    expect(new Date(after.DernierDateOpRecu).getTime()).toBeGreaterThan(new Date(due.DernierDateOpRecu).getTime())
    // les récurrentes non échues ne bougent pas
    const [untouched] = await sql('SELECT DernierDateOpRecu FROM OperationRecurrente WHERE IDopRecu IN (?, ?) ORDER BY IDopRecu', [recent.IDopRecu, yearlyRecent.IDopRecu])
    expect(untouched).toBeDefined()
    void yearly

    // 2e appel : l'échue (désormais +1 mois, donc dans moins de 15 j ou déjà passée) ne produit au plus qu'une occurrence de plus
    await post('/api/operation-recurrentes/auto-generation', gina.token, {})
    const again = await sql('SELECT COUNT(*) AS n FROM Operation WHERE IDcompte = ?', [compte.IDcompte])
    expect(again[0].n).toBeLessThanOrEqual(3)
  })

  it('auto-génération ne touche pas les récurrentes d\'autrui', async () => {
    const hank = await createUser()
    const ivy = await createUser()
    const compte = await createCompte(ivy)
    await post('/api/operation-recurrentes', ivy.token, recurrente(compte.IDcompte, { DernierDateOpRecu: new Date(Date.now() - 30 * 86_400_000).toISOString() }))
    await post('/api/operation-recurrentes/auto-generation', hank.token, {})
    const ops = await sql('SELECT COUNT(*) AS n FROM Operation WHERE IDcompte = ?', [compte.IDcompte])
    expect(ops[0].n).toBe(0)
  })
})
