import { describe, expect, it } from 'vitest'
import bcrypt from 'bcryptjs'
import { LOCKOUT_DELAYS_MS, lockoutDelayMs } from '../../server/utils/users'
import { rateLimitKey } from '../../server/utils/client-ip'
// @ts-expect-error module JS sans types
import { hashCode } from '../../scripts/hash-code.mjs'

describe('paliers de verrouillage', () => {
  it('aucun verrouillage avant le 5e échec, puis 5 min, 30 min, 2 h et 24 h au maximum', () => {
    expect([0, 1, 4].map(lockoutDelayMs)).toEqual([undefined, undefined, undefined])
    expect([5, 6, 7, 8, 9, 50].map(lockoutDelayMs)).toEqual([
      5 * 60_000, 30 * 60_000, 2 * 3600_000, 24 * 3600_000, 24 * 3600_000, 24 * 3600_000
    ])
    expect(LOCKOUT_DELAYS_MS.at(-1)).toBe(24 * 3600_000)
  })
})

describe('pnpm hash-code', () => {
  it('produit un hash bcrypt de coût 12 vérifiable', async () => {
    const hash = await hashCode('123456')
    expect(hash).toMatch(/^\$2[aby]\$12\$/)
    expect(await bcrypt.compare('123456', hash)).toBe(true)
  })

  it('refuse un code d\'une autre longueur', () => {
    expect(() => hashCode('12')).toThrow(/6 caractères/)
  })
})

describe('clé de rate-limit par IP', () => {
  it('IPv4 inchangée, IPv4 mappée en IPv6 ramenée à l\'IPv4', () => {
    expect(rateLimitKey('90.35.111.87')).toBe('90.35.111.87')
    expect(rateLimitKey(' 127.0.0.1 ')).toBe('127.0.0.1')
    expect(rateLimitKey('::ffff:127.0.0.1')).toBe('127.0.0.1')
  })

  it('IPv6 réduite à son préfixe /64, quelle que soit la notation', () => {
    const key = '2a01:cb00:8c67:7700::/64'
    expect(rateLimitKey('2a01:cb00:8c67:7700:cd9:5097:ef56:993c')).toBe(key)
    expect(rateLimitKey('2a01:cb00:8c67:7700::1')).toBe(key)
    expect(rateLimitKey('2A01:CB00:8C67:7700:0000:0000:0000:0001')).toBe(key)
    expect(rateLimitKey('2a01:cb00:8c67:7700::1%eth0')).toBe(key)
    expect(rateLimitKey('2a01:cb00:8c67:7701::1')).toBe('2a01:cb00:8c67:7701::/64')
    expect(rateLimitKey('2001:db8::1')).toBe('2001:db8:0:0::/64')
    expect(rateLimitKey('::1')).toBe('0:0:0:0::/64')
    expect(rateLimitKey('64:ff9b::192.0.2.33')).toBe('64:ff9b:0:0::/64')
  })

  it('valeur non IP conservée telle quelle', () => {
    expect(rateLimitKey('unknown')).toBe('unknown')
  })
})
