import { describe, expect, it } from 'vitest'
import bcrypt from 'bcryptjs'
import { LOCKOUT_DELAYS_MS, lockoutDelayMs } from '../../server/utils/users'
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
