/**
 * Fixtures written strictly against SERVER_PLAN §2 — the contract, not the
 * running server. If the real API disagrees with these, the contract document
 * is what gets fixed first (CLIENT_PLAN §2).
 */

export const currencies = [
  { code: 'UAH', name: 'Гривня', exponent: 2, isActive: true, isBase: true },
  { code: 'USD', name: 'Долар США', exponent: 2, isActive: true, isBase: false },
  { code: 'EUR', name: 'Євро', exponent: 2, isActive: true, isBase: false },
]

export const me = {
  id: 'usr_investor',
  email: 'investor@debt.local',
  displayName: 'Олекса Інвестор',
  capabilities: ['invest'],
  isAdmin: false,
  rating: null,
  businessId: null,
}

export const wallets = [
  { currency: 'UAH', available: '48750000', held: '10000000', total: '58750000' },
  { currency: 'USD', available: '243900', held: '0', total: '243900' },
  { currency: 'EUR', available: '0', held: '0', total: '0' },
]

export const transactions = {
  items: [
    {
      id: 'led_1',
      transactionId: 'txn_1',
      type: 'transfer_out',
      currency: 'UAH',
      amount: '-100500',
      comment: 'за оренду',
      counterparty: { id: 'usr_maria', name: 'Марія' },
      relatedLoanId: null,
      createdAt: '2026-07-24T10:15:00Z',
    },
    {
      id: 'led_2',
      transactionId: 'txn_2',
      type: 'funding_hold',
      currency: 'UAH',
      amount: '-10000000',
      comment: 'заморожено під заявку',
      counterparty: null,
      relatedLoanId: null,
      createdAt: '2026-07-23T09:00:00Z',
    },
    {
      id: 'led_3',
      transactionId: 'txn_3',
      type: 'topup',
      currency: 'UAH',
      amount: '50000000',
      comment: 'поповнення',
      counterparty: null,
      relatedLoanId: null,
      createdAt: '2026-07-20T08:00:00Z',
    },
  ],
  nextCursor: null,
}

export const rates = [
  { code: 'USD', bid: '41.200000', sell: '42.100000', observedAt: '2026-07-25T09:00:00Z', isStale: false },
  { code: 'EUR', bid: '44.600000', sell: '45.600000', observedAt: '2026-07-25T09:00:00Z', isStale: true },
]

export const requests = {
  items: [
    {
      id: 'req_1',
      business: { id: 'biz_1', name: 'Кав’ярня «Друга Хвиля»', rating: { grade: 'A', score: 82 } },
      currency: 'UAH',
      amountTarget: '50000000',
      amountFunded: '31000000',
      fundedBps: 6200,
      rateAnnualBps: 1800,
      termDays: 180,
      repaymentType: 'bullet',
      minTicket: '1000000',
      minFillBps: 5000,
      purpose: 'Обладнання для другої точки',
      status: 'open',
      expiresAt: '2026-08-10T23:59:59Z',
      createdAt: '2026-07-18T12:00:00Z',
      investorCount: 4,
    },
    {
      id: 'req_2',
      business: { id: 'biz_2', name: 'Пекарня «Тепло»', rating: { grade: 'C', score: 51 } },
      currency: 'UAH',
      amountTarget: '20000000',
      amountFunded: '2000000',
      fundedBps: 1000,
      rateAnnualBps: 2400,
      termDays: 90,
      repaymentType: 'interest_only_flex',
      minTicket: '500000',
      minFillBps: 5000,
      purpose: 'Оборотні кошти',
      status: 'open',
      expiresAt: '2026-08-02T23:59:59Z',
      createdAt: '2026-07-22T12:00:00Z',
      investorCount: 1,
    },
  ],
  nextCursor: null,
}

export const summary = {
  baseCurrency: 'UAH',
  wallets: '48750000',
  held: '10000000',
  lent: '15000000',
  accrued: '320000',
  overdue: '0',
  borrowed: '0',
  netWorth: '74070000',
}
