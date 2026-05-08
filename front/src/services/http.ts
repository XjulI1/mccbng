type Params = Record<string, unknown>

export interface ApiOptions {
  token?: string
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
  const headers: Record<string, string> = {}
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`

  let body: BodyInit | undefined
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opts.body)
  }

  const response = await fetch(url + buildQueryString(opts.params), {
    method,
    headers,
    body
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
