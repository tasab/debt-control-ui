import { http, HttpResponse } from 'msw'
import * as fixtures from './fixtures.ts'

const api = (path) => `/api${path}`

/** Error shape from SERVER_PLAN §2.4 — the client renders it, so mock it exactly. */
const fail = (status, code, message, fields = null) =>
  HttpResponse.json({ error: { code, message, fields } }, { status })

/**
 * Handlers cover the happy path AND the error codes the UI is expected to
 * handle. Mocking only success is how error states end up written blind and
 * rewritten later (CLIENT_PLAN §2).
 *
 * Add `?mock=<code>` to any request to force its failure mode.
 */
export const handlers = [
  http.get(api('/auth/me'), () => HttpResponse.json(fixtures.me)),
  http.post(api('/auth/login'), () => HttpResponse.json(fixtures.me)),
  http.post(api('/auth/register'), () => HttpResponse.json(fixtures.me, { status: 201 })),
  http.post(api('/auth/logout'), () => HttpResponse.json({ ok: true })),

  http.get(api('/currencies'), () => HttpResponse.json(fixtures.currencies)),
  http.get(api('/wallets'), () => HttpResponse.json(fixtures.wallets)),
  http.get(api('/transactions'), () => HttpResponse.json(fixtures.transactions)),
  http.get(api('/stats/summary'), () => HttpResponse.json(fixtures.summary)),

  http.get(api('/users/search'), ({ request }) => {
    const query = new URL(request.url).searchParams.get('q') ?? ''
    return HttpResponse.json(
      [
        { id: 'usr_maria', displayName: 'Марія Підприємець', hint: 'ma••••••@debt.local' },
        { id: 'usr_petro', displayName: 'Петро Інвестор', hint: 'pe••••@debt.local' },
      ].filter((user) => user.displayName.toLowerCase().includes(query.toLowerCase())),
    )
  }),

  http.get(api('/fees/preview'), ({ request }) => {
    const amount = BigInt(new URL(request.url).searchParams.get('amount') ?? '0')
    // 0.5%, min 1.00, max 50.00 — mirrors the seeded policy.
    let fee = (amount * 50n + 9999n) / 10000n
    if (fee < 100n) fee = 100n
    if (fee > 5000n) fee = 5000n
    return HttpResponse.json({
      amount: amount.toString(),
      fee: fee.toString(),
      total: (amount + fee).toString(),
      received: amount.toString(),
      payer: 'sender',
    })
  }),

  http.post(api('/transfers'), async ({ request }) => {
    const body = await request.json()
    if (BigInt(body.amount) > 48_750_000n) {
      return fail(409, 'INSUFFICIENT_FUNDS', 'Недостатньо коштів', {
        amount: 'максимум 487 500,00 UAH',
      })
    }
    return HttpResponse.json({ transactionId: 'txn_new', fee: '500' }, { status: 201 })
  }),

  http.get(api('/fx/rates'), () => HttpResponse.json(fixtures.rates)),

  http.post(api('/fx/quote'), async ({ request }) => {
    const body = await request.json()
    const amountFrom = BigInt(body.amountFrom)
    // UAH → USD at the SELL side, floored, exactly as fx/service.js does it.
    const amountTo = (amountFrom * 1_000_000n) / 42_100_000n
    return HttpResponse.json({
      quoteId: 'fxq_1',
      from: body.from,
      to: body.to,
      amountFrom: amountFrom.toString(),
      amountTo: amountTo.toString(),
      rate: '42.100000',
      side: 'sell',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    })
  }),

  http.post(api('/fx/execute'), ({ request }) => {
    if (new URL(request.url).searchParams.get('mock') === 'expired') {
      return fail(409, 'QUOTE_EXPIRED', 'Курс протух, оновіть котирування')
    }
    return HttpResponse.json({ transactionId: 'txn_fx' }, { status: 201 })
  }),

  http.get(api('/businesses/me'), () => fail(404, 'NOT_FOUND', 'Бізнес-профіль не знайдено')),
  http.get(api('/stats/balance-history'), () => HttpResponse.json([])),

  http.get(api('/admin/users'), () => HttpResponse.json(fixtures.adminUsers)),
  http.get(api('/admin/users/:id/adjustments'), () => HttpResponse.json(fixtures.adminAdjustments)),
  http.post(api('/admin/users/:id/adjustments'), async ({ request }) => {
    const body = await request.json()
    if (body.mode === 'debit' && body.amount > '100000000') {
      return fail(409, 'INSUFFICIENT_FUNDS', 'Недостатньо коштів', {
        amount: 'недостатньо UAH на рахунку',
      })
    }
    return HttpResponse.json(
      { transactionId: 'txn_adj_new', before: '0', after: body.amount, delta: body.amount },
      { status: 201 },
    )
  }),
]
