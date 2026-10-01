import { beforeAll, describe, expect, it } from 'vitest'
import {
  createBanque, createCategorie, createCompte, createOperation, createUser, del, get, patch, post, put, type TestUser
} from './helpers'

let alice: TestUser
let bob: TestUser

beforeAll(async () => {
  alice = await createUser()
  bob = await createUser()
})

describe('comptes', () => {
  it('création : IDuser imposé par le JWT, défauts appliqués, include banque', async () => {
    const banque = await createBanque(alice.token, 'BNP')
    const res = await post('/api/comptes', alice.token, { NomCompte: 'Courant', solde: 12.3, IDbanque: banque.IDbanque, IDuser: bob.IDuser })
    expect(res.status).toBe(200)
    expect(res.body.IDuser).toBe(alice.IDuser)
    expect(res.body).toMatchObject({ bloque: false, retraite: false, visible: true })
    expect(res.body.solde).toBe(12.3) // FLOAT : pas de dérive float32

    const list = await get('/api/comptes', alice.token, {
      filter: { include: [{ relation: 'banque' }], where: { IDuser: alice.IDuser }, order: 'NomCompte ASC' }
    })
    expect(list.status).toBe(200)
    expect(list.body[0].banque).toMatchObject({ NomBanque: 'BNP' })
  })

  it('une ressource d\'autrui est invisible (404) et non modifiable', async () => {
    const compte = await createCompte(alice, { NomCompte: 'Privé' })
    expect((await get(`/api/comptes/${compte.IDcompte}`, bob.token)).status).toBe(404)
    expect((await patch(`/api/comptes/${compte.IDcompte}`, bob.token, { NomCompte: 'Piraté' })).status).toBe(404)
    expect((await put(`/api/comptes/${compte.IDcompte}`, bob.token, { NomCompte: 'Piraté', solde: 0 })).status).toBe(404)
    expect((await del(`/api/comptes/${compte.IDcompte}`, bob.token)).status).toBe(404)
    expect((await get(`/api/comptes/${compte.IDcompte}/banque`, bob.token)).status).toBe(404)
    const bobList = await get('/api/comptes', bob.token, { filter: { where: { IDuser: alice.IDuser } } })
    expect(bobList.body).toEqual([])
    const count = await get('/api/comptes/count', bob.token)
    expect(count.body).toEqual({ count: 0 })
  })

  it('PATCH / PUT / DELETE sur ses propres comptes', async () => {
    const compte = await createCompte(alice, { NomCompte: 'A modifier' })
    expect((await patch(`/api/comptes/${compte.IDcompte}`, alice.token, { NomCompte: 'Modifié' })).status).toBe(204)
    expect((await get(`/api/comptes/${compte.IDcompte}`, alice.token)).body.NomCompte).toBe('Modifié')
    expect((await put(`/api/comptes/${compte.IDcompte}`, alice.token, { NomCompte: 'Remplacé', solde: 5, visible: false })).status).toBe(204)
    const replaced = (await get(`/api/comptes/${compte.IDcompte}`, alice.token)).body
    expect(replaced).toMatchObject({ NomCompte: 'Remplacé', solde: 5, visible: false, IDuser: alice.IDuser })
    expect((await del(`/api/comptes/${compte.IDcompte}`, alice.token)).status).toBe(204)
    expect((await get(`/api/comptes/${compte.IDcompte}`, alice.token)).status).toBe(404)
  })

  it('suppression refusée (409) si le compte est référencé', async () => {
    const compte = await createCompte(alice, { NomCompte: 'Référencé' })
    await createOperation(alice, compte.IDcompte)
    const res = await del(`/api/comptes/${compte.IDcompte}`, alice.token)
    expect(res.status).toBe(409)
    expect(res.body.error.message).toContain('cannot be deleted')
  })

  it('management-info', async () => {
    const empty = await createCompte(alice, { NomCompte: 'Vide' })
    const used = await createCompte(alice, { NomCompte: 'Utilisé' })
    await createOperation(alice, used.IDcompte, { DateOp: '2024-05-02T00:00:00.000Z' })
    const info = (await get('/api/comptes/management-info', alice.token)).body
    expect(info.find((i: any) => i.IDcompte === empty.IDcompte)).toEqual({ IDcompte: empty.IDcompte, lastOpDate: null, hasReferences: false })
    expect(info.find((i: any) => i.IDcompte === used.IDcompte)).toEqual({ IDcompte: used.IDcompte, lastOpDate: '2024-05-02T00:00:00.000Z', hasReferences: true })
    expect(info.every((i: any) => typeof i.IDcompte === 'number')).toBe(true)
  })

  it('/comptes/{id}/banque', async () => {
    const banque = await createBanque(alice.token, 'LCL')
    const compte = await createCompte(alice, { IDbanque: banque.IDbanque })
    const res = await get(`/api/comptes/${compte.IDcompte}/banque`, alice.token)
    expect(res.body).toMatchObject({ NomBanque: 'LCL' })
  })

  it('filtre : colonne inconnue → 400, opérateur inconnu → 400', async () => {
    expect((await get('/api/comptes', alice.token, { filter: { where: { password: 'x' } } })).status).toBe(400)
    expect((await get('/api/comptes', alice.token, { filter: { where: { NomCompte: { regexp: '.*' } } } })).status).toBe(400)
    expect((await get('/api/comptes', alice.token, { filter: { order: 'NomCompte; DROP TABLE Compte' } })).status).toBe(400)
  })

  it('PATCH en masse limité aux comptes de l\'utilisateur', async () => {
    const mine = await createCompte(alice, { NomCompte: 'Bulk' })
    const theirs = await createCompte(bob, { NomCompte: 'Bulk' })
    const res = await patch('/api/comptes', alice.token, { visible: false }, { where: { NomCompte: 'Bulk' } })
    expect(res.status).toBe(200)
    expect(res.body.count).toBe(1)
    expect((await get(`/api/comptes/${mine.IDcompte}`, alice.token)).body.visible).toBe(false)
    expect((await get(`/api/comptes/${theirs.IDcompte}`, bob.token)).body.visible).toBe(true)
  })
})

