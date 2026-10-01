import { defineApiHandler } from '../../utils/errors'
import { crudHandlers, routeResourceName, unknownResource } from '../../utils/crud'
import { crudResources } from '../../utils/resources'

export default defineApiHandler((event) => {
  const resource = crudResources[routeResourceName(event) ?? '']
  if (!resource) throw unknownResource(routeResourceName(event))
  return crudHandlers.get(resource, event)
})
