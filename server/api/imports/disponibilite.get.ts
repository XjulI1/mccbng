import { defineApiHandler } from '../../utils/errors'
import { isImportDisponible } from '../../utils/import/extractor'

// L'import par LLM n'est proposé que si le serveur a une clé Anthropic.
export default defineApiHandler(() => ({ disponible: isImportDisponible() }))
