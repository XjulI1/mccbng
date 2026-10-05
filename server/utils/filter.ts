import {
  and, asc, between, desc, eq, getTableColumns, gt, gte, inArray, isNull, lt, lte, ne, not, notInArray, or, sql,
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

// `\` échappe `%`, `_` et `\` dans le motif (l'appelant échappe le terme saisi avant d'ajouter ses jokers).
// Suppose le mode SQL NO_BACKSLASH_ESCAPES désactivé, comme l'interpolation des paramètres de mysql2.
const ESCAPE = sql.raw(String.raw`ESCAPE '\\'`)

const likePattern = (col: AnyColumn, operand: unknown, negate: boolean): SQL => {
  if (col.dataType !== 'string') throw badRequest(`Invalid filter: "${negate ? 'nlike' : 'like'}" requires a text property`)
  return negate
    ? sql`${col} NOT LIKE ${String(operand)} ${ESCAPE}`
    : sql`${col} LIKE ${String(operand)} ${ESCAPE}`
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
      case 'like': parts.push(likePattern(col, operand, false)); break
      case 'nlike': parts.push(likePattern(col, operand, true)); break
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

// La clé primaire `pk`, si fournie, départage les ex aequo (pagination déterministe) : même sens que le dernier
// critère demandé, ASC sans tri demandé.
const buildOrder = (cols: Columns, order: unknown, pk?: string): SQL[] => {
  const items = order === undefined || order === null
    ? []
    : (Array.isArray(order) ? order : [order]).flatMap(o => String(o).split(',')).map(item => item.trim()).filter(Boolean)
  const criteria = items.map((item) => {
    const [name, dir = 'ASC', ...rest] = item.split(/\s+/)
    if (rest.length || !/^(asc|desc)$/i.test(dir)) throw badRequest(`Invalid filter: bad order "${item}"`)
    return { name: name!, col: column(cols, name!), desc: dir.toUpperCase() === 'DESC' }
  })
  if (pk && !criteria.some(c => c.name === pk)) criteria.push({ name: pk, col: column(cols, pk), desc: criteria.at(-1)?.desc ?? false })
  return criteria.map(c => (c.desc ? desc(c.col) : asc(c.col)))
}

const toInt = (value: unknown, name: string): number | undefined => {
  if (value === undefined || value === null) return undefined
  const n = Number(value)
  if (!Number.isInteger(n) || n < 0) throw badRequest(`Invalid filter: "${name}" must be a non-negative integer`)
  return n
}

// Interprète le paramètre `filter` de style LoopBack (where/order/limit/skip/offset/include) avec liste blanche de colonnes.
// `pk` : clé primaire ajoutée en dernier critère de tri.
export const parseFilter = (
  raw: unknown,
  table: MySqlTable,
  options: { maxLimit?: number; relations?: string[]; pk?: string } = {}
): ParsedFilter => {
  const cols = getTableColumns(table) as Columns
  const filter = parseJson(raw, 'filter')
  if (filter === undefined) return { orderBy: buildOrder(cols, undefined, options.pk), include: [] }
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
    orderBy: buildOrder(cols, filter.order, options.pk),
    limit: limit === undefined ? undefined : Math.min(limit, options.maxLimit ?? DEFAULT_MAX_LIMIT),
    offset: toInt(filter.skip ?? filter.offset, 'skip'),
    include
  }
}

// Paramètre `where` seul (count, PATCH en masse).
export const parseWhere = (raw: unknown, table: MySqlTable): SQL | undefined =>
  buildWhere(getTableColumns(table) as Columns, parseJson(raw, 'where'))
