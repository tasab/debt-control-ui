/**
 * The single fetch wrapper. Everything the app talks to the server through
 * goes here, so cookies, idempotency and error shape are handled once.
 */

const BASE = '/api'

/** Errors from the server always arrive as { error: { code, message, fields } }. */
export class ApiError extends Error {
  constructor({ code, message, fields }, status) {
    super(message || 'Щось пішло не так')
    this.name = 'ApiError'
    this.code = code ?? 'UNKNOWN'
    this.fields = fields ?? null
    this.status = status
  }
}

// Set by AuthProvider so a 401 anywhere lands the user on the login screen
// instead of leaving a half-rendered page behind a spinner.
let onUnauthorized = () => {}
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler
}

async function request(method, path, { body, params, headers = {}, raw = false } = {}) {
  const url = new URL(`${BASE}${path}`, window.location.origin)
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value)
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
    onUnauthorized()
    throw new ApiError({ code: 'UNAUTHORIZED', message: 'Сесія завершилась' }, 401)
  }

  if (!response.ok) {
    let payload = {}
    try {
      payload = await response.json()
    } catch {
      payload = {}
    }
    throw new ApiError(payload.error ?? { message: response.statusText }, response.status)
  }

  if (raw) return response.text()
  if (response.status === 204) return null
  return response.json()
}

export const api = {
  get: (path, params) => request('GET', path, { params }),
  post: (path, body, options) => request('POST', path, { body, ...options }),
  put: (path, body) => request('PUT', path, { body }),
  patch: (path, body) => request('PATCH', path, { body }),
  del: (path) => request('DELETE', path),
  text: (path, params) => request('GET', path, { params, raw: true }),
}

/**
 * Retrying a mutation must reuse the original key, otherwise the retry is a new
 * operation. Callers that own a retry (the fund dialog, transfer confirm) pass
 * a key they keep for the lifetime of the attempt.
 */
export const withKey = (key) => ({ headers: { 'idempotency-key': key } })
