import jwt from 'jsonwebtoken'
import { describe, expect, inject, it } from 'vitest'

// Même scénario rejoué contre LoopBack et Nitro (bases identiques) ; les réponses sont comparées.
//  - statut : toujours identique
//  - corps 2xx : identique (champs volatils normalisés)
//  - corps d'erreur : seul error.statusCode est comparé (les messages sont rapportés à titre indicatif)
const p = inject('parity')

interface Logged { label: string; status: number; body: any; setCookie?: string | null }

class Client {
  log: Logged[] = []
  constructor(private base: string) {}
  token = (user: { id: string; IDuser: number; email: string }) =>
    jwt.sign({ id: user.id, name: 'parity', email: user.email, IDuser: user.IDuser }, p.jwtSecret, { expiresIn: 3600 })

  async call(label: string, method: string, path: string, opts: { token?: string; body?: unknown; query?: Record<string, unknown> } = {}) {
    const url = new URL(path, this.base)
    for (const [k, v] of Object.entries(opts.query ?? {})) url.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v))
    const headers: Record<string, string> = {}
    if (opts.token) headers.Authorization = `Bearer ${opts.token}`
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
    const res = await fetch(url, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) })
    const text = await res.text()
    let body: any = text || undefined
    try { body = text ? JSON.parse(text) : undefined } catch { /* non JSON */ }
    this.log.push({ label, status: res.status, body, setCookie: res.headers.get('set-cookie') })
    return { status: res.status, body }
  }
}

// Minuit UTC : stable entre les deux exécutions du scénario
const day = (n: number) => `${new Date(Date.now() - n * 86_400_000).toISOString().split('T')[0]}T00:00:00.000Z`

