import { beforeAll, describe, expect, it } from 'vitest'
import { createCompte, createOperation, createUser, del, get, patch, post, put, sql, type TestUser } from './helpers'

let alice: TestUser
let bob: TestUser

beforeAll(async () => {
  alice = await createUser()
  bob = await createUser()
})

const credit = (IDcompte: number, extra: Record<string, unknown> = {}) => ({
  NomCredit: 'Maison', MontantInitial: 1000, MontantMensuel: 100, DateDebut: '2024-03-15', DateFin: '2025-03-15', IDcompte, ...extra
})

describe('crédits', () => {
  it('création : crée la récurrente mensuelle liée', async () => {
    const compte = await createCompte(alice)
    const res = await post('/api/credits', alice.token, credit(compte.IDcompte, { IDuser: bob.IDuser, IDopRecu: 12345 }))
    expect(res.status).toBe(200)
    expect(res.body.IDuser).toBe(alice.IDuser) // jamais l'IDuser du corps
    expect(res.body.Statut).toBe('actif')
    expect(res.body.IDopRecu).not.toBe(12345)

    const [rec] = await sql('SELECT * FROM OperationRecurrente WHERE IDopRecu = ?', [res.body.IDopRecu])
    expect(rec).toMatchObject({
      NomOpRecu: 'Mensualité Maison', MontantOpRecu: 100, JourOpRecu: 1, JourNumOpRecu: 15, MoisOpRecu: 2,
      Frequence: 3, IDcompte: compte.IDcompte, IDcredit: res.body.IDcredit
    })
  })

  it('compte d\'autrui → 404 et aucun crédit créé', async () => {
    const bobCompte = await createCompte(bob)
    const before = await sql('SELECT COUNT(*) AS n FROM Credit')
    const res = await post('/api/credits', alice.token, credit(bobCompte.IDcompte))
    expect(res.status).toBe(404)
    expect(res.body.error.message).toBe(`Compte ${bobCompte.IDcompte} not found`)
    expect((await sql('SELECT COUNT(*) AS n FROM Credit'))[0].n).toBe(before[0].n)
  })

  it('suppression en cascade : récurrente supprimée, IDcredit mis à NULL sur les opérations', async () => {
    const compte = await createCompte(alice)
    const created = (await post('/api/credits', alice.token, credit(compte.IDcompte))).body
    const op = await createOperation(alice, compte.IDcompte, { IDcredit: created.IDcredit })

    expect((await del(`/api/credits/${created.IDcredit}`, bob.token)).status).toBe(404)
    expect((await del(`/api/credits/${created.IDcredit}`, alice.token)).status).toBe(204)

    expect(await sql('SELECT * FROM OperationRecurrente WHERE IDopRecu = ?', [created.IDopRecu])).toHaveLength(0)
    expect((await sql('SELECT IDcredit FROM Operation WHERE IDop = ?', [op.IDop]))[0].IDcredit).toBeNull()
    expect((await get(`/api/credits/${created.IDcredit}`, alice.token)).status).toBe(404)
  })

  it('PUT conserve le lien IDopRecu géré par le serveur', async () => {
    const compte = await createCompte(alice)
    const created = (await post('/api/credits', alice.token, credit(compte.IDcompte))).body
    const res = await put(`/api/credits/${created.IDcredit}`, alice.token, credit(compte.IDcompte, { NomCredit: 'Renommé', IDuser: bob.IDuser }))
    expect(res.status).toBe(204)
    const after = (await get(`/api/credits/${created.IDcredit}`, alice.token)).body
    expect(after).toMatchObject({ NomCredit: 'Renommé', IDuser: alice.IDuser, IDopRecu: created.IDopRecu })
    expect((await patch(`/api/credits/${created.IDcredit}`, alice.token, { IDcompte: (await createCompte(bob)).IDcompte })).status).toBe(404)
  })

  it('solde restant sans intérêts', async () => {
    const compte = await createCompte(alice)
    const created = (await post('/api/credits', alice.token, credit(compte.IDcompte))).body
    for (let i = 1; i <= 3; i++) {
      await createOperation(alice, compte.IDcompte, { IDcredit: created.IDcredit, MontantOp: -100, DateOp: `2024-0${i}-15` })
    }
    const res = await get(`/api/credits/${created.IDcredit}/remaining-balance`, alice.token)
    expect(res.body).toEqual({ solde: 700, paye: 300, interets: 0 })
    expect((await get(`/api/credits/${created.IDcredit}/remaining-balance`, bob.token)).status).toBe(404)
  })

  it('solde restant avec intérêts : les intérêts sont prélevés avant le principal', async () => {
    const compte = await createCompte(alice)
    const created = (await post('/api/credits', alice.token, credit(compte.IDcompte, { TauxInteret: 12 }))).body
    await createOperation(alice, compte.IDcompte, { IDcredit: created.IDcredit, MontantOp: -100, DateOp: '2024-01-15' })
    const res = await get(`/api/credits/${created.IDcredit}/remaining-balance`, alice.token)
    // taux mensuel 1 % sur 1000 = 10 d'intérêts ; principal remboursé = 90
    expect(res.body).toEqual({ solde: 910, paye: 90, interets: 10 })
  })

  it('payments : tri DateOp décroissant, 404 pour autrui', async () => {
    const compte = await createCompte(alice)
    const created = (await post('/api/credits', alice.token, credit(compte.IDcompte))).body
    await createOperation(alice, compte.IDcompte, { IDcredit: created.IDcredit, NomOp: 'vieux', DateOp: '2024-01-15' })
    await createOperation(alice, compte.IDcompte, { IDcredit: created.IDcredit, NomOp: 'récent', DateOp: '2024-02-15' })
    const res = await get(`/api/credits/${created.IDcredit}/payments`, alice.token)
    expect(res.body.map((o: any) => o.NomOp)).toEqual(['récent', 'vieux'])
    expect((await get(`/api/credits/${created.IDcredit}/payments`, bob.token)).status).toBe(404)
  })
})

