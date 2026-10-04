import { getQuery, getRouterParam, readBody, type H3Event } from 'h3'
import { z, type ZodType } from 'zod'
import { badRequest } from './errors'

export const parseBody = async <S extends ZodType>(event: H3Event, schema: S): Promise<z.output<S>> => {
  let body: unknown
  try {
    body = await readBody(event)
  } catch {
    throw badRequest('Invalid JSON body')
  }
  return schema.parse(body ?? {})
}

// Nombres reçus en chaîne depuis l'URL ou le JSON ; rejette NaN.
export const numeric = z.preprocess(v => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v), z.number())
export const boolish = z.union([z.boolean(), z.literal(0), z.literal(1)]).transform(v => Boolean(v))

export const idParam = (event: H3Event, name = 'id'): number => {
  const raw = getRouterParam(event, name)
  const id = Number(raw)
  if (!raw || !Number.isInteger(id)) throw badRequest(`Invalid ${name}`)
  return id
}

export const queryNumber = (event: H3Event, name: string): number | undefined => {
  const raw = getQuery(event)[name]
  if (raw === undefined || raw === '' ) return undefined
  const value = Number(Array.isArray(raw) ? raw[0] : raw)
  if (!Number.isFinite(value)) throw badRequest(`Invalid ${name}`)
  return value
}

export const queryString = (event: H3Event, name: string): string | undefined => {
  const raw = getQuery(event)[name]
  if (raw === undefined) return undefined
  return String(Array.isArray(raw) ? raw[0] : raw)
}
