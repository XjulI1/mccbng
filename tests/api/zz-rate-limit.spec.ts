import { describe, expect, it } from 'vitest'
import { createUser, get, request } from './helpers'

const login = (ip: string, body: Record<string, string>) =>
  request('POST', '/api/users/login', { body, headers: { 'X-Forwarded-For': ip } })

describe('rate-limit du login (nuxt-security)', () => {
  it('le 6e essai depuis la même IP reçoit 429, une autre IP n\'est pas limitée', async () => {
    const user = await createUser()
    const statuses: number[] = []
    for (let i = 0; i < 6; i++) statuses.push((await login('203.0.113.7', { email: user.email, code: 'zzzzzz' })).status)
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401])
    expect(statuses[5]).toBe(429)

    expect((await login('203.0.113.8', { email: user.email, code: user.code })).status).toBe(200)
  })

  it('les autres routes ne sont pas limitées', async () => {
    const user = await createUser()
    for (let i = 0; i < 12; i++) expect((await get('/api/comptes', user.token)).status).toBe(200)
  })
})
