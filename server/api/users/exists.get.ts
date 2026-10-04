import { defineApiHandler } from '../../utils/errors'
import { getCurrentUserId } from '../../utils/scope'

export default defineApiHandler(event => typeof getCurrentUserId(event) === 'number')
