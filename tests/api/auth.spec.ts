import { randomInt } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import jwt from 'jsonwebtoken'
import { createCompte, createUser, ctx, get, patch, post, request, signToken, sql } from './helpers'

// Chaque test de login simule le reverse proxy avec sa propre IP (X-Real-IP) : le rate-limit (5 / 15 min / IP)
// n'est ainsi consommé que par le test qui le vise (zz-rate-limit.spec.ts).
const nextIp = () => `198.51.${randomInt(0, 256)}.${randomInt(1, 255)}`
const login = (body: unknown, headers: Record<string, string> = {}) =>
  request('POST', '/api/users/login', { body, headers: { 'X-Real-IP': nextIp(), ...headers } })

const cookieToken = (setCookie: string | null) => /mccbngAuth=([^;]*)/.exec(setCookie ?? '')?.[1] ?? ''

describe('authentification', () => {
  it('login valide : { userId } sans JWT dans le corps, cookie HttpOnly porteur du JWT durci', async () => {
    const user = await createUser()
    const res = await login({ email: user.email, code: user.code })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ userId: user.IDuser })

    const cookie = res.headers.get('set-cookie') ?? ''
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Strict/i)
    expect(cookie).toMatch(/Max-Age=3600/i)
    expect(cookie).toMatch(/Secure/i) // NODE_ENV=production
    const decoded = jwt.verify(cookieToken(cookie), ctx().jwtSecret, { algorithms: ['HS256'], issuer: 'mccbng', audience: 'mccbng' }) as jwt.JwtPayload
    expect(decoded).toMatchObject({ IDuser: user.IDuser, tv: 0 })
    expect(decoded.id).toBeUndefined()

    // Le cookie seul suffit à authentifier les requêtes suivantes
    expect((await get('/api/users/exists', cookieToken(cookie))).body).toBe(true)
  })

  it('code invalide et email inconnu : 401 identique', async () => {
    const user = await createUser()
    const wrongCode = await login({ email: user.email, code: 'zzzzzz' })
    const unknown = await login({ email: 'nobody@example.test', code: 'abc123' })
    expect(wrongCode.status).toBe(401)
    expect(unknown.status).toBe(401)
    expect(wrongCode.body.error.message).toBe('Invalid email or code.')
    expect(unknown.body.error.message).toBe('Invalid email or code.')
  })

  it('secret_key en clair : refusée et laissée inchangée', async () => {
    const user = await createUser({ plaintext: true, code: 'plain1' })
    const res = await login({ email: user.email, code: 'plain1' })
    expect(res.status).toBe(401)
    expect(res.body.error.message).toBe('Invalid email or code.')
    const [row] = await sql('SELECT secret_key FROM `User` WHERE IDuser = ?', [user.IDuser])
    expect(row.secret_key).toBe('plain1')
  })

  it('corps invalide : 4xx au format d\'erreur uniforme', async () => {
    const res = await login({ email: 'pas-un-email', code: '12' })
    expect(res.status).toBe(422)
    expect(res.body.error).toMatchObject({ statusCode: 422, name: 'UnprocessableEntityError' })
  })
})

describe('verrouillage temporaire du compte', () => {
  const lockedForMs = async (IDuser: number) => {
    const [row] = await sql('SELECT failedLoginCount, lockedUntil FROM `User` WHERE IDuser = ?', [IDuser])
    return { failedLoginCount: row.failedLoginCount, ms: row.lockedUntil ? new Date(row.lockedUntil).getTime() - Date.now() : 0 }
  }
  // lockedUntil est un DATETIME sans fraction de seconde : MariaDB arrondit à la seconde la plus proche (jusqu'à +0,5 s)
  const ROUNDING_MS = 1000
  const unlockClock = (IDuser: number) => sql('UPDATE `User` SET lockedUntil = ? WHERE IDuser = ?', [new Date('2000-01-01T00:00:00Z'), IDuser])

  it('5e échec : verrouillage de 5 min, bon code refusé sans révéler le verrouillage', async () => {
    const user = await createUser()
    for (let i = 0; i < 4; i++) expect((await login({ email: user.email, code: 'zzzzzz' })).status).toBe(401)
    expect((await lockedForMs(user.IDuser)).ms).toBe(0)

    expect((await login({ email: user.email, code: 'zzzzzz' })).status).toBe(401)
    const lock = await lockedForMs(user.IDuser)
    expect(lock.failedLoginCount).toBe(5)
    expect(lock.ms).toBeGreaterThan(4 * 60_000)
    expect(lock.ms).toBeLessThanOrEqual(5 * 60_000 + ROUNDING_MS)

    const good = await login({ email: user.email, code: user.code })
    expect(good.status).toBe(401)
    expect(good.body.error.message).toBe('Invalid email or code.')
    expect(good.headers.get('set-cookie')).toBeNull()
  })

  it('paliers successifs : 30 min, 2 h puis 24 h au maximum', async () => {
    const user = await createUser()
    await sql('UPDATE `User` SET failedLoginCount = 5 WHERE IDuser = ?', [user.IDuser])
    for (const expectedMinutes of [30, 120, 1440, 1440]) {
      await unlockClock(user.IDuser)
      expect((await login({ email: user.email, code: 'zzzzzz' })).status).toBe(401)
      const { ms } = await lockedForMs(user.IDuser)
      expect(ms).toBeGreaterThan((expectedMinutes - 1) * 60_000)
      expect(ms).toBeLessThanOrEqual(expectedMinutes * 60_000 + ROUNDING_MS)
    }
  })

  it('fin du verrouillage : le bon code est accepté et le compteur revient à 0', async () => {
    const user = await createUser()
    for (let i = 0; i < 5; i++) await login({ email: user.email, code: 'zzzzzz' })
    await unlockClock(user.IDuser)
    expect((await login({ email: user.email, code: user.code })).status).toBe(200)
    const [row] = await sql('SELECT failedLoginCount, lockedUntil FROM `User` WHERE IDuser = ?', [user.IDuser])
    expect(row).toMatchObject({ failedLoginCount: 0, lockedUntil: null })
  })

  it('une connexion réussie remet le compteur d\'échecs à zéro', async () => {
    const user = await createUser()
    for (let i = 0; i < 3; i++) await login({ email: user.email, code: 'zzzzzz' })
    expect((await login({ email: user.email, code: user.code })).status).toBe(200)
    for (let i = 0; i < 3; i++) await login({ email: user.email, code: 'zzzzzz' })
    expect((await lockedForMs(user.IDuser))).toEqual({ failedLoginCount: 3, ms: 0 })
  })
})

