type Params = Record<string, unknown>

export interface ApiOptions {
  /** @deprecated ignoré : la session est portée par le cookie HttpOnly mccbngAuth, envoyé automatiquement */
  token?: unknown
  params?: Params
}

const buildQueryString = (params?: Params): string => {
  if (!params) return ''
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    search.append(
      key,
      typeof value === 'object' ? JSON.stringify(value) : String(value)
    )
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

const request = async <T>(
  method: string,
  url: string,
  opts: ApiOptions & { body?: unknown } = {}
): Promise<T> => {
  // X-Requested-With : exigé par le serveur sur les méthodes non sûres (protection CSRF)
  const headers: Record<string, string> = { 'X-Requested-With': 'mccbng' }

  let body: BodyInit | undefined
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opts.body)
  }

  const response = await fetch(url + buildQueryString(opts.params), {
    method,
    headers,
    body,
    credentials: 'same-origin'
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`)
  }

  if (response.status === 204) return undefined as T

  const text = await response.text()
  if (!text) return undefined as T

  try {
    return JSON.parse(text) as T
  } catch {
    return text as unknown as T
  }
}

export const apiGet = <T = any>(url: string, opts?: ApiOptions) =>
  request<T>('GET', url, opts)

export const apiPost = <T = any>(
  url: string,
  body?: unknown,
  opts?: ApiOptions
) => request<T>('POST', url, { ...opts, body })

export const apiPut = <T = any>(
  url: string,
  body?: unknown,
  opts?: ApiOptions
) => request<T>('PUT', url, { ...opts, body })

export const apiPatch = <T = any>(
  url: string,
  body?: unknown,
  opts?: ApiOptions
) => request<T>('PATCH', url, { ...opts, body })

export const apiDelete = <T = any>(url: string, opts?: ApiOptions) =>
  request<T>('DELETE', url, opts)
