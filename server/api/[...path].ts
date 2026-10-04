import { defineApiHandler, notFound } from '../utils/errors'

// Toute route /api/** non définie renvoie un 404 JSON (et non le shell HTML de la SPA).
export default defineApiHandler((event) => {
  throw notFound(`Route ${event.method} ${event.path.split('?')[0]} not found`)
})
