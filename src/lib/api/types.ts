/**
 * The wire contract, as types (SERVER_PLAN §2.3).
 *
 * The server owns this contract; these declarations mirror it so the client
 * breaks at compile time when it drifts, instead of at runtime on a money
 * screen. Amounts are `MoneyString` — a string of minor units — never `number`.
 */

/** "100500" = 1005.00 in a currency with exponent 2. */
export type MoneyString = string

/** Basis points: 1800 = 18%. */
export type Bps = number

/** ISO-8601 UTC. */
export type IsoDate = string

export type Capability = 'invest' | 'borrow'

export interface Rating {
  grade: 'A' | 'B' | 'C' | 'D'
  score: number
  factors?: Record<string, { value: number; weight: number }>
}

export interface Me {
  id: string
  email: string
  displayName: string
  capabilities: Capability[]
  isAdmin: boolean
  rating: Rating | null
  businessId: string | null
}

export interface Currency {
  code: string
  name: string
  exponent: number
  isActive: boolean
  isBase: boolean
}

export interface Wallet {
  currency: string
  available: MoneyString
  held: MoneyString
  total: MoneyString
}

export type EntryType =
  | 'transfer_out'
  | 'transfer_in'
  | 'fx'
  | 'fee'
  | 'topup'
  | 'self_topup'
  | 'self_withdrawal'
  | 'funding_hold'
  | 'funding_release'
  | 'disbursement'
  | 'repayment_in'
  | 'repayment_out'
  | 'interest_accrued'
  | 'internal_in'
  | 'internal_out'
  | 'adjustment'

export interface Counterparty {
  id: string
  name: string
}

export interface TransactionEntry {
  id: string
  transactionId: string
  type: EntryType
  currency: string
  amount: MoneyString
  held: boolean
  comment: string | null
  counterparty: Counterparty | null
  relatedLoanId: string | null
  createdAt: IsoDate
}

export interface Page<T> {
  items: T[]
  nextCursor: string | null
}

export interface TransactionDetail {
  id: string
  type: string
  createdAt: IsoDate
  meta: Record<string, string>
  legs: TransactionEntry[]
}

export interface UserSearchResult {
  id: string
  displayName: string
  hint: string
}

/** Учасник у адмінському списку — з усіма валютами, включно з гривнею. */
export interface AdminParticipant {
  id: string
  email: string
  displayName: string
  capabilities: Capability[]
  isAdmin: boolean
  businessName: string | null
  wallets: Wallet[]
}

/** set — виставити баланс; credit — додати; debit — списати. */
export type AdjustMode = 'set' | 'credit' | 'debit'

export interface AdjustBalanceBody {
  currency: string
  mode: AdjustMode
  amount: MoneyString
  comment: string
}

export interface AdjustBalanceResult {
  transactionId: string
  before: MoneyString
  after: MoneyString
  delta: MoneyString
}

export interface AdminAdjustment {
  id: string
  type: 'adjustment' | 'topup'
  currency: string | null
  before: MoneyString | null
  after: MoneyString | null
  comment: string | null
  actor: string | null
  createdAt: IsoDate
}

export interface FeePreview {
  amount: MoneyString
  fee: MoneyString
  total: MoneyString
  received: MoneyString
  payer: 'sender' | 'recipient'
}

export interface Rate {
  code: string
  bid: string
  sell: string
  observedAt: IsoDate
  isStale: boolean
}

export interface FxQuote {
  quoteId: string
  from: string
  to: string
  amountFrom: MoneyString
  amountTo: MoneyString
  rate: string
  side: 'bid' | 'sell' | 'cross'
  expiresAt: IsoDate
}

export interface Business {
  id: string
  name: string
  description: string | null
  baseCurrency: string
  isVerified: boolean
  createdAt: IsoDate
  startingCapital?: { amount: MoneyString; currency: string; effectiveFrom: IsoDate } | null
  ownerName?: string
  rating?: Rating
  loansTotal?: number
  loansClosed?: number
}

export interface DashboardCurrencyRow {
  currency: string
  wallets: MoneyString
  registers: MoneyString
  debt: MoneyString
  walletsBase: MoneyString
  registersBase: MoneyString
  debtBase: MoneyString
}

export interface Dashboard {
  baseCurrency: string
  assets: MoneyString
  liabilities: MoneyString
  netWorth: MoneyString
  profit: MoneyString
  costOfCapitalBps: Bps
  activeLoanCount: number
  startingCapital: { amount: MoneyString; currency: string; base: MoneyString } | null
  byCurrency: DashboardCurrencyRow[]
  staleCodes: string[]
}

