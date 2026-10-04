import { crudHandlers, type CrudAction } from './crud'
import { defineApiHandler } from './errors'
import { crudResources } from './resources'

// Handler CRUD pour une ressource donnée (utilisé par les fichiers de route explicites).
export const crudRoute = (path: string, action: CrudAction) =>
  defineApiHandler(event => crudHandlers[action](crudResources[path]!, event))
