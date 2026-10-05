import { describe, expect, it } from 'vitest'
import { credits, operationRecurrentes } from '../../server/db/schema'
import { creditResource } from '../../server/utils/resources'
import { insertCompensatedPair } from '../../server/utils/transfer'

describe('création d\'un crédit : compensation sans transaction', () => {
  it('supprime la récurrente si la mise à jour de Credit.IDopRecu échoue', async () => {
    const deleted: unknown[] = []
    const tx = {
      insert: (table: unknown) => ({ values: async () => [{ insertId: table === credits ? 11 : 22 }] }),
      update: () => ({ set: () => ({ where: async () => { throw new Error('update failed') } }) }),
      delete: (table: unknown) => ({ where: async () => { deleted.push(table) } }),
      select: () => { throw new Error('unexpected select') }
    }
    const data = {
      NomCredit: 'Maison', MontantInitial: 1000, MontantMensuel: 100, IDcompte: 1, IDcat: 0,
      DateDebut: new Date('2027-03-15T00:00:00Z'), DateFin: new Date('2030-03-15T00:00:00Z')
    }
    await expect(creditResource.onCreate!({} as never, data, tx as never)).rejects.toThrow('update failed')
    expect(deleted).toEqual([operationRecurrentes])
  })
})

describe('virement : insertCompensatedPair', () => {
  it('supprime le débit si le crédit échoue', async () => {
    const removed: number[] = []
    let next = 100
    const insert = async (values: { side: string }) => {
      if (values.side === 'credit') throw new Error('credit failed')
      return next++
    }
    await expect(insertCompensatedPair(insert, async (id) => { removed.push(id) }, { side: 'debit' }, { side: 'credit' }))
      .rejects.toThrow('credit failed')
    expect(removed).toEqual([100])
  })

  it('renvoie les deux identifiants sans rien supprimer', async () => {
    let next = 1
    const removed: number[] = []
    const ids = await insertCompensatedPair(async () => next++, async (id) => { removed.push(id) }, {}, {})
    expect(ids).toEqual([1, 2])
    expect(removed).toEqual([])
  })
})
