import { beforeAll, describe, expect, it } from 'vitest'
import { message } from '../support/anthropic-mock'
import { createCategorie, createCompte, createOperation, createUser, ctx, del, get, post, sql, type TestUser } from './helpers'

let alice: TestUser
let bob: TestUser
let compte: { IDcompte: number }
let courses: { IDcat: number }

const iso = (date: Date | string) => new Date(date).toISOString().slice(0, 10)

// Prochaine réponse du faux serveur Messages API
const nextClaude = async (lignes: unknown[] | null, overrides: { status?: number; body?: unknown } = {}) => {
  const body = overrides.body ?? message({ lignes })
  await fetch(new URL('/__next', ctx().anthropicMock), { method: 'POST', body: JSON.stringify({ status: overrides.status ?? 200, body }) })
}
const lastClaudeRequest = async () => (await fetch(new URL('/__last', ctx().anthropicMock))).json() as Promise<any>

const ligne = (overrides: Record<string, unknown> = {}) => ({
  date: '2026-10-12', libelleSource: 'CB CARREFOUR 12/10', libelle: 'Courses Carrefour', montant: -45.3,
  idCategorie: courses.IDcat, confiance: 'haute', dateIncertaine: false, ...overrides
})

const extraire = (user: TestUser, body: Record<string, unknown>) => post('/api/imports', user.token, body)

beforeAll(async () => {
  alice = await createUser()
  bob = await createUser()
  compte = await createCompte(alice)
  courses = await createCategorie(alice, 'Courses')
})

