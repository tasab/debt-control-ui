/**
 * The single fetch wrapper. Everything the app talks to the server through
 * goes here, so cookies, idempotency and error shape are handled once.
 */

const BASE = '/api'

export interface ApiErrorPayload {
  code?: string
  message?: string
  fields?: Record<string, string> | null
}

/** Errors from the server always arrive as { error: { code, message, fields } }. */
export class ApiError extends Error {
  code: string
  fields: Record<string, string> | null
  status: number

  constructor({ code, message, fields }: ApiErrorPayload, status: number) {
    super(message || 'Щось пішло не так')
    this.name = 'ApiError'
    this.code = code ?? 'UNKNOWN'
    this.fields = fields ?? null
    this.status = status
  }
}

// Set by AuthProvider so a 401 anywhere lands the user on the login screen
// instead of leaving a half-rendered page behind a spinner.
let onUnauthorized: () => void = () => {}
export const setUnauthorizedHandler = (handler: () => void) => {
  onUnauthorized = handler
}

type QueryParams = Record<string, string | number | boolean | undefined | null>

interface RequestOptions {
  body?: unknown
  params?: QueryParams
  headers?: Record<string, string>
  raw?: boolean
  allowUnauthorized?: boolean
}

async function request<T>(
  method: string,
  path: string,
  { body, params, headers = {}, raw = false, allowUnauthorized = false }: RequestOptions = {},
): Promise<T> {
  const url = new URL(`${BASE}${path}`, window.location.origin)
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }

  const isMutation = method !== 'GET'
  const response = await fetch(url, {
    method,
    // The session lives in an httpOnly cookie; it must ride along.
    credentials: 'include',
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      // Every mutation carries a key, so a double-click or a retry after a
      // dropped connection cannot post twice (SERVER_PLAN §2.1).
      ...(isMutation ? { 'idempotency-key': crypto.randomUUID() } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (response.status === 401) {
    // The session probe (`GET /auth/me`) asks a question whose answer may
    // legitimately be "nobody" — it must not trigger the global sign-out, or
    // the handler invalidates the probe, which refetches, which 401s again.
    if (allowUnauthorized) return null as T
    onUnauthorized()
    throw new ApiError({ code: 'UNAUTHORIZED', message: 'Сесія завершилась' }, 401)
  }

  if (!response.ok) {
    let payload: { error?: ApiErrorPayload } = {}
    try {
      payload = (await response.json()) as { error?: ApiErrorPayload }
    } catch {
      payload = {}
    }
    throw new ApiError(payload.error ?? { message: response.statusText }, response.status)
  }

  if (raw) return (await response.text()) as T
  if (response.status === 204) return null as T
  return (await response.json()) as T
}

export const api = {
  get: <T>(path: string, params?: QueryParams, options?: RequestOptions) =>
    request<T>('GET', path, { params, ...options }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, { body, ...options }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  del: <T>(path: string) => request<T>('DELETE', path),
  text: (path: string, params?: QueryParams) => request<string>('GET', path, { params, raw: true }),
}

/**
 * Retrying a mutation must reuse the original key, otherwise the retry is a new
 * operation. Callers that own a retry (the fund dialog, transfer confirm) pass
 * a key they keep for the lifetime of the attempt.
 */
export const withKey = (key: string) => ({ headers: { 'idempotency-key': key } })
