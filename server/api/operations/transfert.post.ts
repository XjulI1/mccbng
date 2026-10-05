import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../../db/client'
import { operations } from '../../db/schema'
import { badRequest, defineApiHandler } from '../../utils/errors'
import { assertCategorieInBody } from '../../utils/resources'
import { assertCompteOwned } from '../../utils/scope'
import { insertCompensatedPair } from '../../utils/transfer'
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

// Virement entre deux comptes de l'utilisateur : débit puis crédit en une requête, avec compensation.
export default defineApiHandler(async (event) => {
  const body = await parseBody(event, transfertBody)
  if (body.fromCompte === body.toCompte) throw badRequest('fromCompte and toCompte must be different')
  await assertCompteOwned(event, body.fromCompte)
  await assertCompteOwned(event, body.toCompte)
  await assertCategorieInBody(event, { IDcat: body.IDcat })

  const base = { NomOp: body.NomOp, DateOp: body.DateOp, IDcat: body.IDcat, CheckOp: false, amortissement: false }
  const debit: NewOperation = { ...base, MontantOp: -body.montant, IDcompte: body.fromCompte }
  const credit: NewOperation = { ...base, MontantOp: body.montant, IDcompte: body.toCompte }

  const [debitId, creditId] = await insertCompensatedPair(
    async (values) => {
      const [result] = await getDb().insert(operations).values(values)
      return (result as unknown as { insertId: number }).insertId
    },
    async (opId) => { await getDb().delete(operations).where(eq(operations.IDop, opId)) },
    debit,
    credit
  )
  return { debit: { ...debit, IDop: debitId }, credit: { ...credit, IDop: creditId } }
})