describe('import d\'opérations : extraction', () => {
  it('disponibilité : vraie avec une clé Anthropic', async () => {
    expect((await get('/api/imports/disponibilite', alice.token)).body).toEqual({ disponible: true })
  })

  it('crée un lot en brouillon sans aucune opération', async () => {
    await nextClaude([ligne(), ligne({ libelleSource: 'VIR SALAIRE', libelle: 'Salaire', montant: 2500, idCategorie: 0, date: '2026-10-01' })])
    const res = await extraire(alice, { IDcompte: compte.IDcompte, texte: 'CB CARREFOUR 12/10 -45,30\nVIR SALAIRE +2500' })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ IDcompte: compte.IDcompte, Statut: 'brouillon', Source: 'texte' })
    expect(res.body.lignes).toHaveLength(2)
    expect(res.body.lignes[0]).toMatchObject({
      LibelleSource: 'CB CARREFOUR 12/10', NomOp: 'Courses Carrefour', MontantOp: -45.3, IDcat: courses.IDcat,
      Confiance: 'haute', Selection: true, DoublonLot: false, doublon: null
    })
    expect(iso(res.body.lignes[0].DateOp)).toBe('2026-10-12')
    expect(await sql('SELECT IDop FROM Operation WHERE IDcompte = ?', [compte.IDcompte])).toEqual([])
    const [lot] = await sql('SELECT TokensEntree, TokensSortie, Modele FROM ImportLot WHERE IDimport = ?', [res.body.IDimport])
    expect(lot).toEqual({ TokensEntree: 1000, TokensSortie: 200, Modele: 'claude-opus-5-5' })
  })

  it('le LLM reçoit catégories, libellés usuels et texte, avec des images en base64', async () => {
    const autre = await createCompte(alice, { NomCompte: 'Libellés' })
    await createOperation(alice, autre.IDcompte, { NomOp: 'Courses Carrefour', IDcat: courses.IDcat, DateOp: new Date().toISOString() })
    await nextClaude([ligne()])
    await extraire(alice, { IDcompte: compte.IDcompte, texte: 'ticket', images: [{ mediaType: 'image/jpeg', data: 'AAAA' }] })
    const request = await lastClaudeRequest()
    expect(request.model).toBe('claude-opus-5-5')
    expect(request.output_config.format.type).toBe('json_schema')
    expect(request.messages[0].content[0]).toMatchObject({ type: 'image', source: { media_type: 'image/jpeg', data: 'AAAA' } })
    const text = request.messages[0].content[1].text
    expect(text).toContain(`${courses.IDcat} | Courses | depense`)
    expect(text).toContain(`Courses Carrefour | ${courses.IDcat} | 1`)
    expect(text).toContain('<texte_source>\nticket\n</texte_source>')
  })

  it('compte d\'un autre utilisateur : 404 sans appel au LLM', async () => {
    const bobCompte = await createCompte(bob)
    const res = await extraire(alice, { IDcompte: bobCompte.IDcompte, texte: 'x' })
    expect(res.status).toBe(404)
  })

  it('requête vide, trop d\'images ou type d\'image refusé : 422', async () => {
    expect((await extraire(alice, { IDcompte: compte.IDcompte, texte: '  ' })).status).toBe(422)
    const images = Array.from({ length: 21 }, () => ({ mediaType: 'image/jpeg', data: 'AAAA' }))
    expect((await extraire(alice, { IDcompte: compte.IDcompte, images })).status).toBe(422)
    expect((await extraire(alice, { IDcompte: compte.IDcompte, images: [{ mediaType: 'image/gif', data: 'AAAA' }] })).status).toBe(422)
    expect((await extraire(alice, { IDcompte: compte.IDcompte, texte: 'x'.repeat(20_001) })).status).toBe(422)
  })

  it('rien d\'exploitable : 422 et aucun lot', async () => {
    const avant = await sql('SELECT COUNT(*) AS n FROM ImportLot WHERE IDuser = ?', [alice.IDuser])
    await nextClaude([])
    const res = await extraire(alice, { IDcompte: compte.IDcompte, texte: 'bonjour' })
    expect(res.status).toBe(422)
    expect(await sql('SELECT COUNT(*) AS n FROM ImportLot WHERE IDuser = ?', [alice.IDuser])).toEqual(avant)
  })

  it('API Anthropic indisponible (529) ou refus : 502 et aucun lot', async () => {
    const avant = await sql('SELECT COUNT(*) AS n FROM ImportLot WHERE IDuser = ?', [alice.IDuser])
    await nextClaude(null, { status: 529, body: { type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } } })
    // Le SDK réessaie une fois
    await nextClaude(null, { status: 529, body: { type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } } })
    const res = await extraire(alice, { IDcompte: compte.IDcompte, texte: 'x' })
    expect(res.status).toBe(502)
    expect(JSON.stringify(res.body)).not.toContain('sk-ant-test')

    await nextClaude(null, { body: message({ lignes: [] }, { stop_reason: 'refusal', content: [] }) })
    expect((await extraire(alice, { IDcompte: compte.IDcompte, texte: 'x' })).status).toBe(502)
    expect(await sql('SELECT COUNT(*) AS n FROM ImportLot WHERE IDuser = ?', [alice.IDuser])).toEqual(avant)
  })

  it('catégorie hors liste remplacée par 0 en confiance faible', async () => {
    const bobCat = await createCategorie(bob, 'Secrète')
    await nextClaude([ligne({ idCategorie: bobCat.IDcat })])
    const res = await extraire(alice, { IDcompte: compte.IDcompte, texte: 'x' })
    expect(res.body.lignes[0]).toMatchObject({ IDcat: 0, Confiance: 'faible' })
  })

  it('doublons : opération existante à ±3 jours et doublon interne au lot, décochés', async () => {
    const c = await createCompte(alice, { NomCompte: 'Doublons' })
    const existante = await createOperation(alice, c.IDcompte, { NomOp: 'Boulangerie', MontantOp: -4.2, DateOp: '2026-10-10' })
    await nextClaude([
      ligne({ libelleSource: 'BOULANGERIE DUPONT', libelle: 'Boulangerie', montant: -4.2, date: '2026-10-11' }),
      ligne({ libelleSource: 'CAFE', libelle: 'Café', montant: -2, date: '2026-10-12' }),
      ligne({ libelleSource: 'CAFE', libelle: 'Café', montant: -2, date: '2026-10-12' }),
      ligne({ libelleSource: 'PHARMACIE', libelle: 'Pharmacie', montant: -4.21, date: '2026-10-11' })
    ])
    const { body } = await extraire(alice, { IDcompte: c.IDcompte, texte: 'x' })
    expect(body.lignes.map((l: any) => [l.IDopDoublon, l.DoublonLot, l.Selection])).toEqual([
      [existante.IDop, false, false], [null, false, true], [null, true, false], [null, false, true]
    ])
    expect(body.lignes[0].doublon).toMatchObject({ IDop: existante.IDop, NomOp: 'Boulangerie', MontantOp: -4.2 })
  })
})