// Scénario complet, joué à l'identique contre chaque API
const scenario = async (c: Client) => {
  const A = { ...p.users.alice }
  const B = { ...p.users.bob }
  const ta = c.token(A)
  const tb = c.token(B)

  // --- auth
  await c.call('ping', 'GET', '/api/ping')
  await c.call('login ok', 'POST', '/api/users/login', { body: { email: A.email, code: A.code } })
  await c.call('login ko', 'POST', '/api/users/login', { body: { email: A.email, code: 'zzzzzz' } })
  await c.call('login email inconnu', 'POST', '/api/users/login', { body: { email: 'inconnu@parity.test', code: 'abcdef' } })
  await c.call('whoAmI', 'GET', '/api/users/whoAmI', { token: ta })
  await c.call('exists', 'GET', '/api/users/exists', { token: ta })
  await c.call('sans token', 'GET', '/api/comptes')
  await c.call('token invalide', 'GET', '/api/comptes', { token: 'abc.def.ghi' })
  await c.call('update me', 'PATCH', '/api/users/me', { token: ta, body: { username: 'alice2', favoris: 2, warningTotal: 10 } })
  await c.call('whoAmI après update', 'GET', '/api/users/whoAmI', { token: ta })
  await c.call('update me email pris', 'PATCH', '/api/users/me', { token: ta, body: { email: B.email } })
  await c.call('logout', 'POST', '/api/users/logout', { token: ta })

  // --- référentiel
  const banque = (await c.call('banque create', 'POST', '/api/banques', { token: ta, body: { NomBanque: 'BNP' } })).body
  await c.call('banque create 2', 'POST', '/api/banques', { token: ta, body: { NomBanque: 'AXA' } })
  await c.call('banques list', 'GET', '/api/banques', { token: ta, query: { filter: { order: 'NomBanque ASC' } } })
  await c.call('banques count', 'GET', '/api/banques/count', { token: ta })
  await c.call('banque get', 'GET', `/api/banques/${banque.IDbanque}`, { token: tb })
  await c.call('banque patch', 'PATCH', `/api/banques/${banque.IDbanque}`, { token: ta, body: { NomBanque: 'BNP Paribas' } })
  await c.call('banque put', 'PUT', `/api/banques/${banque.IDbanque}`, { token: ta, body: { NomBanque: 'BNP P.' } })
  await c.call('banque inconnue', 'GET', '/api/banques/99999', { token: ta })

  const c1 = (await c.call('compte create', 'POST', '/api/comptes', { token: ta, body: { NomCompte: 'Courant', solde: 12.3, IDbanque: banque.IDbanque, visible: true } })).body
  const c2 = (await c.call('compte create 2', 'POST', '/api/comptes', { token: ta, body: { NomCompte: 'Retraite', solde: 500, retraite: true } })).body
  const cb = (await c.call('compte bob', 'POST', '/api/comptes', { token: tb, body: { NomCompte: 'Bob', solde: 1 } })).body
  await c.call('comptes list include', 'GET', '/api/comptes', { token: ta, query: { filter: { include: [{ relation: 'banque' }], where: { IDuser: A.IDuser }, order: 'NomCompte ASC' } } })
  await c.call('comptes count', 'GET', '/api/comptes/count', { token: ta })
  await c.call('compte get', 'GET', `/api/comptes/${c1.IDcompte}`, { token: ta })
  await c.call('compte get autrui', 'GET', `/api/comptes/${cb.IDcompte}`, { token: ta })
  await c.call('compte patch', 'PATCH', `/api/comptes/${c1.IDcompte}`, { token: ta, body: { NomCompte: 'Courant 2' } })
  await c.call('compte patch autrui', 'PATCH', `/api/comptes/${cb.IDcompte}`, { token: ta, body: { NomCompte: 'X' } })
  await c.call('compte put', 'PUT', `/api/comptes/${c1.IDcompte}`, { token: ta, body: { NomCompte: 'Courant 3', solde: 20, IDuser: A.IDuser, IDbanque: banque.IDbanque, bloque: false, visible: true, retraite: false, joint: false, children: false, porte_feuille: false } })
  await c.call('compte banque', 'GET', `/api/comptes/${c1.IDcompte}/banque`, { token: ta })
  await c.call('compte patch masse', 'PATCH', '/api/comptes', { token: ta, body: { porte_feuille: true }, query: { where: { NomCompte: 'Retraite' } } })

  const catDep = (await c.call('cat create dep', 'POST', '/api/categories', { token: ta, body: { Nom: 'Courses', Type: 'depense' } })).body
  const catRev = (await c.call('cat create rev', 'POST', '/api/categories', { token: ta, body: { Nom: 'Paie', Type: 'revenu' } })).body
  const catTra = (await c.call('cat create tra', 'POST', '/api/categories', { token: ta, body: { Nom: 'Virement', Type: 'transfert' } })).body
  await c.call('cat create défaut', 'POST', '/api/categories', { token: ta, body: { Nom: 'Sans type', Type: 'depense' } })
  await c.call('cat bob', 'POST', '/api/categories', { token: tb, body: { Nom: 'Bob cat', Type: 'depense' } })
  await c.call('cats list', 'GET', '/api/categories', { token: ta, query: { filter: { where: { or: [{ IDuser: A.IDuser }, { IDuser: 0 }] }, order: 'Nom ASC' } } })
  await c.call('cat get', 'GET', `/api/categories/${catDep.IDcat}`, { token: ta })
  await c.call('cat patch', 'PATCH', `/api/categories/${catDep.IDcat}`, { token: ta, body: { Nom: 'Courses 2' } })
  await c.call('cat patch autrui', 'PATCH', `/api/categories/${catDep.IDcat}`, { token: tb, body: { Nom: 'X' } })
  await c.call('cat count', 'GET', '/api/categories/count', { token: ta })

  // --- opérations
  const o1 = (await c.call('op create', 'POST', '/api/operations', { token: ta, body: { NomOp: 'Auchan', MontantOp: -12.34, DateOp: '2024-03-10T00:00:00.000Z', IDcompte: c1.IDcompte, IDcat: catDep.IDcat } })).body
  await c.call('op create 2', 'POST', '/api/operations', { token: ta, body: { NomOp: 'Auchan Drive', MontantOp: -40, DateOp: '2024-03-20T10:00:00.000Z', IDcompte: c1.IDcompte, IDcat: catDep.IDcat, CheckOp: true } })
  await c.call('op create 3', 'POST', '/api/operations', { token: ta, body: { NomOp: 'Salaire', MontantOp: 2000, DateOp: '2024-03-28T00:00:00.000Z', IDcompte: c1.IDcompte, IDcat: catRev.IDcat } })
  await c.call('op create 4', 'POST', '/api/operations', { token: ta, body: { NomOp: 'Épargne', MontantOp: -300, DateOp: '2024-03-29T00:00:00.000Z', IDcompte: c1.IDcompte, IDcat: catTra.IDcat } })
  await c.call('op create 5', 'POST', '/api/operations', { token: ta, body: { NomOp: 'Retraite 24', MontantOp: 300, DateOp: '2023-03-29T00:00:00.000Z', IDcompte: c2.IDcompte, IDcat: catTra.IDcat } })
  await c.call('op create 6 (2023)', 'POST', '/api/operations', { token: ta, body: { NomOp: 'Auchan 2023', MontantOp: -80, DateOp: '2023-03-10T00:00:00.000Z', IDcompte: c1.IDcompte, IDcat: catDep.IDcat } })
  await c.call('op compte autrui', 'POST', '/api/operations', { token: ta, body: { NomOp: 'x', MontantOp: 1, DateOp: '2024-01-01T00:00:00.000Z', IDcompte: cb.IDcompte } })
  await c.call('ops page 1', 'GET', '/api/operations', { token: ta, query: { filter: { where: { IDcompte: c1.IDcompte }, order: 'CheckOp ASC, DateOp DESC', limit: 2, skip: 0 } } })
  await c.call('ops page 2', 'GET', '/api/operations', { token: ta, query: { filter: { where: { IDcompte: c1.IDcompte }, order: 'CheckOp ASC, DateOp DESC', limit: 2, skip: 2 } } })
  await c.call('ops recherche', 'GET', '/api/operations', { token: ta, query: { filter: { where: { IDcompte: { inq: [c1.IDcompte, c2.IDcompte] }, or: [{ NomOp: { like: '%auchan%' } }, { MontantOp: { like: '%auchan%' } }] }, order: 'DateOp DESC', limit: 35, skip: 0 } } })
  await c.call('ops where', 'GET', '/api/operations', { token: ta, query: { filter: { where: { IDcompte: c1.IDcompte }, order: 'DateOp DESC' } } })
  await c.call('ops count', 'GET', '/api/operations/count', { token: ta })
  await c.call('op get', 'GET', `/api/operations/${o1.IDop}`, { token: ta })
  await c.call('op get autrui', 'GET', `/api/operations/${o1.IDop}`, { token: tb })
  await c.call('op pointage', 'PATCH', `/api/operations/${o1.IDop}`, { token: ta, body: { CheckOp: true } })
  await c.call('op put', 'PUT', `/api/operations/${o1.IDop}`, { token: ta, body: { NomOp: 'Auchan v2', MontantOp: -13, DateOp: '2024-03-11T00:00:00.000Z', IDcompte: c1.IDcompte, IDcat: catDep.IDcat, CheckOp: true, amortissement: false } })
  await c.call('op get après put', 'GET', `/api/operations/${o1.IDop}`, { token: ta })
  await c.call('op delete autrui', 'DELETE', `/api/operations/${o1.IDop}`, { token: tb })

  await c.call('sumAllCompteForUser', 'GET', '/api/operations/sumAllCompteForUser', { token: ta })
  await c.call('sumForACompte', 'GET', '/api/operations/sumForACompte', { token: ta, query: { id: c1.IDcompte } })
  await c.call('sumForACompte autrui', 'GET', '/api/operations/sumForACompte', { token: ta, query: { id: cb.IDcompte } })
  await c.call('sumByUserByMonth', 'GET', '/api/operations/sumByUserByMonth', { token: ta, query: { monthNumber: 3, yearNumber: 2024 } })
  await c.call('sumByUserByMonth compte', 'GET', '/api/operations/sumByUserByMonth', { token: ta, query: { monthNumber: 3, yearNumber: 2024, IDCompte: c1.IDcompte } })
  await c.call('sumCategoriesByUserByMonth', 'GET', '/api/operations/sumCategoriesByUserByMonth', { token: ta, query: { monthNumber: 3, yearNumber: 2024 } })
  await c.call('suggestCategories', 'GET', '/api/operations/suggestCategories', { token: ta, query: { operationName: 'auchan' } })
  await c.call('suggestCategories limit', 'GET', '/api/operations/suggestCategories', { token: ta, query: { operationName: 'auchan', limit: 1 } })
  await c.call('suggestCategories court', 'GET', '/api/operations/suggestCategories', { token: ta, query: { operationName: 'a' } })

  // --- récurrentes
  const r1 = (await c.call('rec create', 'POST', '/api/operation-recurrentes', { token: ta, body: { NomOpRecu: 'Loyer', MontantOpRecu: -500, JourOpRecu: 1, DernierDateOpRecu: day(20), IDcompte: c1.IDcompte } })).body
  await c.call('rec create récente', 'POST', '/api/operation-recurrentes', { token: ta, body: { NomOpRecu: 'Net', MontantOpRecu: -30, JourOpRecu: 1, DernierDateOpRecu: day(3), IDcompte: c1.IDcompte, IDcat: catDep.IDcat } })
  await c.call('rec create annuelle', 'POST', '/api/operation-recurrentes', { token: ta, body: { NomOpRecu: 'Assurance', MontantOpRecu: -400, JourOpRecu: 1, Frequence: 7, DernierDateOpRecu: day(400), IDcompte: c1.IDcompte } })
  await c.call('rec compte autrui', 'POST', '/api/operation-recurrentes', { token: ta, body: { NomOpRecu: 'x', MontantOpRecu: 1, JourOpRecu: 1, DernierDateOpRecu: day(1), IDcompte: cb.IDcompte } })
  await c.call('recs list', 'GET', '/api/operation-recurrentes', { token: ta, query: { filter: { order: 'DernierDateOpRecu DESC, NomOpRecu ASC' } } })
  await c.call('rec get autrui', 'GET', `/api/operation-recurrentes/${r1.IDopRecu}`, { token: tb })
  await c.call('auto-generation', 'POST', '/api/operation-recurrentes/auto-generation', { token: ta, body: {} })
  await c.call('recs list après génération', 'GET', '/api/operation-recurrentes', { token: ta, query: { filter: { order: 'IDopRecu ASC' } } })
  await c.call('ops après génération', 'GET', '/api/operations', { token: ta, query: { filter: { where: { IDcompte: c1.IDcompte }, order: 'IDop ASC' } } })

  // --- crédits / biens
  const cr = (await c.call('credit create', 'POST', '/api/credits', { token: ta, body: { NomCredit: 'Maison', MontantInitial: 1000, MontantMensuel: 100, TauxInteret: 12, DateDebut: '2024-03-15T00:00:00.000Z', DateFin: '2025-03-15T00:00:00.000Z', IDcompte: c1.IDcompte } })).body
  await c.call('credit compte autrui', 'POST', '/api/credits', { token: ta, body: { NomCredit: 'X', MontantInitial: 1, MontantMensuel: 1, DateDebut: '2024-03-15T00:00:00.000Z', DateFin: '2025-03-15T00:00:00.000Z', IDcompte: cb.IDcompte } })
  await c.call('credit get', 'GET', `/api/credits/${cr.IDcredit}`, { token: ta })
  await c.call('credits list', 'GET', '/api/credits', { token: ta })
  await c.call('credit récurrente liée', 'GET', `/api/operation-recurrentes/${cr.IDopRecu}`, { token: ta })
  for (const [i, d] of ['2024-03-15T00:00:00.000Z', '2024-04-15T00:00:00.000Z'].entries()) {
    await c.call(`paiement ${i}`, 'POST', '/api/operations', { token: ta, body: { NomOp: 'Mensualité Maison', MontantOp: -100, DateOp: d, IDcompte: c1.IDcompte, IDcredit: cr.IDcredit } })
  }
  await c.call('credit solde', 'GET', `/api/credits/${cr.IDcredit}/remaining-balance`, { token: ta })
  await c.call('credit solde autrui', 'GET', `/api/credits/${cr.IDcredit}/remaining-balance`, { token: tb })
  await c.call('credit payments', 'GET', `/api/credits/${cr.IDcredit}/payments`, { token: ta })
  await c.call('credit put', 'PUT', `/api/credits/${cr.IDcredit}`, { token: ta, body: { NomCredit: 'Maison 2', MontantInitial: 1000, MontantMensuel: 100, TauxInteret: 12, DateDebut: '2024-03-15T00:00:00.000Z', DateFin: '2025-03-15T00:00:00.000Z', IDcompte: c1.IDcompte, IDuser: A.IDuser, IDopRecu: cr.IDopRecu } })
  await c.call('credit get après put', 'GET', `/api/credits/${cr.IDcredit}`, { token: ta })

  const bien = (await c.call('bien create', 'POST', '/api/biens', { token: ta, body: { NomBien: 'Appart', Ville: 'Lyon', TypeBien: 'appartement', Usage: 'principale', DateAchat: '2020-06-01T00:00:00.000Z', PrixBienNu: 200000, FraisNotaire: 15000, IDcredit: cr.IDcredit } })).body
  await c.call('bien sans crédit', 'POST', '/api/biens', { token: ta, body: { NomBien: 'Garage', Ville: 'Lyon', TypeBien: 'garage', Usage: 'secondaire', DateAchat: '2021-01-01T00:00:00.000Z', PrixBienNu: 10000, FraisNotaire: 800 } })
  await c.call('bien crédit autrui', 'POST', '/api/biens', { token: tb, body: { NomBien: 'Pirate', Ville: 'X', TypeBien: 'x', Usage: 'x', DateAchat: '2021-01-01T00:00:00.000Z', PrixBienNu: 1, FraisNotaire: 1, IDcredit: cr.IDcredit } })
  await c.call('biens list', 'GET', '/api/biens', { token: ta })
  await c.call('bien get autrui', 'GET', `/api/biens/${bien.IDbien}`, { token: tb })
  await c.call('bien patch', 'PATCH', `/api/biens/${bien.IDbien}`, { token: ta, body: { ValeurActuelle: 250000 } })

  // --- stats
  await c.call('evolutionSolde', 'GET', '/api/stats/evolutionSolde', { token: ta })
  await c.call('yearComparison', 'GET', '/api/stats/yearComparison', { token: ta, query: { yearA: 2023, yearB: 2024 } })
  await c.call('yearComparison 400', 'GET', '/api/stats/yearComparison', { token: ta, query: { yearA: 2023 } })
  await c.call('topCategories', 'GET', '/api/stats/topCategories', { token: ta, query: { from: '2024-01-01', to: '2024-12-31' } })
  await c.call('topCategories limit', 'GET', '/api/stats/topCategories', { token: ta, query: { from: '2023-01-01', to: '2024-12-31', limit: 1 } })
  await c.call('topCategories 400', 'GET', '/api/stats/topCategories', { token: ta, query: { from: '2024-12-31', to: '2024-01-01' } })
  await c.call('incomeVsExpense', 'GET', '/api/stats/incomeVsExpense', { token: ta, query: { yearNumber: 2024 } })
  await c.call('topOperations', 'GET', '/api/stats/topOperations', { token: ta, query: { from: '2024-01-01', to: '2024-12-31', limit: 3 } })
  await c.call('categoryHeatmap', 'GET', '/api/stats/categoryHeatmap', { token: ta, query: { yearNumber: 2024 } })
  await c.call('stats bob (vide)', 'GET', '/api/stats/topCategories', { token: tb, query: { from: '2024-01-01', to: '2024-12-31' } })

  // --- suppressions et cascades
  await c.call('compte delete référencé', 'DELETE', `/api/comptes/${c1.IDcompte}`, { token: ta })
  await c.call('credit delete', 'DELETE', `/api/credits/${cr.IDcredit}`, { token: ta })
  await c.call('récurrente liée supprimée', 'GET', `/api/operation-recurrentes/${cr.IDopRecu}`, { token: ta })
  await c.call('paiements détachés', 'GET', '/api/operations', { token: ta, query: { filter: { where: { NomOp: 'Mensualité Maison' }, order: 'IDop ASC' } } })
  await c.call('bien delete', 'DELETE', `/api/biens/${bien.IDbien}`, { token: ta })
  await c.call('cat delete', 'DELETE', `/api/categories/${catDep.IDcat}`, { token: ta })
  await c.call('compte vide delete', 'DELETE', `/api/comptes/${c2.IDcompte}`, { token: ta })

  // --- management-info (après les suppressions)
  await c.call('management-info', 'GET', '/api/comptes/management-info', { token: ta })
  return c.log
}

