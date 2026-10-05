import { getRequestURL } from 'h3'
import { defineApiHandler } from '../utils/errors'

// Santé publique : aucune donnée de la requête (en-têtes, IP) n'est renvoyée.
export default defineApiHandler((event) => {
  const { pathname, search } = getRequestURL(event)
  return {
    greeting: 'Hello from Nuxt',
    date: new Date(),
    url: pathname + search
  }
})
