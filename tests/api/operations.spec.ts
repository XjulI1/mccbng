import { beforeAll, describe, expect, it } from 'vitest'
import {
  createCategorie, createCompte, createOperation, createUser, del, get, patch, post, put, sql, type TestUser
} from './helpers'
import { searchOperationsWhere } from '../../app/services/operation'
import {
  addDays, firstDueOnOrAfter, initialLastDate, prevDueDate, startOfUtcDay, type RecurrenceRule
} from '../../server/utils/schedule'

let alice: TestUser
let bob: TestUser

const today = () => startOfUtcDay(new Date())
const iso = (date: Date | string) => new Date(date).toISOString().slice(0, 10)

// Les `count` dernières échéances dues (≤ aujourd'hui + anticipation) et la DernierDateOpRecu qui les précède
const lastDues = (rule: RecurrenceRule, count: number, anticipation = 15) => {
  const dues = [prevDueDate(rule, firstDueOnOrAfter(rule, addDays(today(), anticipation + 1)))]
  while (dues.length < count) dues.unshift(prevDueDate(rule, dues[0]!))
  return { dues, last: prevDueDate(rule, dues[0]!) }
}

// Crée une récurrente par l'API puis impose sa règle et sa DernierDateOpRecu en base (état historique simulé)
const createRecurrente = async (user: TestUser, IDcompte: number, rule: RecurrenceRule, last: Date) => {
  const res = await post('/api/operation-recurrentes', user.token, {
    NomOpRecu: 'Loyer', MontantOpRecu: -500, JourOpRecu: 1, IDcompte, ...rule
  })
  if (res.status !== 200) throw new Error(`createRecurrente: ${res.status} ${JSON.stringify(res.body)}`)
  await sql('UPDATE OperationRecurrente SET DernierDateOpRecu = ? WHERE IDopRecu = ?', [last, res.body.IDopRecu])
  return res.body.IDopRecu as number
}

// Insertion directe d'opérations en nombre (non pointées, catégorie « Aucune »)
const insertOperations = async (IDcompte: number, rows: { NomOp: string; MontantOp: number; DateOp?: string }[]) => {
  await sql('INSERT INTO Operation (NomOp, MontantOp, DateOp, IDcompte, CheckOp, IDcat, amortissement) VALUES ?', [
    rows.map(r => [r.NomOp, r.MontantOp, new Date(r.DateOp ?? '2024-05-10T00:00:00.000Z'), IDcompte, 0, 0, 0])
  ])
}

