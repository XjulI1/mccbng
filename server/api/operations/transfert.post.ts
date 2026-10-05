import { z } from 'zod'
import { getDb } from '../../db/client'
import { operations } from '../../db/schema'
import { badRequest, defineApiHandler } from '../../utils/errors'
import { assertCategorieInBody } from '../../utils/resources'
import { assertCompteOwned } from '../../utils/scope'
import { numeric, parseBody } from '../../utils/validate'

const id = z.preprocess(v => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v), z.number().int().positive())

const transfertBody = z.object({
  fromCompte: id,
  toCompte: id,
  montant: numeric.pipe(z.number().positive()),
  DateOp: z.coerce.date(),
  NomOp: z.string(),
  // Catégorie obligatoire, appliquée aux deux opérations (Virement ou Retrait, de Type 'transfert')
  IDcat: id
})

type NewOperation = typeof operations.$inferInsert

// Virement entre deux comptes de l'utilisateur : débit et crédit insérés dans une même transaction (InnoDB).
export default defineApiHandler(async (event) => {
  const body = await parseBody(event, transfertBody)
  if (body.fromCompte === body.toCompte) throw badRequest('fromCompte and toCompte must be different')
  await assertCompteOwned(event, body.fromCompte)
  await assertCompteOwned(event, body.toCompte)
  await assertCategorieInBody(event, { IDcat: body.IDcat })

  const base = { NomOp: body.NomOp, DateOp: body.DateOp, IDcat: body.IDcat, CheckOp: false, amortissement: false }
  const debit: NewOperation = { ...base, MontantOp: -body.montant, IDcompte: body.fromCompte }
  const credit: NewOperation = { ...base, MontantOp: body.montant, IDcompte: body.toCompte }

  const [debitId, creditId] = await getDb().transaction(async (tx) => {
    const insert = async (values: NewOperation) => {
      const [result] = await tx.insert(operations).values(values)
      return (result as unknown as { insertId: number }).insertId
    }
    return [await insert(debit), await insert(credit)] as const
  })
  return { debit: { ...debit, IDop: debitId }, credit: { ...credit, IDop: creditId } }
})
