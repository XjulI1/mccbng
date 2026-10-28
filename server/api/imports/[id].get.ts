import { defineApiHandler } from '../../utils/errors'
import { loadLot } from '../../utils/import/lots'
import { getCurrentUserId } from '../../utils/scope'
import { idParam } from '../../utils/validate'

export default defineApiHandler(event => loadLot(getCurrentUserId(event), idParam(event)))
