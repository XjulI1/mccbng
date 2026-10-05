import { describe, expect, it } from 'vitest'
import { createUser, get, request } from './helpers'

const login = (headers: Record<string, string>, body: Record<string, string>) =>
  request('POST', '/api/users/login', { body, headers })

const wrong = (email: string) => ({ email, code: 'zzzzzz' })

describe('rate-limit du login (nuxt-security)', () => {
  it('le 6e essai depuis la même IP de confiance reçoit 429, même en changeant X-Forwarded-For', async () => {
    const user = await createUser()
    const statuses: number[] = []
    for (let i = 0; i < 6; i++) {
      statuses.push((await login({ 'X-Real-IP': '203.0.113.7', 'X-Forwarded-For': `192.0.2.${i}` }, wrong(user.email))).status)
    }
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401])
    expect(statuses[5]).toBe(429)

    // Une autre IP n'est pas limitée (autre utilisateur : le premier est verrouillé après 5 échecs)
    const other = await createUser()
    expect((await login({ 'X-Real-IP': '203.0.113.8' }, { email: other.email, code: other.code })).status).toBe(200)
  })

  it('sans X-Real-IP, l\'adresse de la socket est utilisée : la rotation de X-Forwarded-For ne contourne pas la limite', async () => {
    const statuses: number[] = []
    for (let i = 0; i < 6; i++) {
      const user = await createUser()
      statuses.push((await login({ 'X-Forwarded-For': `198.18.0.${i}` }, wrong(user.email))).status)
    }
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401])
    expect(statuses[5]).toBe(429)
  })

  it('les autres routes ne sont pas limitées', async () => {
    const user = await createUser()
    for (let i = 0; i < 12; i++) expect((await get('/api/comptes', user.token)).status).toBe(200)
  })
})
