// Thin fetch wrappers over the server API. The Vite dev proxy forwards '/api'
// to the Fastify server (see vite.config.js), so no host is hardcoded here.

const BASE = '/api'

async function request(path, options) {
  const res = await fetch(BASE + path, options)
  if (!res.ok) {
    // Surface the server's validation errors (Phase S2) to the caller.
    let body
    try {
      body = await res.json()
    } catch {
      body = null
    }
    const detail = body?.errors?.length
      ? body.errors.join('; ')
      : body?.message || res.statusText
    throw new Error(detail)
  }
  if (res.status === 204) return null
  return res.json()
}

export const fetchSnapshots = () => request('/snapshots')

export const fetchSnapshot = (date) => request(`/snapshots/${date}`)

export const putSnapshot = (snapshot) =>
  request(`/snapshots/${snapshot.date}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(snapshot),
  })

export const deleteSnapshotRequest = (date) =>
  request(`/snapshots/${date}`, { method: 'DELETE' })

// People roster
export const fetchPeople = () => request('/people')

export const fetchPersonHistory = (id) => request(`/people/${id}/history`)

export const createPersonRequest = (name) =>
  request('/people', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name }),
  })

export const updatePersonRequest = (id, name) =>
  request(`/people/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name }),
  })

export const deletePersonRequest = (id) =>
  request(`/people/${id}`, { method: 'DELETE' })

// Currencies
export const fetchCurrencies = () => request('/currencies')

export const createCurrencyRequest = (code, name) =>
  request('/currencies', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code, name }),
  })

// Audit log
export const fetchAudit = (params = {}) => {
  const qs = new URLSearchParams()
  if (params.date) qs.set('date', params.date)
  if (params.limit) qs.set('limit', String(params.limit))
  const suffix = qs.toString() ? `?${qs}` : ''
  return request(`/audit${suffix}`)
}