describe('session sur les routes protégées', () => {
  const expectInvalidToken = (res: { status: number; body: any }) => {
    expect(res.status).toBe(401)
    expect(res.body.error.message).toBe('Invalid or expired token')
  }

  it('sans session : 401', async () => {
    expectInvalidToken(await get('/api/comptes'))
  })

  it('Bearer seul (sans cookie) : 401', async () => {
    const user = await createUser()
    expectInvalidToken(await request('GET', '/api/comptes', { headers: { Authorization: `Bearer ${user.token}` } }))
  })

  it('token expiré : 401 générique', async () => {
    const user = await createUser()
    expectInvalidToken(await get('/api/comptes', signToken(user, { expiresIn: -10 })))
  })

  it('token signé avec un autre secret : 401 générique', async () => {
    const user = await createUser()
    const forged = jwt.sign({ IDuser: user.IDuser, email: user.email, tv: 0 }, 'autre-secret', { issuer: 'mccbng', audience: 'mccbng' })
    expectInvalidToken(await get('/api/comptes', forged))
  })

  it('algorithme autre que HS256 ou none : 401', async () => {
    const user = await createUser()
    const payload = { IDuser: user.IDuser, email: user.email, tv: 0 }
    const hs512 = jwt.sign(payload, ctx().jwtSecret, { algorithm: 'HS512', issuer: 'mccbng', audience: 'mccbng' })
    const none = jwt.sign(payload, '', { algorithm: 'none', issuer: 'mccbng', audience: 'mccbng' })
    expectInvalidToken(await get('/api/comptes', hs512))
    expectInvalidToken(await get('/api/comptes', none))
  })

  it('émetteur ou audience absents : 401', async () => {
    const user = await createUser()
    const legacy = jwt.sign({ IDuser: user.IDuser, email: user.email, tv: 0 }, ctx().jwtSecret, { expiresIn: 3600 })
    expectInvalidToken(await get('/api/comptes', legacy))
  })

  it('utilisateur supprimé : 401', async () => {
    const user = await createUser()
    await sql('DELETE FROM `User` WHERE IDuser = ?', [user.IDuser])
    expectInvalidToken(await get('/api/comptes', user.token))
  })

  it('ping est public et ne renvoie pas les en-têtes de la requête', async () => {
    const res = await request('GET', '/api/ping', { headers: { 'X-Forwarded-For': '203.0.113.1', 'User-Agent': 'test-agent' } })
    expect(res.status).toBe(200)
    expect(res.body.greeting).toBeDefined()
    expect(res.body.headers).toBeUndefined()
    expect(JSON.stringify(res.body)).not.toContain('test-agent')
  })

  it('route inconnue : 404 JSON', async () => {
    const user = await createUser()
    const res = await get('/api/inconnue', user.token)
    expect(res.status).toBe(404)
    expect(res.body.error.statusCode).toBe(404)
  })

  it('noms issus du prototype : 404 et non 500', async () => {
    const user = await createUser()
    for (const name of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
      const res = await get(`/api/${name}`, user.token)
      expect(res.status, name).toBe(404)
      expect(res.body.error.statusCode).toBe(404)
    }
    expect((await get('/api/constructor/1', user.token)).status).toBe(404)
  })
})

