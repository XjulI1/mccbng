import { defineApiHandler } from '../../utils/errors'
import { getCurrentUserId } from '../../utils/scope'
import { evolutionSolde } from '../../utils/stats'

export default defineApiHandler(event => evolutionSolde(getCurrentUserId(event)))
