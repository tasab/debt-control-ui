import { api } from './client.ts'

// One module per area of the contract (SERVER_PLAN §2.2). These are thin by
// design: no reshaping, no computation — whatever the server sends is what the
// hooks cache and the components render.

export const auth = {
  register: (body) => api.post('/auth/register', body),
  login: (body) => api.post('/auth/login', body),
  logout: () => api.post('/auth/logout'),
  // Returns null when signed out instead of throwing — see client.js.
  me: () => api.get('/auth/me', undefined, { allowUnauthorized: true }),
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
  // Своє поповнення: рахунок береться із сесії, чужий назвати нема як.
  topUpSelf: (body, options) => api.post('/topups', body, options),
}

export const fx = {
  rates: () => api.get('/fx/rates'),
  setRate: (body) => api.put('/fx/rates', body),
  quote: (body) => api.post('/fx/quote', body),
  execute: (body, options) => api.post('/fx/execute', body, options),
}

export const business = {
  create: (body) => api.post('/businesses', body),
  me: () => api.get('/businesses/me'),
  // `in` — тільки валюта показу; сервер перераховує на льоту й нічого не пише.
  dashboard: (params) => api.get('/businesses/me/dashboard', params),
  profile: (id) => api.get(`/businesses/${id}`),
  setStartingCapital: (body) => api.put('/businesses/me/starting-capital', body),
  registers: () => api.get('/businesses/me/registers'),
  createRegister: (body) => api.post('/businesses/me/registers', body),
  updateRegister: (id, body) => api.patch(`/businesses/me/registers/${id}`, body),
  deleteRegister: (id) => api.del(`/businesses/me/registers/${id}`),
  move: (body, options) => api.post('/businesses/me/transfers', body, options),
  countSheet: () => api.get('/businesses/me/count-sheet'),
  cashCounts: () => api.get('/businesses/me/cash-counts'),
  countCash: (body, options) => api.post('/businesses/me/cash-counts', body, options),
  reverseCashCount: (id) => api.post(`/businesses/me/cash-counts/${id}/reverse`),
  spend: (body, options) => api.post('/businesses/me/spending', body, options),
  monthly: (params) => api.get('/businesses/me/monthly', params),
  history: () => api.get('/businesses/me/history'),
  // Учасники — сторона власника.
  members: () => api.get('/businesses/me/members'),
  invite: (body) => api.post('/businesses/me/members', body),
  endMembership: (id) => api.del(`/businesses/me/members/${id}`),
  hideMember: (id) => api.post(`/businesses/me/members/${id}/hide`),
  setMemberRate: (id, body) => api.put(`/businesses/me/members/${id}/rate`, body),
  contributions: () => api.get('/businesses/me/contributions'),
}

// Учасники — сторона інвестора: свої вклади в чужому бізнесі.
export const memberships = {
  list: () => api.get('/memberships'),
  accept: (id, body) => api.post(`/memberships/${id}/accept`, body),
  decline: (id) => api.post(`/memberships/${id}/decline`),
  withdraw: (id, body, options) => api.post(`/memberships/${id}/withdrawals`, body, options),
  transfer: (id, body, options) => api.post(`/memberships/${id}/transfers`, body, options),
}

export const admin = {
  users: (params) => api.get('/admin/users', params),
  adjustments: (id) => api.get(`/admin/users/${id}/adjustments`),
  deleteUser: (id, force) => api.del(`/admin/users/${id}${force ? '?force=true' : ''}`),
  // «Редагування рахунку» — це проведення в журналі, а не UPDATE балансу.
  adjust: (id, body, options) => api.post(`/admin/users/${id}/adjustments`, body, options),
  topUp: (body, options) => api.post('/admin/topups', body, options),
}

/**
 * Публічні посилання на баланс.
 *
 * `view` — єдиний виклик у цьому файлі без сесії: сторінку відкриває той, у
 * кого немає акаунта, і 401 тут означав би не «увійдіть», а «посилання не
 * працює». `allowUnauthorized` не дає глобальному обробнику викинути гостя на
 * форму входу.
 */
export const shares = {
  list: () => api.get('/shares'),
  create: (body) => api.post('/shares', body),
  revoke: (id) => api.del(`/shares/${id}`),
  view: (token) => api.get(`/shares/${token}/balance`, undefined, { allowUnauthorized: true }),
}

export const stats = {
  summary: () => api.get('/stats/summary'),
  balanceHistory: (params) => api.get('/stats/balance-history', params),
  exportCsv: () => api.text('/stats/export.csv'),
}