describe('import d\'opérations : lecture, validation, abandon', () => {
  const nouveauLot = async (user: TestUser, IDcompte: number, lignes: unknown[]) => {
    await nextClaude(lignes)
    const res = await extraire(user, { IDcompte, texte: 'x' })
    if (res.status !== 201) throw new Error(`nouveauLot: ${res.status} ${JSON.stringify(res.body)}`)
    return res.body
  }

  it('liste des brouillons et lecture ; lot d\'un autre utilisateur : 404', async () => {
    const c = await createCompte(alice, { NomCompte: 'Lecture' })
    const lot = await nouveauLot(alice, c.IDcompte, [ligne()])
    const list = await get('/api/imports', alice.token)
    expect(list.body.find((l: any) => l.IDimport === lot.IDimport)).toMatchObject({ IDcompte: c.IDcompte, NomCompte: 'Lecture', nbLignes: 1 })
    expect((await get(`/api/imports/${lot.IDimport}`, alice.token)).body.lignes).toHaveLength(1)
    expect((await get(`/api/imports/${lot.IDimport}`, bob.token)).status).toBe(404)
    expect((await post(`/api/imports/${lot.IDimport}/valider`, bob.token, { lignes: [{ DateOp: '2026-10-01', NomOp: 'x', MontantOp: 1, IDcat: 0 }] })).status).toBe(404)
  })

  it('validation partielle : seules les lignes envoyées deviennent des opérations, pointées ; double validation 409', async () => {
    const c = await createCompte(alice, { NomCompte: 'Validation' })
    const lot = await nouveauLot(alice, c.IDcompte, [ligne(), ligne({ libelle: 'Essence', montant: -60, date: '2026-10-13' }), ligne({ montant: -1, date: '2026-10-14' })])
    const [a, b] = lot.lignes
    const res = await post(`/api/imports/${lot.IDimport}/valider`, alice.token, {
      lignes: [
        { IDligne: a.IDligne, DateOp: a.DateOp, NomOp: 'Courses', MontantOp: a.MontantOp, IDcat: courses.IDcat },
        { IDligne: b.IDligne, DateOp: b.DateOp, NomOp: b.NomOp, MontantOp: b.MontantOp, IDcat: 0 },
        { DateOp: '2026-10-15', NomOp: 'Ajout manuel', MontantOp: -3.5, IDcat: 0 }
      ]
    })
    expect(res.status).toBe(201)
    expect(res.body.count).toBe(3)
    const ops = await sql('SELECT IDop, NomOp, MontantOp, IDcat, CheckOp FROM Operation WHERE IDcompte = ? ORDER BY IDop', [c.IDcompte])
    expect(ops.map(o => [o.NomOp, o.MontantOp, o.IDcat, o.CheckOp])).toEqual([
      ['Courses', -45.3, courses.IDcat, 1], ['Essence', -60, 0, 1], ['Ajout manuel', -3.5, 0, 1]
    ])
    expect(res.body.IDops).toEqual(ops.map(o => o.IDop))
    const lignes = await sql('SELECT NomOp, Selection FROM ImportLigne WHERE IDimport = ? ORDER BY Ordre', [lot.IDimport])
    expect(lignes).toEqual([{ NomOp: 'Courses', Selection: 1 }, { NomOp: 'Essence', Selection: 1 }, { NomOp: 'Courses Carrefour', Selection: 0 }])
    expect((await get(`/api/imports/${lot.IDimport}`, alice.token)).body.Statut).toBe('valide')

    const again = await post(`/api/imports/${lot.IDimport}/valider`, alice.token, { lignes: [{ DateOp: '2026-10-15', NomOp: 'x', MontantOp: 1, IDcat: 0 }] })
    expect(again.status).toBe(409)
    expect(await sql('SELECT IDop FROM Operation WHERE IDcompte = ?', [c.IDcompte])).toHaveLength(3)
  })

  it('validations concurrentes : les opérations ne sont créées qu\'une fois', async () => {
    const c = await createCompte(alice, { NomCompte: 'Concurrence' })
    const lot = await nouveauLot(alice, c.IDcompte, [ligne()])
    const body = { lignes: [{ IDligne: lot.lignes[0].IDligne, DateOp: '2026-10-12', NomOp: 'Courses', MontantOp: -45.3, IDcat: 0 }] }
    const statuses = (await Promise.all([1, 2, 3].map(() => post(`/api/imports/${lot.IDimport}/valider`, alice.token, body)))).map(r => r.status).sort()
    expect(statuses).toEqual([201, 409, 409])
    expect(await sql('SELECT IDop FROM Operation WHERE IDcompte = ?', [c.IDcompte])).toHaveLength(1)
  })

  it('catégorie interdite ou ligne d\'un autre lot : 400 et aucune opération', async () => {
    const c = await createCompte(alice, { NomCompte: 'Interdit' })
    const lot = await nouveauLot(alice, c.IDcompte, [ligne()])
    const autre = await nouveauLot(alice, c.IDcompte, [ligne()])
    const bobCat = await createCategorie(bob, 'Bob')
    const base = { DateOp: '2026-10-12', NomOp: 'x', MontantOp: -1 }
    expect((await post(`/api/imports/${lot.IDimport}/valider`, alice.token, { lignes: [{ ...base, IDcat: bobCat.IDcat }] })).status).toBe(400)
    expect((await post(`/api/imports/${lot.IDimport}/valider`, alice.token, { lignes: [{ ...base, IDcat: 0, IDligne: autre.lignes[0].IDligne }] })).status).toBe(400)
    expect(await sql('SELECT IDop FROM Operation WHERE IDcompte = ?', [c.IDcompte])).toEqual([])
  })

  it('abandon : lot et lignes supprimés ; un lot validé ne peut pas être supprimé', async () => {
    const c = await createCompte(alice, { NomCompte: 'Abandon' })
    const lot = await nouveauLot(alice, c.IDcompte, [ligne()])
    expect((await del(`/api/imports/${lot.IDimport}`, bob.token)).status).toBe(404)
    expect((await del(`/api/imports/${lot.IDimport}`, alice.token)).status).toBe(204)
    expect(await sql('SELECT IDligne FROM ImportLigne WHERE IDimport = ?', [lot.IDimport])).toEqual([])
    expect((await get(`/api/imports/${lot.IDimport}`, alice.token)).status).toBe(404)

    const valide = await nouveauLot(alice, c.IDcompte, [ligne()])
    await post(`/api/imports/${valide.IDimport}/valider`, alice.token, { lignes: [{ DateOp: '2026-10-12', NomOp: 'x', MontantOp: -1, IDcat: 0 }] })
    expect((await del(`/api/imports/${valide.IDimport}`, alice.token)).status).toBe(409)
  })

  it('purge des brouillons de plus de 30 jours à la création, lots validés conservés', async () => {
    const user = await createUser()
    const c = await createCompte(user)
    const vieux = await nouveauLot(user, c.IDcompte, [ligne({ idCategorie: 0 })])
    const vieuxValide = await nouveauLot(user, c.IDcompte, [ligne({ idCategorie: 0 })])
    await post(`/api/imports/${vieuxValide.IDimport}/valider`, user.token, { lignes: [{ DateOp: '2026-10-12', NomOp: 'x', MontantOp: -1, IDcat: 0 }] })
    await sql('UPDATE ImportLot SET DateCreation = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 31 DAY) WHERE IDimport IN (?, ?)', [vieux.IDimport, vieuxValide.IDimport])
    await nouveauLot(user, c.IDcompte, [ligne({ idCategorie: 0 })])
    const restants = (await sql('SELECT IDimport FROM ImportLot WHERE IDuser = ?', [user.IDuser])).map(r => r.IDimport)
    expect(restants).not.toContain(vieux.IDimport)
    expect(restants).toContain(vieuxValide.IDimport)
  })

  it('correspondance apprise : un libellé renommé en revue est repris au lot suivant', async () => {
    const user = await createUser()
    const c = await createCompte(user)
    const tel = await createCategorie(user, 'Téléphone')
    const premier = await nouveauLot(user, c.IDcompte, [ligne({ libelleSource: 'PRLV SEPA FREE MOBILE REF 8812', libelle: 'Free', montant: -19.99, idCategorie: 0, confiance: 'moyenne' })])
    await post(`/api/imports/${premier.IDimport}/valider`, user.token, {
      lignes: [{ IDligne: premier.lignes[0].IDligne, DateOp: '2026-09-05', NomOp: 'Forfait téléphone', MontantOp: -19.99, IDcat: tel.IDcat }]
    })

    const second = await nouveauLot(user, c.IDcompte, [ligne({ libelleSource: 'PRLV SEPA FREE MOBILE REF 9034', libelle: 'Free', montant: -19.99, idCategorie: 0, confiance: 'moyenne', date: '2026-10-05' })])
    expect(second.lignes[0]).toMatchObject({ NomOp: 'Forfait téléphone', IDcat: tel.IDcat, Confiance: 'haute', LibelleSource: 'PRLV SEPA FREE MOBILE REF 9034' })
    expect((await lastClaudeRequest()).messages[0].content[0].text).toContain('PRLV SEPA FREE MOBILE REF 8812 → Forfait téléphone')
  })

  it('quota : 30 extractions par heure et par utilisateur, 429 au-delà', async () => {
    const user = await createUser()
    const c = await createCompte(user)
    for (let i = 0; i < 30; i++) {
      await nextClaude([ligne({ idCategorie: 0 })])
      expect((await extraire(user, { IDcompte: c.IDcompte, texte: 'x' })).status).toBe(201)
    }
    expect((await extraire(user, { IDcompte: c.IDcompte, texte: 'x' })).status).toBe(429)
    // Le quota est individuel
    await nextClaude([ligne()])
    expect((await extraire(alice, { IDcompte: compte.IDcompte, texte: 'x' })).status).toBe(201)
  })
})