describe('références d\'autrui (IDcredit, IDcat)', () => {
  const recurrente = (IDcompte: number, extra: Record<string, unknown> = {}) => ({
    NomOpRecu: 'Mensualité', MontantOpRecu: -100, JourOpRecu: 1, DernierDateOpRecu: '2024-01-05', IDcompte, ...extra
  })

  it('opération rattachée au crédit d\'autrui : 404 sans écriture (création, PATCH, PATCH en masse)', async () => {
    const aliceCompte = await createCompte(alice)
    const aliceCredit = (await post('/api/credits', alice.token, credit(aliceCompte.IDcompte))).body
    const bobCompte = await createCompte(bob)

    const created = await post('/api/operations', bob.token, {
      NomOp: 'pirate', MontantOp: -1, DateOp: '2024-01-01', IDcompte: bobCompte.IDcompte, IDcredit: aliceCredit.IDcredit
    })
    expect(created.status).toBe(404)
    expect(created.body.error.message).toBe(`Credit ${aliceCredit.IDcredit} not found`)
    expect(await sql('SELECT IDop FROM Operation WHERE IDcredit = ?', [aliceCredit.IDcredit])).toEqual([])

    const op = await createOperation(bob, bobCompte.IDcompte)
    expect((await patch(`/api/operations/${op.IDop}`, bob.token, { IDcredit: aliceCredit.IDcredit })).status).toBe(404)
    expect((await patch('/api/operations', bob.token, { IDcredit: aliceCredit.IDcredit })).status).toBe(404)
    expect(await sql('SELECT IDop FROM Operation WHERE IDcredit = ?', [aliceCredit.IDcredit])).toEqual([])

    expect((await post('/api/operation-recurrentes', bob.token, recurrente(bobCompte.IDcompte, { IDcredit: aliceCredit.IDcredit }))).status).toBe(404)
  })

  it('catégorie privée d\'autrui : 404 ; catégorie partagée et sans catégorie acceptées', async () => {
    const aliceCat = (await post('/api/categories', alice.token, { Nom: 'Privée Alice' })).body
    const sharedCat = ((await sql("INSERT INTO Categorie (Nom, IDuser, Type) VALUES ('Partagée réf', 0, 'depense')")) as unknown as { insertId: number }).insertId
    const bobCompte = await createCompte(bob)

    expect((await post('/api/operations', bob.token, {
      NomOp: 'x', MontantOp: -1, DateOp: '2024-01-01', IDcompte: bobCompte.IDcompte, IDcat: aliceCat.IDcat
    })).status).toBe(404)
    expect((await post('/api/credits', bob.token, credit(bobCompte.IDcompte, { IDcat: aliceCat.IDcat }))).status).toBe(404)

    const recu = (await post('/api/operation-recurrentes', bob.token, recurrente(bobCompte.IDcompte))).body
    expect((await patch(`/api/operation-recurrentes/${recu.IDopRecu}`, bob.token, { IDcat: aliceCat.IDcat })).status).toBe(404)
    expect((await get(`/api/operation-recurrentes/${recu.IDopRecu}`, bob.token)).body.IDcat).toBe(0)

    const shared = await createOperation(bob, bobCompte.IDcompte, { IDcat: sharedCat })
    expect(shared.IDcat).toBe(sharedCat)
    expect((await createOperation(bob, bobCompte.IDcompte, { IDcat: 0 })).IDcat).toBe(0)
  })

  it('payments / remaining-balance ignorent une opération étrangère rattachée au crédit', async () => {
    const compte = await createCompte(alice)
    const created = (await post('/api/credits', alice.token, credit(compte.IDcompte))).body
    await createOperation(alice, compte.IDcompte, { IDcredit: created.IDcredit, NomOp: 'mienne', MontantOp: -100 })
    // Donnée antérieure au contrôle de propriété : opération de Bob portant le crédit d'Alice
    const bobCompte = await createCompte(bob)
    await sql('INSERT INTO Operation (NomOp, MontantOp, DateOp, IDcompte, IDcat, IDcredit) VALUES (?, ?, ?, ?, 0, ?)',
      ['étrangère', -500, new Date('2024-02-01T00:00:00Z'), bobCompte.IDcompte, created.IDcredit])

    const payments = await get(`/api/credits/${created.IDcredit}/payments`, alice.token)
    expect(payments.body.map((o: any) => o.NomOp)).toEqual(['mienne'])
    const balance = await get(`/api/credits/${created.IDcredit}/remaining-balance`, alice.token)
    expect(balance.body).toMatchObject({ solde: 900, paye: 100 })
  })
})