const generatedDates = async (IDcompte: number) =>
  (await sql('SELECT DateOp FROM Operation WHERE IDcompte = ? ORDER BY DateOp, IDop', [IDcompte])).map((o: any) => iso(o.DateOp))

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
        where: searchOperationsWhere('loyer', [c1.IDcompte, c2.IDcompte]),
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

  it('pagination : 40 opérations à la même date, deux pages de 35 sans doublon ni trou', async () => {
    const user = await createUser()
    const compte = await createCompte(user)
    await insertOperations(compte.IDcompte, Array.from({ length: 40 }, (_, i) => ({ NomOp: `Op ${i}`, MontantOp: -1 })))
    const page = async (skip: number) => (await get('/api/operations', user.token, {
      filter: { where: { IDcompte: compte.IDcompte }, order: 'CheckOp ASC, DateOp DESC', limit: 35, skip }
    })).body.map((o: any) => o.IDop as number)
    const ids = [...await page(0), ...await page(35)]
    expect(ids).toHaveLength(40)
    expect(new Set(ids).size).toBe(40)
    expect(ids).toEqual([...ids].sort((a, b) => b - a)) // départage par IDop, dans le sens du dernier critère
  })

  it('liste bornée : limite par défaut sans limit, avec un skip seul, et plafond d\'un limit explicite', async () => {
    const user = await createUser()
    const compte = await createCompte(user)
    await insertOperations(compte.IDcompte, Array.from({ length: 1005 }, (_, i) => ({ NomOp: `Op ${i}`, MontantOp: -1 })))
    const where = { IDcompte: compte.IDcompte }
    const list = async (filter: Record<string, unknown>) => {
      const res = await get('/api/operations', user.token, { filter: { where, ...filter } })
      expect(res.status).toBe(200)
      expect(res.headers.get('X-Result-Truncated')).toBeNull()
      return res.body as any[]
    }
    expect(await list({})).toHaveLength(1000)
    expect(await list({ skip: 3 })).toHaveLength(1000)
    expect(await list({ skip: 1000 })).toHaveLength(5)
    expect(await list({ limit: 5000 })).toHaveLength(1000)
  })

  it('like : refusé sur une colonne non textuelle, avant toute requête', async () => {
    for (const where of [{ MontantOp: { like: '%12%' } }, { DateOp: { like: '2024%' } }, { CheckOp: { nlike: '1' } }]) {
      const res = await get('/api/operations', alice.token, { filter: { where } })
      expect(res.status).toBe(400)
    }
  })

  it('recherche transverse : montant en valeur absolue (entier = plage d\'un euro, décimal = exact), jokers littéraux', async () => {
    const user = await createUser()
    const c1 = await createCompte(user)
    const c2 = await createCompte(user)
    await insertOperations(c1.IDcompte, [
      { NomOp: 'A', MontantOp: -12.5 }, { NomOp: 'B', MontantOp: 12.5 }, { NomOp: 'C', MontantOp: 112.5 },
      { NomOp: 'D', MontantOp: 12.55 }, { NomOp: 'E', MontantOp: -12.99 }, { NomOp: 'F', MontantOp: 12 },
      { NomOp: 'G', MontantOp: 12.49 }, { NomOp: 'H', MontantOp: 13 }, { NomOp: 'I', MontantOp: 1200 }
    ])
    await insertOperations(c2.IDcompte, [
      { NomOp: 'Remise 100%', MontantOp: -1 }, { NomOp: 'Remise 1000', MontantOp: -1 }, { NomOp: 'Remise 10_0', MontantOp: -1 }
    ])
    const search = async (term: string) => (await get('/api/operations', user.token, {
      filter: { where: searchOperationsWhere(term, [c1.IDcompte, c2.IDcompte]), order: 'NomOp ASC' }
    })).body.map((o: any) => o.NomOp)
    expect(await search('12,5')).toEqual(['A', 'B'])
    expect(await search('-12.50')).toEqual(['A', 'B'])
    expect(await search('12')).toEqual(['A', 'B', 'D', 'E', 'F', 'G'])
    expect(await search('100%')).toEqual(['Remise 100%'])
    expect(await search('10_0')).toEqual(['Remise 10_0'])
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

  it('agrégats : une échéance datée dans le futur reste comptée, totaux arrondis', async () => {
    const user = await createUser()
    const compte = await createCompte(user)
    await createOperation(user, compte.IDcompte, { MontantOp: -0.1, CheckOp: true })
    await createOperation(user, compte.IDcompte, { MontantOp: -0.2, CheckOp: true })
    await createOperation(user, compte.IDcompte, { MontantOp: -850, DateOp: addDays(new Date(), 10).toISOString() })
    const one = (await get('/api/operations/sumForACompte', user.token, { id: compte.IDcompte })).body
    expect(one).toEqual({ IDCompte: compte.IDcompte, TotalChecked: -0.3, TotalNotChecked: -850 })
    expect((await get('/api/operations/sumForACompte', user.token, { id: (await createCompte(user)).IDcompte })).body).toEqual({})
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

    // bornes du mois : premier et dernier instant de mars, puis les instants voisins de février et d'avril
    const boundaries = [
      ['2024-03-01T00:00:00.000Z', -0.25], ['2024-03-31T23:59:59.000Z', -0.25],
      ['2024-02-29T23:59:59.000Z', -1000], ['2024-04-01T00:00:00.000Z', -1000]
    ] as const
    const bornes = await createCompte(erin)
    for (const [DateOp, MontantOp] of boundaries) await createOperation(erin, bornes.IDcompte, { MontantOp, IDcat: dep.IDcat, DateOp })
    const marchBornes = await get('/api/operations/sumByUserByMonth', erin.token, { monthNumber: 3, yearNumber: 2024, IDCompte: bornes.IDcompte })
    expect(marchBornes.body[0].MonthNegative).toBe(-0.5)
    expect((await get('/api/operations/sumCategoriesByUserByMonth', erin.token, { monthNumber: 3, yearNumber: 2024 })).body)
      .toEqual([{ TotalMonth: -51, IDcat: dep.IDcat }])
    expect((await get('/api/operations/sumByUserByMonth', erin.token, { monthNumber: 13, yearNumber: 2024 })).status).toBe(400)
    await sql('DELETE FROM Operation WHERE IDcompte = ?', [bornes.IDcompte])

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

  it('suggestCategories : jokers saisis cherchés littéralement', async () => {
    const user = await createUser()
    const compte = await createCompte(user)
    const a = await createCategorie(user, 'A')
    const b = await createCategorie(user, 'B')
    await createOperation(user, compte.IDcompte, { NomOp: 'Remise 100%', IDcat: a.IDcat })
    await createOperation(user, compte.IDcompte, { NomOp: 'Remise 1000', IDcat: b.IDcat })
    const res = (await get('/api/operations/suggestCategories', user.token, { operationName: '100%' })).body
    expect(res.map((r: any) => r.IDcat)).toEqual([a.IDcat])
    expect((await get('/api/operations/suggestCategories', user.token, { operationName: 'REMISE' })).body).toHaveLength(2)
  })
})

describe('opérations récurrentes', () => {
  const recurrente = (IDcompte: number, extra: Record<string, unknown> = {}) => ({
    NomOpRecu: 'Loyer', MontantOpRecu: -500, JourOpRecu: 1, DernierDateOpRecu: '2024-01-05', IDcompte, ...extra
  })
  const monthly = (JourNumOpRecu: number): RecurrenceRule => ({ Frequence: 3, JourNumOpRecu, MoisOpRecu: 0 })

  it('CRUD : défauts (MoisOpRecu = 0), compte d\'autrui → 404', async () => {
    const compte = await createCompte(alice)
    const created = await post('/api/operation-recurrentes', alice.token, recurrente(compte.IDcompte))
    expect(created.status).toBe(200)
    expect(created.body).toMatchObject({ JourNumOpRecu: 1, MoisOpRecu: 0, Frequence: 3, IDcat: 0 })
    const bobCompte = await createCompte(bob)
    expect((await post('/api/operation-recurrentes', alice.token, recurrente(bobCompte.IDcompte))).status).toBe(404)
    expect((await get(`/api/operation-recurrentes/${created.body.IDopRecu}`, bob.token)).status).toBe(404)
    expect((await del(`/api/operation-recurrentes/${created.body.IDopRecu}`, alice.token)).status).toBe(204)
  })

  it('validation : Frequence ∈ {3, 7}, JourNumOpRecu 1-31, MoisOpRecu 0-11, IDcredit refusé, sans écriture', async () => {
    const compte = await createCompte(alice)
    for (const invalid of [{ Frequence: 5 }, { JourNumOpRecu: 0 }, { JourNumOpRecu: 32 }, { MoisOpRecu: 12 }, { MoisOpRecu: -1 }, { IDcredit: 1 }]) {
      const res = await post('/api/operation-recurrentes', alice.token, recurrente(compte.IDcompte, invalid))
      expect(res.status, JSON.stringify(invalid)).toBe(422)
    }
    expect((await sql('SELECT COUNT(*) AS n FROM OperationRecurrente WHERE IDcompte = ?', [compte.IDcompte]))[0].n).toBe(0)
    // valeurs reçues en chaîne depuis un <select>
    const annual = await post('/api/operation-recurrentes', alice.token, recurrente(compte.IDcompte, { Frequence: '7', MoisOpRecu: '11', JourNumOpRecu: '31' }))
    expect(annual.status).toBe(200)
    expect(annual.body).toMatchObject({ Frequence: 7, MoisOpRecu: 11, JourNumOpRecu: 31 })
    const patched = await patch(`/api/operation-recurrentes/${annual.body.IDopRecu}`, alice.token, { Frequence: 4 })
    expect(patched.status).toBe(422)
  })

  it('création : DernierDateOpRecu reçu ignoré, la première échéance à venir est générée', async () => {
    const compte = await createCompte(alice)
    const rule = monthly(new Date().getUTCDate())
    const created = (await post('/api/operation-recurrentes', alice.token, recurrente(compte.IDcompte, {
      JourNumOpRecu: rule.JourNumOpRecu, DernierDateOpRecu: new Date().toISOString()
    }))).body
    const [row] = await sql('SELECT DernierDateOpRecu FROM OperationRecurrente WHERE IDopRecu = ?', [created.IDopRecu])
    expect(iso(row.DernierDateOpRecu)).toBe(iso(initialLastDate(rule, new Date())))
    // échéance du jour : générée au premier appel
    const user = alice
    await post('/api/operation-recurrentes/auto-generation', user.token, {})
    expect(await generatedDates(compte.IDcompte)).toEqual([iso(today())])
  })

  it('auto-génération : échéance au jour choisi, une seule par appel répété', async () => {
    const gina = await createUser()
    const compte = await createCompte(gina)
    const target = addDays(today(), -3)
    const rule = monthly(target.getUTCDate())
    const recu = await createRecurrente(gina, compte.IDcompte, rule, prevDueDate(rule, target))

    const res = await post('/api/operation-recurrentes/auto-generation', gina.token, {})
    expect(res.status).toBe(200)
    expect(res.body).toEqual({})
    expect(await generatedDates(compte.IDcompte)).toEqual([iso(target)])
    const [row] = await sql('SELECT DernierDateOpRecu FROM OperationRecurrente WHERE IDopRecu = ?', [recu])
    expect(iso(row.DernierDateOpRecu)).toBe(iso(target))
    const ops = await sql('SELECT CheckOp, MontantOp FROM Operation WHERE IDcompte = ?', [compte.IDcompte])
    expect(ops).toEqual([{ CheckOp: 0, MontantOp: -500 }])

    await post('/api/operation-recurrentes/auto-generation', gina.token, {})
    expect(await generatedDates(compte.IDcompte)).toEqual([iso(target)])
  })

  it('auto-génération : échéance à plus de 15 jours non générée', async () => {
    const user = await createUser()
    const compte = await createCompte(user)
    const rule = monthly(1)
    const { dues } = lastDues(rule, 1)
    await createRecurrente(user, compte.IDcompte, rule, dues[0]!)
    await post('/api/operation-recurrentes/auto-generation', user.token, {})
    expect(await generatedDates(compte.IDcompte)).toEqual([])
  })

  it('auto-génération : rattrapage complet en un appel, jour 31 borné en fin de mois', async () => {
    const user = await createUser()
    const compte = await createCompte(user)
    const rule = monthly(31)
    const { dues, last } = lastDues(rule, 3)
    await createRecurrente(user, compte.IDcompte, rule, last)
    await post('/api/operation-recurrentes/auto-generation', user.token, {})
    expect(await generatedDates(compte.IDcompte)).toEqual(dues.map(iso))
    expect(dues.every(d => d.getUTCDate() === new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate())).toBe(true)
  })

  it('auto-génération : annuelle au mois et au jour choisis', async () => {
    const user = await createUser()
    const compte = await createCompte(user)
    const target = addDays(today(), -2)
    const rule: RecurrenceRule = { Frequence: 7, JourNumOpRecu: target.getUTCDate(), MoisOpRecu: target.getUTCMonth() }
    await createRecurrente(user, compte.IDcompte, rule, prevDueDate(rule, target))
    await post('/api/operation-recurrentes/auto-generation', user.token, {})
    expect(await generatedDates(compte.IDcompte)).toEqual([iso(target)])
  })

  it('auto-génération : appels concurrents sans doublon', async () => {
    const user = await createUser()
    const compte = await createCompte(user)
    const rule = monthly(10)
    const { dues, last } = lastDues(rule, 3)
    await createRecurrente(user, compte.IDcompte, rule, last)
    const results = await Promise.all([1, 2, 3, 4].map(() => post('/api/operation-recurrentes/auto-generation', user.token, {})))
    expect(results.map(r => r.status)).toEqual([200, 200, 200, 200])
    expect(await generatedDates(compte.IDcompte)).toEqual(dues.map(iso))
  })

  it('auto-génération : DernierDateOpRecu historique portant une heure', async () => {
    const user = await createUser()
    const compte = await createCompte(user)
    const target = addDays(today(), -1)
    const rule = monthly(target.getUTCDate())
    const last = new Date(prevDueDate(rule, target).getTime() + (14 * 60 + 37) * 60_000)
    await createRecurrente(user, compte.IDcompte, rule, last)
    await post('/api/operation-recurrentes/auto-generation', user.token, {})
    await post('/api/operation-recurrentes/auto-generation', user.token, {})
    expect(await generatedDates(compte.IDcompte)).toEqual([iso(target)])
  })

  it('auto-génération : au plus 24 échéances par appel', async () => {
    const user = await createUser()
    const compte = await createCompte(user)
    const rule = monthly(1)
    const { dues, last } = lastDues(rule, 30)
    await createRecurrente(user, compte.IDcompte, rule, last)
    await post('/api/operation-recurrentes/auto-generation', user.token, {})
    expect(await generatedDates(compte.IDcompte)).toEqual(dues.slice(0, 24).map(iso))
    await post('/api/operation-recurrentes/auto-generation', user.token, {})
    expect(await generatedDates(compte.IDcompte)).toEqual(dues.map(iso))
  })

  it('auto-génération : récurrente orpheline (crédit inexistant) ignorée', async () => {
    const user = await createUser()
    const compte = await createCompte(user)
    const rule = monthly(10)
    const { last } = lastDues(rule, 2)
    const recu = await createRecurrente(user, compte.IDcompte, rule, last)
    await sql('UPDATE OperationRecurrente SET IDcredit = ? WHERE IDopRecu = ?', [2_000_000_000, recu])
    await post('/api/operation-recurrentes/auto-generation', user.token, {})
    expect(await generatedDates(compte.IDcompte)).toEqual([])
  })

  it('auto-génération ne touche pas les récurrentes d\'autrui', async () => {
    const hank = await createUser()
    const ivy = await createUser()
    const compte = await createCompte(ivy)
    const rule = monthly(10)
    await createRecurrente(ivy, compte.IDcompte, rule, lastDues(rule, 2).last)
    await post('/api/operation-recurrentes/auto-generation', hank.token, {})
    expect(await generatedDates(compte.IDcompte)).toEqual([])
  })

  it('récurrente d\'un crédit : lecture seule (409), ignorée par le PATCH en masse', async () => {
    const user = await createUser()
    const compte = await createCompte(user)
    const credit = (await post('/api/credits', user.token, {
      NomCredit: 'Auto', MontantInitial: 1000, MontantMensuel: 100, DateDebut: '2024-03-15', DateFin: '2099-03-15', IDcompte: compte.IDcompte
    })).body
    const simple = (await post('/api/operation-recurrentes', user.token, recurrente(compte.IDcompte))).body
    const url = `/api/operation-recurrentes/${credit.IDopRecu}`

    const patched = await patch(url, user.token, { MontantOpRecu: -1 })
    expect(patched.status).toBe(409)
    expect(patched.body.error.message).toBe(`Recurring operation ${credit.IDopRecu} is managed by credit ${credit.IDcredit}`)
    expect((await put(url, user.token, recurrente(compte.IDcompte))).status).toBe(409)
    expect((await del(url, user.token)).status).toBe(409)

    const bulk = await patch('/api/operation-recurrentes', user.token, { MontantOpRecu: -42 })
    expect(bulk.body).toEqual({ count: 1 })
    const rows = await sql('SELECT IDopRecu, MontantOpRecu FROM OperationRecurrente WHERE IDcompte = ? ORDER BY IDopRecu', [compte.IDcompte])
    expect(rows).toEqual([{ IDopRecu: credit.IDopRecu, MontantOpRecu: 100 }, { IDopRecu: simple.IDopRecu, MontantOpRecu: -42 }])
  })
})

describe('virement', () => {
  it('crée le débit et le crédit, avec la catégorie sur les deux', async () => {
    const user = await createUser()
    const a = await createCompte(user, { NomCompte: 'A' })
    const b = await createCompte(user, { NomCompte: 'B' })
    const cat = await createCategorie(user, 'Virement', 'transfert')
    const res = await post('/api/operations/transfert', user.token, {
      fromCompte: a.IDcompte, toCompte: b.IDcompte, montant: '100', DateOp: '2026-10-05', NomOp: 'Virement (A -> B)', IDcat: cat.IDcat
    })
    expect(res.status).toBe(200)
    expect(res.body.debit).toMatchObject({ MontantOp: -100, IDcompte: a.IDcompte, IDcat: cat.IDcat })
    expect(res.body.credit).toMatchObject({ MontantOp: 100, IDcompte: b.IDcompte, IDcat: cat.IDcat })
    const ops = await sql('SELECT IDop, IDcompte, MontantOp, IDcat, CheckOp FROM Operation WHERE IDcompte IN (?, ?) ORDER BY IDop', [a.IDcompte, b.IDcompte])
    expect(ops).toEqual([
      { IDop: res.body.debit.IDop, IDcompte: a.IDcompte, MontantOp: -100, IDcat: cat.IDcat, CheckOp: 0 },
      { IDop: res.body.credit.IDop, IDcompte: b.IDcompte, MontantOp: 100, IDcat: cat.IDcat, CheckOp: 0 }
    ])
  })

  it('refuse sans écriture : catégorie manquante, même compte, montant ≤ 0, compte ou catégorie d\'autrui', async () => {
    const user = await createUser()
    const a = await createCompte(user)
    const b = await createCompte(user)
    const cat = await createCategorie(user, 'Virement', 'transfert')
    const bobCompte = await createCompte(bob)
    const bobCat = await createCategorie(bob, 'Privée', 'transfert')
    const body = { fromCompte: a.IDcompte, toCompte: b.IDcompte, montant: 10, DateOp: '2026-10-05', NomOp: 'V', IDcat: cat.IDcat }

    expect((await post('/api/operations/transfert', user.token, { ...body, IDcat: undefined })).status).toBe(422)
    expect((await post('/api/operations/transfert', user.token, { ...body, toCompte: a.IDcompte })).status).toBe(400)
    expect((await post('/api/operations/transfert', user.token, { ...body, montant: 0 })).status).toBe(422)
    expect((await post('/api/operations/transfert', user.token, { ...body, toCompte: bobCompte.IDcompte })).status).toBe(404)
    expect((await post('/api/operations/transfert', user.token, { ...body, IDcat: bobCat.IDcat })).status).toBe(404)
    expect((await sql('SELECT COUNT(*) AS n FROM Operation WHERE IDcompte IN (?, ?, ?)', [a.IDcompte, b.IDcompte, bobCompte.IDcompte]))[0].n).toBe(0)
  })
})
