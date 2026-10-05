import { randomInt } from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { createConnection, type Connection } from 'mysql2/promise'
import { inject } from 'vitest'

export const ctx = () => inject('api')

export interface ApiResponse<T = any> {
  status: number
  body: T
  headers: Headers
}

export const request = async <T = any>(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown; query?: Record<string, unknown>; headers?: Record<string, string> } = {}
): Promise<ApiResponse<T>> => {
  const url = new URL(path, ctx().baseUrl)
  for (const [key, value] of Object.entries(opts.query ?? {})) {
    url.searchParams.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
  }
  // Session par cookie HttpOnly (comme le navigateur) + en-tête anti-CSRF exigé sur les méthodes non sûres
  const headers: Record<string, string> = { 'X-Requested-With': 'mccbng', ...opts.headers }
  if (opts.token) headers.Cookie = `mccbngAuth=${opts.token}`
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  const response = await fetch(url, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) })
  const text = await response.text()
  let body: any = text
  try { body = text ? JSON.parse(text) : undefined } catch { /* corps non JSON */ }
  return { status: response.status, body, headers: response.headers }
}

export const get = <T = any>(path: string, token?: string, query?: Record<string, unknown>) => request<T>('GET', path, { token, query })
export const post = <T = any>(path: string, token: string | undefined, body?: unknown) => request<T>('POST', path, { token, body })
export const patch = <T = any>(path: string, token: string | undefined, body?: unknown, query?: Record<string, unknown>) => request<T>('PATCH', path, { token, body, query })
export const put = <T = any>(path: string, token: string | undefined, body?: unknown) => request<T>('PUT', path, { token, body })
export const del = <T = any>(path: string, token: string | undefined) => request<T>('DELETE', path, { token })

let connection: Connection | undefined
export const sql = async <T = any>(query: string, params: unknown[] = []): Promise<T[]> => {
  connection ??= await createConnection({ ...ctx().db, timezone: 'Z', decimalNumbers: true })
  const [rows] = await connection.query(query, params)
  return rows as T[]
}

export interface TestUser {
  IDuser: number
  email: string
  code: string
  token: string
}

// Chaque fichier de test charge ce module séparément : base aléatoire pour éviter les collisions d IDuser/email
let nextUser = 1000 + randomInt(100_000_000)
export const signToken = (user: { IDuser: number; email: string }, options: jwt.SignOptions = {}, tv = 0) =>
  jwt.sign({ name: 'test', email: user.email, IDuser: user.IDuser, tv }, ctx().jwtSecret, {
    algorithm: 'HS256', issuer: 'mccbng', audience: 'mccbng', expiresIn: 3600, ...options
  })

// Insère un utilisateur et fournit directement un JWT valide (évite de consommer le rate-limit du login).
export const createUser = async (overrides: Partial<{ code: string; plaintext: boolean }> = {}): Promise<TestUser> => {
  const IDuser = nextUser++
  const email = `user${IDuser}@example.test`
  const code = overrides.code ?? 'abc123'
  const secret = overrides.plaintext ? code : await bcrypt.hash(code, 4)
  await sql('INSERT INTO `User` (IDuser, email, username, secret_key) VALUES (?, ?, ?, ?)', [IDuser, email, `user${IDuser}`, secret])
  return { IDuser, email, code, token: signToken({ IDuser, email }) }
}

export const createBanque = async (token: string, name = 'Banque test') => (await post('/api/banques', token, { NomBanque: name })).body

export const createCompte = async (user: TestUser, overrides: Record<string, unknown> = {}) => {
  const res = await post('/api/comptes', user.token, { NomCompte: 'Compte', solde: 0, ...overrides })
  if (res.status !== 200) throw new Error(`createCompte: ${res.status} ${JSON.stringify(res.body)}`)
  return res.body
}

export const createCategorie = async (user: TestUser, Nom: string, Type: 'depense' | 'revenu' | 'transfert' = 'depense') => {
  const res = await post('/api/categories', user.token, { Nom, Type })
  if (res.status !== 200) throw new Error(`createCategorie: ${res.status} ${JSON.stringify(res.body)}`)
  return res.body
}

export const createOperation = async (user: TestUser, IDcompte: number, overrides: Record<string, unknown> = {}) => {
  const res = await post('/api/operations', user.token, {
    NomOp: 'Op', MontantOp: -10, DateOp: '2024-03-15T00:00:00.000Z', IDcompte, ...overrides
  })
  if (res.status !== 200) throw new Error(`createOperation: ${res.status} ${JSON.stringify(res.body)}`)
  return res.body
}
