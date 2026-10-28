import { defineApiHandler } from '../../utils/errors'
import { listBrouillons } from '../../utils/import/lots'
import { getCurrentUserId } from '../../utils/scope'

// Brouillons de l'utilisateur, du plus récent au plus ancien (sans les lignes).
export default defineApiHandler(event => listBrouillons(getCurrentUserId(event)))
