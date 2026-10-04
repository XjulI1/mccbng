import { describe, expect, it } from 'vitest'
import jwt from 'jsonwebtoken'
import { createUser, ctx, del, get, patch, post, request, signToken, sql } from './helpers'

describe('authentification', () => {
  it('login valide : JWT avec IDuser, cookie HttpOnly', async () => {
    const user = await createUser()
    const res = await post('/api/users/login', undefined, { email: user.email, code: user.code })
    expect(res.status).toBe(200)
    expect(res.body.userId).toBe(user.IDuser)
    const decoded = jwt.verify(res.body.id, ctx().jwtSecret) as jwt.JwtPayload
    expect(decoded.IDuser).toBe(user.IDuser)
    expect(decoded.id).toBe(user.id)
    const cookie = res.headers.get('set-cookie') ?? ''
    expect(cookie).toContain('mccbngAuth=')
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Strict/i)
    expect(cookie).toMatch(/Max-Age=3600/i)
    expect(cookie).toMatch(/Secure/i) // NODE_ENV=production
  })

  it('code invalide et email inconnu : 401 identique', async () => {
    const user = await createUser()
    const wrongCode = await post('/api/users/login', undefined, { email: user.email, code: 'zzzzzz' })
    const unknown = await post('/api/users/login', undefined, { email: 'nobody@example.test', code: 'abc123' })
    expect(wrongCode.status).toBe(401)
    expect(unknown.status).toBe(401)
    expect(wrongCode.body.error.message).toBe('Invalid email or code.')
    expect(unknown.body.error.message).toBe('Invalid email or code.')
  })

  it('migration paresseuse : une secret_key en clair est hashée à la première connexion', async () => {
    const user = await createUser({ plaintext: true, code: 'plain1' })
    const res = await post('/api/users/login', undefined, { email: user.email, code: 'plain1' })
    expect(res.status).toBe(200)
    const [row] = await sql('SELECT secret_key FROM `User` WHERE id = ?', [user.id])
    expect(row.secret_key).toMatch(/^\$2[aby]\$12\$/)
  })

  it('corps invalide : 4xx au format d\'erreur uniforme', async () => {
    const res = await post('/api/users/login', undefined, { email: 'pas-un-email', code: '12' })
    expect(res.status).toBe(422)
    expect(res.body.error).toMatchObject({ statusCode: 422, name: 'UnprocessableEntityError' })
  })
})

describe('JWT sur les routes protégées', () => {
  it('sans token : 401', async () => {
    const res = await get('/api/comptes')
    expect(res.status).toBe(401)
    expect(res.body.error.statusCode).toBe(401)
  })

  it('token expiré : 401', async () => {
    const user = await createUser()
    const expired = signToken(user, { expiresIn: -10 })
    expect((await get('/api/comptes', expired)).status).toBe(401)
  })

  it('token signé avec un autre secret : 401', async () => {
    const user = await createUser()
    const forged = jwt.sign({ id: user.id, IDuser: user.IDuser, email: user.email }, 'autre-secret')
    const res = await get('/api/comptes', forged)
    expect(res.status).toBe(401)
    expect(res.body.error.message).toContain('Error verifying token')
  })

  it('ping est public', async () => {
    const res = await get('/api/ping')
    expect(res.status).toBe(200)
    expect(res.body.greeting).toBeDefined()
  })

  it('route inconnue : 404 JSON', async () => {
    const user = await createUser()
    const res = await get('/api/inconnue', user.token)
    expect(res.status).toBe(404)
    expect(res.body.error.statusCode).toBe(404)
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

  it('logout efface le cookie', async () => {
    const user = await createUser()
    const res = await post('/api/users/logout', user.token)
    expect(res.status).toBe(204)
    expect(res.headers.get('set-cookie')).toMatch(/mccbngAuth=;.*Max-Age=0/i)
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
    const [row] = await sql('SELECT secret_key FROM `User` WHERE id = ?', [a.id])
    expect(row.secret_key).not.toBe('hacked')
  })
})

describe('utilisateurs dont la colonne id est dupliquée (données historiques)', () => {
  it('whoAmI et PATCH /users/me ciblent chacun leur propre ligne (clé primaire IDuser)', async () => {
    const a = await createUser()
    const b = await createUser()
    // En production la colonne `id` n'est pas unique : on force le même id pour les deux utilisateurs
    await sql('UPDATE `User` SET id = ? WHERE IDuser IN (?, ?)', ['1', a.IDuser, b.IDuser])
    const tokenA = signToken({ id: '1', IDuser: a.IDuser, email: a.email })
    const tokenB = signToken({ id: '1', IDuser: b.IDuser, email: b.email })

    expect((await get('/api/users/whoAmI', tokenA)).body).toMatchObject({ IDuser: a.IDuser, email: a.email })
    expect((await get('/api/users/whoAmI', tokenB)).body).toMatchObject({ IDuser: b.IDuser, email: b.email })

    expect((await patch('/api/users/me', tokenB, { username: 'seulement-b' })).status).toBe(204)
    expect((await get('/api/users/whoAmI', tokenB)).body.username).toBe('seulement-b')
    expect((await get('/api/users/whoAmI', tokenA)).body.username).not.toBe('seulement-b')

    // doublon d'email : 409 (et non une erreur SQL 500)
    expect((await patch('/api/users/me', tokenB, { email: a.email })).status).toBe(409)
  })
})

describe('signup', () => {
  it('anonyme refusé', async () => {
    expect((await post('/api/signup', undefined, { email: 'x@example.test', password: 'p', secret_key: '123456', IDuser: 9202 })).status).toBe(401)
  })

  it('crée un utilisateur, hashe secret_key et password, ne renvoie jamais secret_key', async () => {
    const admin = await createUser()
    const res = await post('/api/signup', admin.token, { email: 'new@example.test', password: 'pw', secret_key: '654321', IDuser: 9001 })
    expect(res.status).toBe(200)
    expect(res.body.secret_key).toBeUndefined()
    const [user] = await sql('SELECT secret_key FROM `User` WHERE email = ?', ['new@example.test'])
    expect(user.secret_key).toMatch(/^\$2/)
    const [cred] = await sql('SELECT password FROM UserCredentials WHERE userId = ?', [res.body.id])
    expect(cred.password).toMatch(/^\$2/)
  })

  it('409 sur email ou IDuser en doublon, 400 sur secret_key invalide', async () => {
    const admin = await createUser()
    const other = await createUser()
    expect((await post('/api/signup', admin.token, { email: other.email, password: 'p', secret_key: '123456', IDuser: 9200 })).status).toBe(409)
    const dup = await post('/api/signup', admin.token, { email: 'dup@example.test', password: 'p', secret_key: '123456', IDuser: other.IDuser })
    expect(dup.status).toBe(409)
    expect(dup.body.error.message).toBe('IDuser is already in use')
    expect((await post('/api/signup', admin.token, { email: 'short@example.test', password: 'p', secret_key: '12', IDuser: 9201 })).status).toBe(400)
  })
})

describe('méthodes', () => {
  it('DELETE inattendu sur login : pas de 200', async () => {
    const res = await del('/api/users/login', undefined)
    expect(res.status).not.toBe(200)
  })
  it('requête non JSON : 4xx', async () => {
    const res = await request('POST', '/api/users/login', { headers: { 'Content-Type': 'application/json' }, body: undefined })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})
