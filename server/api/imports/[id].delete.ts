import { setResponseStatus } from 'h3'
import { defineApiHandler } from '../../utils/errors'
import { deleteLot } from '../../utils/import/lots'
import { getCurrentUserId } from '../../utils/scope'
import { idParam } from '../../utils/validate'

// Abandon d'un brouillon : le lot et ses lignes sont supprimés, aucune opération n'est créée.
export default defineApiHandler(async (event) => {
  await deleteLot(getCurrentUserId(event), idParam(event))
  setResponseStatus(event, 204)
  return null
})
