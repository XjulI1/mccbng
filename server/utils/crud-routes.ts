import { resolveResource, routeResourceName, runCrudAction, type CrudAction } from './crud'
import { defineApiHandler } from './errors'
import { crudResources } from './resources'

// Handler CRUD pour une ressource donnée (utilisé par les fichiers de route explicites).
export const crudRoute = (path: string, action: CrudAction) =>
  defineApiHandler(event => runCrudAction(resolveResource(crudResources, path), action, event))

// Handler CRUD des routes génériques /api/[resource] (nom de ressource lu dans l'URL).
export const genericCrudRoute = (action: CrudAction) =>
  defineApiHandler(event => runCrudAction(resolveResource(crudResources, routeResourceName(event)), action, event))