describe('catégories', () => {
  it('lecture : les siennes + partagées (IDuser 0) ; jamais celles d\'autrui', async () => {
    const { sql } = await import('./helpers')
    await sql("INSERT INTO Categorie (Nom, IDuser, Type) VALUES ('Partagée', 0, 'revenu')")
    const mine = await createCategorie(alice, 'Alice cat')
    await createCategorie(bob, 'Bob cat')
    const filter = { where: { or: [{ IDuser: alice.IDuser }, { IDuser: 0 }] }, order: 'Nom ASC' }
    const res = await get('/api/categories', alice.token, { filter })
    const names = res.body.map((c: any) => c.Nom)
    expect(names).toContain('Alice cat')
    expect(names).toContain('Partagée')
    expect(names).not.toContain('Bob cat')
    expect(mine.Type).toBe('depense')
  })

  it('les catégories partagées ne sont pas modifiables', async () => {
    const { sql } = await import('./helpers')
    const result: any = await sql("INSERT INTO Categorie (Nom, IDuser, Type) VALUES ('Salaire partagé', 0, 'revenu')")
    const id = result.insertId
    expect((await get(`/api/categories/${id}`, alice.token)).status).toBe(200)
    expect((await patch(`/api/categories/${id}`, alice.token, { Nom: 'Piraté' })).status).toBe(404)
    expect((await del(`/api/categories/${id}`, alice.token)).status).toBe(404)
  })

  it('création : Type invalide rejeté', async () => {
    const res = await post('/api/categories', alice.token, { Nom: 'X', Type: 'nimporte' })
    expect(res.status).toBe(422)
  })
})

describe('banques', () => {
  it('CRUD non scopé (comportement historique) et liste triée', async () => {
    const b = await createBanque(alice.token, 'ZZ Banque')
    await createBanque(alice.token, 'AA Banque')
    const list = await get('/api/banques', bob.token, { filter: { order: 'NomBanque ASC' } })
    const names = list.body.map((x: any) => x.NomBanque)
    expect(names).toEqual([...names].sort())
    expect((await patch(`/api/banques/${b.IDbanque}`, bob.token, { NomBanque: 'Renommée' })).status).toBe(204)
    expect((await del(`/api/banques/${b.IDbanque}`, bob.token)).status).toBe(204)
    expect((await get(`/api/banques/${b.IDbanque}`, bob.token)).status).toBe(404)
  })
})
