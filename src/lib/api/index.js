import { api } from './client.js'

// One module per area of the contract (SERVER_PLAN §2.2). These are thin by
// design: no reshaping, no computation — whatever the server sends is what the
// hooks cache and the components render.

export const auth = {
  register: (body) => api.post('/auth/register', body),
  login: (body) => api.post('/auth/login', body),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  searchUsers: (q) => api.get('/users/search', { q }),
}

export const wallets = {
  list: () => api.get('/wallets'),
  currencies: () => api.get('/currencies'),
  transactions: (params) => api.get('/transactions', params),
  transaction: (id) => api.get(`/transactions/${id}`),
}

export const transfers = {
  create: (body, options) => api.post('/transfers', body, options),
  feePreview: (params) => api.get('/fees/preview', params),
}

export const fx = {
  rates: () => api.get('/fx/rates'),
  quote: (body) => api.post('/fx/quote', body),
  execute: (body, options) => api.post('/fx/execute', body, options),
}

export const business = {
  create: (body) => api.post('/businesses', body),
  me: () => api.get('/businesses/me'),
  dashboard: () => api.get('/businesses/me/dashboard'),
  profile: (id) => api.get(`/businesses/${id}`),
  setStartingCapital: (body) => api.put('/businesses/me/starting-capital', body),
  registers: () => api.get('/businesses/me/registers'),
  createRegister: (body) => api.post('/businesses/me/registers', body),
  updateRegister: (id, body) => api.patch(`/businesses/me/registers/${id}`, body),
  deleteRegister: (id) => api.del(`/businesses/me/registers/${id}`),
  move: (body, options) => api.post('/businesses/me/transfers', body, options),
}

export const requests = {
  list: (params) => api.get('/funding-requests', params),
  get: (id) => api.get(`/funding-requests/${id}`),
  create: (body) => api.post('/funding-requests', body),
  cancel: (id) => api.post(`/funding-requests/${id}/cancel`),
  fund: (id, body, options) => api.post(`/funding-requests/${id}/fundings`, body, options),
  cancelFunding: (fundingId) => api.del(`/fundings/${fundingId}`),
}

export const loans = {
  list: (params) => api.get('/loans', params),
  get: (id) => api.get(`/loans/${id}`),
  repay: (id, body, options) => api.post(`/loans/${id}/repay`, body, options),
}

export const stats = {
  summary: () => api.get('/stats/summary'),
  balanceHistory: (params) => api.get('/stats/balance-history', params),
  portfolio: () => api.get('/portfolio'),
  exportCsv: () => api.text('/stats/export.csv'),
}