describe('protection CSRF', () => {
  it('méthode non sûre sans X-Requested-With : 403, rien n\'est créé', async () => {
    const user = await createUser()
    const res = await request('POST', '/api/comptes', {
      token: user.token, body: { NomCompte: 'CSRF', solde: 0 }, headers: { 'X-Requested-With': '' }
    })
    expect(res.status).toBe(403)
    expect(res.body.error).toMatchObject({ statusCode: 403, name: 'ForbiddenError' })
    expect((await get('/api/comptes', user.token)).body).toEqual([])
  })

  it('Origin d\'une autre application : 403 ; même hôte : accepté', async () => {
    const user = await createUser()
    const body = { NomCompte: 'Origine', solde: 0 }
    expect((await request('POST', '/api/comptes', { token: user.token, body, headers: { Origin: 'https://evil.example' } })).status).toBe(403)
    const sameOrigin = await request('POST', '/api/comptes', { token: user.token, body, headers: { Origin: ctx().baseUrl } })
    expect(sameOrigin.status).toBe(200)
  })

  it('le login exige aussi l\'en-tête', async () => {
    const user = await createUser()
    expect((await login({ email: user.email, code: user.code }, { 'X-Requested-With': '' })).status).toBe(403)
  })

  it('les lectures ne l\'exigent pas', async () => {
    const user = await createUser()
    expect((await request('GET', '/api/comptes', { token: user.token, headers: { 'X-Requested-With': '' } })).status).toBe(200)
  })
})

describe('déconnexion', () => {
  it('204, cookie expiré, jeton rejoué refusé', async () => {
    const user = await createUser()
    const res = await post('/api/users/logout', user.token)
    expect(res.status).toBe(204)
    expect(res.headers.get('set-cookie')).toMatch(/mccbngAuth=;.*Max-Age=0/i)
    expect((await get('/api/comptes', user.token)).status).toBe(401)
  })

  it('révoque les sessions de tous les appareils', async () => {
    const user = await createUser()
    const phone = cookieToken((await login({ email: user.email, code: user.code })).headers.get('set-cookie'))
    const laptop = cookieToken((await login({ email: user.email, code: user.code })).headers.get('set-cookie'))
    await createCompte({ ...user, token: phone })
    expect((await post('/api/users/logout', laptop)).status).toBe(204)
    expect((await get('/api/comptes', phone)).status).toBe(401)
    expect((await get('/api/comptes', laptop)).status).toBe(401)

    // Une nouvelle connexion fonctionne (tokenVersion à jour)
    const fresh = cookieToken((await login({ email: user.email, code: user.code })).headers.get('set-cookie'))
    expect((await get('/api/comptes', fresh)).status).toBe(200)
  })
})

describe('profil utilisateur', () => {
  it('whoAmI, exists', async () => {
    const user = await createUser()
    const me = await get('/api/users/whoAmI', user.token)
    expect(me.status).toBe(200)
    expect(me.body).toMatchObject({ IDuser: user.IDuser, email: user.email })
    expect(me.body.secret_key).toBeUndefined()
    expect((await get('/api/users/exists', user.token)).body).toBe(true)
  })

  it('PATCH /users/me : champs autorisés, 409 sur email pris, champ interdit rejeté', async () => {
    const a = await createUser()
    const b = await createUser()
    expect((await patch('/api/users/me', a.token, { username: 'nouveau', favoris: 3 })).status).toBe(204)
    expect((await get('/api/users/whoAmI', a.token)).body).toMatchObject({ username: 'nouveau', favoris: 3 })

    const conflict = await patch('/api/users/me', a.token, { email: b.email })
    expect(conflict.status).toBe(409)

    const forbidden = await patch('/api/users/me', a.token, { secret_key: 'hacked' })
    expect(forbidden.status).toBeGreaterThanOrEqual(400)
    const [row] = await sql('SELECT secret_key FROM `User` WHERE IDuser = ?', [a.IDuser])
    expect(row.secret_key).not.toBe('hacked')
  })
})

describe('création d\'utilisateur', () => {
  it('POST /api/signup n\'existe plus : 404 et aucun utilisateur créé', async () => {
    const user = await createUser()
    const res = await post('/api/signup', user.token, { email: 'signup@example.test', password: 'p', secret_key: '123456', IDuser: 0 })
    expect(res.status).toBe(404)
    expect(await sql('SELECT IDuser FROM `User` WHERE email = ?', ['signup@example.test'])).toEqual([])
  })
})

describe('méthodes', () => {
  it('DELETE inattendu sur login : pas de 200', async () => {
    const res = await request('DELETE', '/api/users/login', { headers: { 'X-Real-IP': nextIp() } })
    expect(res.status).not.toBe(200)
  })
  it('requête non JSON : 4xx', async () => {
    const res = await request('POST', '/api/users/login', { headers: { 'Content-Type': 'application/json', 'X-Real-IP': nextIp() }, body: undefined })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})