describe('biens', () => {
  const bien = (extra: Record<string, unknown> = {}) => ({
    NomBien: 'Appart', Ville: 'Lyon', TypeBien: 'appartement', DateAchat: '2020-06-01', PrixBienNu: 200000, FraisNotaire: 15000, ...extra
  })

  it('création sans crédit : défauts, IDuser forcé', async () => {
    const res = await post('/api/biens', alice.token, bien({ IDuser: bob.IDuser }))
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ Usage: 'principale', FraisAgence: 0, ApportCash: 0, IDuser: alice.IDuser })
    expect(res.body.IDcredit ?? null).toBeNull()
  })

  it('crédit lié d\'autrui → 404 (création, PATCH, PUT)', async () => {
    const bobCompte = await createCompte(bob)
    const bobCredit = (await post('/api/credits', bob.token, credit(bobCompte.IDcompte))).body
    const own = (await post('/api/biens', alice.token, bien())).body

    const create = await post('/api/biens', alice.token, bien({ IDcredit: bobCredit.IDcredit }))
    expect(create.status).toBe(404)
    expect(create.body.error.message).toBe(`Credit ${bobCredit.IDcredit} not found`)
    expect((await patch(`/api/biens/${own.IDbien}`, alice.token, { IDcredit: bobCredit.IDcredit })).status).toBe(404)
    expect((await put(`/api/biens/${own.IDbien}`, alice.token, bien({ IDcredit: bobCredit.IDcredit }))).status).toBe(404)
  })

  it('bien lié à son propre crédit ; isolation entre utilisateurs', async () => {
    const compte = await createCompte(alice)
    const mine = (await post('/api/credits', alice.token, credit(compte.IDcompte))).body
    const created = await post('/api/biens', alice.token, bien({ IDcredit: mine.IDcredit }))
    expect(created.status).toBe(200)
    expect(created.body.IDcredit).toBe(mine.IDcredit)
    expect((await get(`/api/biens/${created.body.IDbien}`, bob.token)).status).toBe(404)
    expect((await get('/api/biens', bob.token)).body.find((b: any) => b.IDbien === created.body.IDbien)).toBeUndefined()
    expect((await del(`/api/biens/${created.body.IDbien}`, alice.token)).status).toBe(204)
  })
})
