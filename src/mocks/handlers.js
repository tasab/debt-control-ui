import { http, HttpResponse } from 'msw'
import * as fixtures from './fixtures.js'

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

  http.get(api('/funding-requests'), () => HttpResponse.json(fixtures.requests)),

  http.get(api('/funding-requests/:id'), ({ params }) => {
    const request = fixtures.requests.items.find((item) => item.id === params.id)
    if (!request) return fail(404, 'NOT_FOUND', 'Заявку не знайдено')
    return HttpResponse.json({
      ...request,
      investors: [
        { id: 'fnd_1', name: 'Петро Інвестор', amount: '20000000', createdAt: '2026-07-19T10:00:00Z', isMe: false },
        { id: 'fnd_2', name: 'Ірина', amount: '11000000', createdAt: '2026-07-20T10:00:00Z', isMe: false },
      ],
      myFunding: null,
    })
  }),

  http.post(api('/funding-requests/:id/fundings'), async ({ request }) => {
    const body = await request.json()
    const amount = BigInt(body.amount)
    if (amount < 1_000_000n) {
      return fail(409, 'BELOW_MIN_TICKET', 'Сума менша за мінімальний внесок', {
        amount: 'мінімум 10 000,00 UAH',
      })
    }
    if (amount > 19_000_000n) {
      return fail(409, 'OVERFUNDED', 'Сума перевищує залишок заявки', {
        amount: 'залишилось 190 000,00 UAH',
      })
    }
    return HttpResponse.json({ fundingId: 'fnd_new', held: body.amount, filled: false }, { status: 201 })
  }),

  http.get(api('/businesses/me'), () => fail(404, 'NOT_FOUND', 'Бізнес-профіль не знайдено')),
  http.get(api('/loans'), () => HttpResponse.json({ items: [] })),
  http.get(api('/portfolio'), () =>
    HttpResponse.json({
      baseCurrency: 'UAH',
      activePrincipal: '15000000',
      totalDeployed: '15000000',
      interestReceived: '320000',
      feesPaid: '32000',
      principalReturned: '0',
      netInterest: '288000',
      weightedRateBps: 1800,
      positionCount: 1,
      overdueCount: 0,
      defaultedCount: 0,
      distribution: [
        { businessId: 'biz_1', name: 'Кав’ярня «Друга Хвиля»', amount: '15000000', shareBps: 10000 },
      ],
      concentrationWarning: {
        businessId: 'biz_1',
        name: 'Кав’ярня «Друга Хвиля»',
        shareBps: 10000,
      },
    }),
  ),
  http.get(api('/stats/balance-history'), () => HttpResponse.json([])),
]
