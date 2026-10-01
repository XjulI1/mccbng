import { and, eq, getTableColumns, sql, type SQL } from 'drizzle-orm'
import type { MySqlTable } from 'drizzle-orm/mysql-core'
import { getQuery, getRouterParam, setResponseStatus, type H3Event } from 'h3'
import type { ZodType } from 'zod'
import { getDb, type Db } from '../db/client'
import { notFound } from './errors'
import { parseFilter, parseWhere } from './filter'
import { idParam, parseBody } from './validate'

type Row = Record<string, any>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

export interface CrudResource {
  /** Segment d'URL : /api/<path> */
  path: string
  /** Libellé utilisé dans les messages 404 (« Compte 3 not found ») */
  label: string
  table: MySqlTable
  pk: string
  /** Scope appliqué aux lectures (liste, count, get) */
  readScope?: (event: H3Event) => Promise<SQL | undefined> | SQL | undefined
  /** Scope appliqué aux écritures (défaut : readScope) */
  writeScope?: (event: H3Event) => Promise<SQL | undefined> | SQL | undefined
  create: ZodType<Row>
  patch: ZodType<Row>
  /** Valeurs par défaut appliquées côté application (la base peut ne pas les porter) */
  defaults?: Row
  /** Champs imposés par le serveur à la création et au remplacement (ex. IDuser) */
  forced?: (event: H3Event) => Row
  /** Contrôles de propriété sur les références (IDcompte, IDcredit…) avant écriture */
  validate?: (event: H3Event, data: Row) => Promise<void>
  /** Colonnes conservées lors d'un PUT si le client ne les fournit pas (liens gérés par le serveur) */
  preserve?: string[]
  /** Relations disponibles via filter.include */
  relations?: Record<string, (rows: Row[]) => Promise<Row[]>>
  /** Remplace la création par défaut (cascades) */
  onCreate?: (event: H3Event, data: Row, tx: Tx) => Promise<Row>
  /** Vérifications / cascades avant suppression */
  onDelete?: (event: H3Event, existing: Row, tx: Tx) => Promise<void>
}

const col = (resource: CrudResource, name: string) => (getTableColumns(resource.table) as Record<string, any>)[name]

const scopeOf = async (resource: CrudResource, event: H3Event, write: boolean) =>
  await (write ? (resource.writeScope ?? resource.readScope) : resource.readScope)?.(event)

const combine = (...parts: (SQL | undefined)[]) => and(...parts.filter((p): p is SQL => !!p))

const withRelations = async (resource: CrudResource, rows: Row[], include: string[]) => {
  for (const name of include) rows = await resource.relations![name]!(rows)
  return rows
}

const findOwned = async (resource: CrudResource, event: H3Event, id: number, write: boolean): Promise<Row> => {
  const where = combine(eq(col(resource, resource.pk), id), await scopeOf(resource, event, write))
  const [row] = await getDb().select().from(resource.table).where(where).limit(1)
  if (!row) throw notFound(`${resource.label} ${id} not found`)
  return row as Row
}

// Dates / valeurs absentes lors d'un PUT : on remet la valeur par défaut applicative ou NULL.
const replacementValues = (resource: CrudResource, data: Row): Row => {
  const values: Row = {}
  for (const [name, column] of Object.entries(getTableColumns(resource.table))) {
    if (name === resource.pk) continue
    if (resource.preserve?.includes(name) && !(name in data)) continue
    values[name] = name in data ? data[name] : (resource.defaults?.[name] ?? ((column as any).notNull ? undefined : null))
  }
  return Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined))
}

const clean = (data: Row): Row => Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))

export const crudHandlers = {
  async list(resource: CrudResource, event: H3Event) {
    const filter = parseFilter(getQuery(event).filter, resource.table, { relations: Object.keys(resource.relations ?? {}) })
    const where = combine(filter.where, await scopeOf(resource, event, false))
    let query = getDb().select().from(resource.table).where(where).orderBy(...filter.orderBy).$dynamic()
    if (filter.limit !== undefined) query = query.limit(filter.limit)
    if (filter.offset !== undefined) {
      if (filter.limit === undefined) query = query.limit(Number.MAX_SAFE_INTEGER)
      query = query.offset(filter.offset)
    }
    return withRelations(resource, (await query) as Row[], filter.include)
  },

  async count(resource: CrudResource, event: H3Event) {
    const where = combine(parseWhere(getQuery(event).where, resource.table), await scopeOf(resource, event, false))
    const [row] = await getDb().select({ count: sql<number>`count(*)` }).from(resource.table).where(where)
    return { count: Number(row?.count ?? 0) }
  },

  async get(resource: CrudResource, event: H3Event) {
    const id = idParam(event)
    const filter = parseFilter(getQuery(event).filter, resource.table, { relations: Object.keys(resource.relations ?? {}) })
    const row = await findOwned(resource, event, id, false)
    const [withRel] = await withRelations(resource, [row], filter.include)
    return withRel
  },

  async create(resource: CrudResource, event: H3Event) {
    const parsed = await parseBody(event, resource.create)
    const data = { ...resource.defaults, ...clean(parsed), ...resource.forced?.(event) }
    await resource.validate?.(event, data)
    return getDb().transaction(async (tx) => {
      if (resource.onCreate) return resource.onCreate(event, data, tx)
      const [result] = await tx.insert(resource.table).values(data as never)
      // Comme LoopBack : l'entité renvoyée = données + défauts + clé générée (les colonnes NULL non fournies sont absentes)
      return { ...data, [resource.pk]: (result as unknown as { insertId: number }).insertId }
    })
  },

  async updateAll(resource: CrudResource, event: H3Event) {
    const data = clean(await parseBody(event, resource.patch))
    await resource.validate?.(event, data)
    const where = combine(parseWhere(getQuery(event).where, resource.table), await scopeOf(resource, event, true))
    if (!Object.keys(data).length) return { count: 0 }
    const [result] = await getDb().update(resource.table).set(data as never).where(where)
    return { count: (result as unknown as { affectedRows: number }).affectedRows }
  },

  async patchById(resource: CrudResource, event: H3Event) {
    const id = idParam(event)
    const data = clean(await parseBody(event, resource.patch))
    await findOwned(resource, event, id, true)
    await resource.validate?.(event, data)
    if (Object.keys(data).length) {
      await getDb().update(resource.table).set(data as never).where(eq(col(resource, resource.pk), id))
    }
    setResponseStatus(event, 204)
    return null
  },

  async replaceById(resource: CrudResource, event: H3Event) {
    const id = idParam(event)
    const parsed = await parseBody(event, resource.create)
    await findOwned(resource, event, id, true)
    const data = { ...resource.defaults, ...clean(parsed), ...resource.forced?.(event) }
    await resource.validate?.(event, data)
    await getDb().update(resource.table).set(replacementValues(resource, data) as never).where(eq(col(resource, resource.pk), id))
    setResponseStatus(event, 204)
    return null
  },

  async deleteById(resource: CrudResource, event: H3Event) {
    const id = idParam(event)
    const existing = await findOwned(resource, event, id, true)
    await getDb().transaction(async (tx) => {
      await resource.onDelete?.(event, existing, tx)
      await tx.delete(resource.table).where(eq(col(resource, resource.pk), id))
    })
    setResponseStatus(event, 204)
    return null
  }
}

export type CrudAction = keyof typeof crudHandlers

export const unknownResource = (name: string | undefined) => notFound(`Resource ${name ?? ''} not found`.trim())
export const routeResourceName = (event: H3Event) => getRouterParam(event, 'resource')
