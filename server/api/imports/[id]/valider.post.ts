import { setResponseStatus } from 'h3'
import { z } from 'zod'
import { defineApiHandler } from '../../../utils/errors'
import { validateLot } from '../../../utils/import/lots'
import { getCurrentUserId } from '../../../utils/scope'
import { idParam, numeric, parseBody } from '../../../utils/validate'

const id = z.preprocess(v => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v), z.number().int().positive())

// Lignes retenues après revue, éventuellement corrigées ; une ligne ajoutée à la main n'a pas d'IDligne.
const validationBody = z.object({
  lignes: z.array(z.object({
    IDligne: id.optional(),
    DateOp: z.coerce.date(),
    NomOp: z.string().trim().min(1).max(512),
    MontantOp: numeric,
    IDcat: z.preprocess(v => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v), z.number().int().min(0))
  })).min(1).max(500)
})

export default defineApiHandler(async (event) => {
  const body = await parseBody(event, validationBody)
  const ids = await validateLot(getCurrentUserId(event), idParam(event), body.lignes)
  setResponseStatus(event, 201)
  return { count: ids.length, IDops: ids }
})
