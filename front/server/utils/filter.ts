import {
  and, asc, between, desc, eq, getTableColumns, gt, gte, inArray, isNull, like, lt, lte, ne, not, notInArray, or, sql,
  type AnyColumn, type SQL
} from 'drizzle-orm'
import type { MySqlTable } from 'drizzle-orm/mysql-core'
import { badRequest } from './errors'

export interface ParsedFilter {
  where?: SQL
  orderBy: SQL[]
  limit?: number
  offset?: number
  include: string[]
}

const MAX_FILTER_LENGTH = 32_000
export const DEFAULT_MAX_LIMIT = 1000
const MAX_DEPTH = 6
const MAX_ITEMS = 500

type Columns = Record<string, AnyColumn>

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Date)

const parseJson = (raw: unknown, what: string): unknown => {
  if (raw === undefined || raw === null || raw === '') return undefined
  if (typeof raw !== 'string') return raw
  if (raw.length > MAX_FILTER_LENGTH) throw badRequest(`${what} is too large`)
  try {
    return JSON.parse(raw)
  } catch {
    throw badRequest(`Invalid JSON in ${what}`)
  }
}

const column = (cols: Columns, name: string): AnyColumn => {
  if (!Object.prototype.hasOwnProperty.call(cols, name)) throw badRequest(`Invalid filter: unknown property "${name}"`)
  return cols[name]!
}

// Valeur JSON -> valeur acceptée par la colonne (les colonnes datetime attendent des Date)
const coerce = (col: AnyColumn, value: unknown): unknown => {
  if (value === null || value === undefined) return value
  if (col.dataType === 'date' && (typeof value === 'string' || typeof value === 'number')) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) throw badRequest('Invalid filter: invalid date')
    return date
  }
  if (col.dataType === 'boolean' && (value === 0 || value === 1)) return Boolean(value)
  return value
}

const asArray = (value: unknown, op: string): unknown[] => {
  if (!Array.isArray(value) || value.length > MAX_ITEMS) throw badRequest(`Invalid filter: "${op}" expects a bounded array`)
  return value
}

const condition = (col: AnyColumn, spec: unknown): SQL => {
  if (spec === null) return isNull(col)
  if (!isPlainObject(spec)) return eq(col, coerce(col, spec) as never)
  const parts: SQL[] = []
  for (const [op, operand] of Object.entries(spec)) {
    switch (op) {
      case 'eq': parts.push(operand === null ? isNull(col) : eq(col, coerce(col, operand) as never)); break
      case 'neq': parts.push(operand === null ? not(isNull(col)) : ne(col, coerce(col, operand) as never)); break
      case 'gt': parts.push(gt(col, coerce(col, operand) as never)); break
      case 'gte': parts.push(gte(col, coerce(col, operand) as never)); break
      case 'lt': parts.push(lt(col, coerce(col, operand) as never)); break
      case 'lte': parts.push(lte(col, coerce(col, operand) as never)); break
      case 'like': parts.push(like(col, String(operand))); break
      case 'nlike': parts.push(sql`${col} NOT LIKE ${String(operand)}`); break
      case 'inq': {
        const list = asArray(operand, op).map(v => coerce(col, v))
        // inq [] : aucune ligne (équivalent LoopBack)
        parts.push(list.length ? inArray(col, list as never[]) : sql`1 = 0`)
        break
      }
      case 'nin': {
        const list = asArray(operand, op).map(v => coerce(col, v))
        if (list.length) parts.push(notInArray(col, list as never[]))
        break
      }
      case 'between': {
        const [a, b] = asArray(operand, op)
        parts.push(between(col, coerce(col, a) as never, coerce(col, b) as never))
        break
      }
      default: throw badRequest(`Invalid filter: unsupported operator "${op}"`)
    }
  }
  return and(...parts) ?? sql`1 = 1`
}

const buildWhere = (cols: Columns, where: unknown, depth = 0): SQL | undefined => {
  if (where === undefined || where === null) return undefined
  if (!isPlainObject(where)) throw badRequest('Invalid filter: "where" must be an object')
  if (depth > MAX_DEPTH) throw badRequest('Invalid filter: "where" is nested too deeply')
  const parts: SQL[] = []
  for (const [key, value] of Object.entries(where)) {
    if (key === 'and' || key === 'or') {
      const items = asArray(value, key).map(item => buildWhere(cols, item, depth + 1)).filter((s): s is SQL => !!s)
      if (!items.length) continue
      parts.push((key === 'and' ? and(...items) : or(...items))!)
    } else {
      parts.push(condition(column(cols, key), value))
    }
  }
  return parts.length ? and(...parts) : undefined
}

const buildOrder = (cols: Columns, order: unknown): SQL[] => {
  if (order === undefined || order === null) return []
  const items = (Array.isArray(order) ? order : [order]).flatMap(o => String(o).split(','))
  return items.map(item => item.trim()).filter(Boolean).map((item) => {
    const [name, dir = 'ASC', ...rest] = item.split(/\s+/)
    if (rest.length || !/^(asc|desc)$/i.test(dir)) throw badRequest(`Invalid filter: bad order "${item}"`)
    const col = column(cols, name!)
    return dir.toUpperCase() === 'DESC' ? desc(col) : asc(col)
  })
}

const toInt = (value: unknown, name: string): number | undefined => {
  if (value === undefined || value === null) return undefined
  const n = Number(value)
  if (!Number.isInteger(n) || n < 0) throw badRequest(`Invalid filter: "${name}" must be a non-negative integer`)
  return n
}

// Interprète le paramètre `filter` de style LoopBack (where/order/limit/skip/offset/include) avec liste blanche de colonnes.
export const parseFilter = (raw: unknown, table: MySqlTable, options: { maxLimit?: number; relations?: string[] } = {}): ParsedFilter => {
  const cols = getTableColumns(table) as Columns
  const filter = parseJson(raw, 'filter')
  if (filter === undefined) return { orderBy: [], include: [] }
  if (!isPlainObject(filter)) throw badRequest('Invalid filter: must be an object')

  const include: string[] = []
  if (filter.include !== undefined) {
    const items = Array.isArray(filter.include) ? filter.include : [filter.include]
    for (const item of items) {
      const relation = typeof item === 'string' ? item : isPlainObject(item) ? String(item.relation) : ''
      if (!options.relations?.includes(relation)) throw badRequest(`Invalid filter: unknown relation "${relation}"`)
      include.push(relation)
    }
  }

  const limit = toInt(filter.limit, 'limit')
  return {
    where: buildWhere(cols, filter.where),
    orderBy: buildOrder(cols, filter.order),
    limit: limit === undefined ? undefined : Math.min(limit, options.maxLimit ?? DEFAULT_MAX_LIMIT),
    offset: toInt(filter.skip ?? filter.offset, 'skip'),
    include
  }
}

// Paramètre `where` seul (count, PATCH en masse).
export const parseWhere = (raw: unknown, table: MySqlTable): SQL | undefined =>
  buildWhere(getTableColumns(table) as Columns, parseJson(raw, 'where'))