export interface Register {
  id: string
  name: string
  currency: string
  isActive: boolean
  balance: MoneyString
}

export type RequestStatus = 'draft' | 'open' | 'funded' | 'disbursed' | 'expired' | 'cancelled'
export type RepaymentType = 'bullet' | 'interest_only_flex'

export interface FundingRequest {
  id: string
  business: { id: string; name?: string; rating?: Rating }
  currency: string
  amountTarget: MoneyString
  amountFunded: MoneyString
  /** Progress in basis points — computed server-side; the client never divides. */
  fundedBps: Bps
  rateAnnualBps: Bps
  /** null — безстрокова заявка: дата погашення не вказується. */
  termDays: number | null
  repaymentType: RepaymentType
  minTicket: MoneyString
  minFillBps: Bps
  purpose: string | null
  status: RequestStatus
  expiresAt: IsoDate
  createdAt: IsoDate
  investorCount: number
}

export interface RequestInvestor {
  id: string
  name: string
  amount: MoneyString
  createdAt: IsoDate
  isMe: boolean
}

export interface FundingRequestDetail extends FundingRequest {
  investors: RequestInvestor[]
  myFunding: { id: string; amount: MoneyString } | null
}

export type LoanStatus = 'disbursed' | 'repaying' | 'closed' | 'overdue' | 'defaulted'
export type ScheduleStatus = 'due' | 'paid' | 'overdue'

export interface ScheduleRow {
  id: string
  seq: number
  dueAt: IsoDate
  principalDue: MoneyString
  interestDue: MoneyString
  principalPaid: MoneyString
  interestPaid: MoneyString
  status: ScheduleStatus
  paidAt: IsoDate | null
}

export interface Loan {
  id: string
  status: LoanStatus
  currency: string
  principal: MoneyString
  outstandingPrincipal: MoneyString
  accruedInterest: MoneyString
  paidInterest: MoneyString
  interestOutstanding: MoneyString
  rateAnnualBps: Bps
  /** Обидва null разом — безстрокова позика (див. lib/term.ts). */
  termDays: number | null
  repaymentType: RepaymentType
  disbursedAt: IsoDate
  maturesAt: IsoDate | null
  closedAt: IsoDate | null
  myShareBps: Bps | null
  myPrincipalShare: MoneyString | null
  nextPayment: Pick<ScheduleRow, 'id' | 'dueAt' | 'principalDue' | 'interestDue' | 'status'> | null
}

export interface LoanDetail extends Loan {
  business: { id: string; name: string }
  schedule: ScheduleRow[]
  investors: Array<{
    name: string
    shareBps: Bps
    principalShare: MoneyString
    isMe: boolean
  }>
}

export interface Summary {
  baseCurrency: string
  wallets: MoneyString
  held: MoneyString
  lent: MoneyString
  accrued: MoneyString
  overdue: MoneyString
  borrowed: MoneyString
  netWorth: MoneyString
}

export interface BalancePoint {
  date: string
  totalBase: MoneyString
  kinds: Record<string, MoneyString>
  currencies: Record<string, MoneyString>
}

export interface Portfolio {
  baseCurrency: string
  activePrincipal: MoneyString
  totalDeployed: MoneyString
  interestReceived: MoneyString
  feesPaid: MoneyString
  principalReturned: MoneyString
  netInterest: MoneyString
  weightedRateBps: Bps
  positionCount: number
  overdueCount: number
  defaultedCount: number
  distribution: Array<{
    businessId: string
    name: string
    amount: MoneyString
    shareBps: Bps
  }>
  concentrationWarning: { businessId: string; name: string; shareBps: Bps } | null
}

// ─── Request bodies ─────────────────────────────────────────────────────────

export interface TransferBody {
  toUserId: string
  currency: string
  amount: MoneyString
  comment?: string
}

export interface CreateRequestBody {
  currency: string
  amountTarget: MoneyString
  rateAnnualBps: Bps
  /** null — безстрокова заявка: строк не передається взагалі. */
  termDays: number | null
  repaymentType: RepaymentType
  minTicket?: MoneyString
  minFillBps?: Bps
  purpose?: string
  expiresAt: IsoDate
}

export interface MoveFundsBody {
  from: string
  to: string
  currency: string
  amount: MoneyString
  comment?: string
}

export interface TransactionResult {
  transactionId: string
  replayed?: boolean
}