// Champs volatils / propres à chaque implémentation
const normalize = (entry: Logged) => {
  const body = structuredClone(entry.body)
  const scrub = (value: any, key?: string): any => {
    if (Array.isArray(value)) return value.map(v => scrub(v))
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, scrub(v, k)]))
    if (key === 'date' && entry.label === 'ping') return '<date>'
    return value
  }
  const norm: any = { label: entry.label, status: entry.status }
  if (entry.status >= 400) norm.errorStatus = body?.error?.statusCode
  else norm.body = scrub(body)
  if (entry.label === 'login ok') norm.body = { userId: body.userId, hasToken: typeof body.id === 'string' }
  if (entry.label === 'ping') norm.body = { greeting: typeof body.greeting }
  if (entry.label === 'logout' || entry.label === 'login ok') norm.cookieCleared = /Max-Age=0/i.test(entry.setCookie ?? '')
  return norm
}

const firstDiff = (a: any, b: any, path = ''): string | undefined => {
  if (JSON.stringify(a) === JSON.stringify(b)) return undefined
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const d = firstDiff(a[key], b[key], `${path}.${key}`)
      if (d) return d
    }
  }
  return `${path}: LB=${JSON.stringify(a)} Nitro=${JSON.stringify(b)}`
}

describe('parité LoopBack ↔ Nitro', () => {
  it('le même scénario produit les mêmes réponses', async () => {
    const lb = await scenario(new Client(p.lbUrl))
    const nitro = await scenario(new Client(p.nitroUrl))
    expect(nitro.map(e => e.label)).toEqual(lb.map(e => e.label))

    const hard: string[] = []
    const info: string[] = []
    lb.forEach((entry, i) => {
      const a = normalize(entry)
      const b = normalize(nitro[i]!)
      try { expect(b).toEqual(a) } catch (error) {
        hard.push(`✗ ${entry.label} → ${firstDiff(a, b)}\n    LoopBack: ${JSON.stringify(a).slice(0, 400)}\n    Nitro   : ${JSON.stringify(b).slice(0, 400)}`)
      }
      if (entry.status >= 400 && entry.body?.error?.message !== nitro[i]!.body?.error?.message) {
        info.push(`  ${entry.label} [${entry.status}] LB="${entry.body?.error?.message}" ${JSON.stringify(entry.body?.error?.details?.map?.((d: any) => `${d.path} ${d.message}`))} Nitro="${nitro[i]!.body?.error?.message}"`)
      }
    })
    if (info.length) console.info(`Messages d'erreur différents (indicatif) :\n${info.join('\n')}`)
    expect(hard, `\n${hard.join('\n')}\n`).toEqual([])
  })
})
