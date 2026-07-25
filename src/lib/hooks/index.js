import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as apis from '../api/index.js'

// Query keys in one place: invalidating "everything money" after a mutation is
// then a single, greppable list rather than a guess at each call site.
export const keys = {
  me: ['me'],
  currencies: ['currencies'],
  wallets: ['wallets'],
  transactions: (filters) => ['transactions', filters],
  transaction: (id) => ['transaction', id],
  rates: ['fx', 'rates'],
  business: ['business', 'me'],
  dashboard: ['business', 'dashboard'],
  registers: ['business', 'registers'],
  businessProfile: (id) => ['business', id],
  requests: (filters) => ['requests', filters],
  request: (id) => ['request', id],
  loans: (params) => ['loans', params],
  loan: (id) => ['loan', id],
  summary: ['stats', 'summary'],
  balanceHistory: (params) => ['stats', 'history', params],
  portfolio: ['portfolio'],
}

/** Anything that moved money invalidates all of it — cheap and never stale. */
const MONEY_KEYS = [['wallets'], ['transactions'], ['stats'], ['portfolio'], ['business'], ['loans'], ['requests']]

function useMoneyMutation(fn, { success, onSuccess } = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (data, variables, context) => {
      for (const key of MONEY_KEYS) queryClient.invalidateQueries({ queryKey: key })
      if (success) toast.success(typeof success === 'function' ? success(data) : success)
      onSuccess?.(data, variables, context)
    },
    onError: (error) => {
      // Field-level errors are rendered on the form; only the rest become toasts.
      if (!error.fields) toast.error(error.message)
    },
  })
}

// ─── Reference data ─────────────────────────────────────────────────────────

export const useCurrencies = () =>
  useQuery({
    queryKey: keys.currencies,
    queryFn: apis.wallets.currencies,
    staleTime: 60 * 60 * 1000, // currencies do not change during a session
  })

/** Exponent lookup, needed by every amount that gets rendered. */
export function useExponents() {
  const { data } = useCurrencies()
  return Object.fromEntries((data ?? []).map((c) => [c.code, c.exponent]))
}

// ─── Wallet ─────────────────────────────────────────────────────────────────

export const useWallets = () => useQuery({ queryKey: keys.wallets, queryFn: apis.wallets.list })

export const useTransactions = (filters = {}) =>
  useInfiniteQuery({
    queryKey: keys.transactions(filters),
    queryFn: ({ pageParam }) => apis.wallets.transactions({ ...filters, cursor: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })

export const useTransaction = (id) =>
  useQuery({ queryKey: keys.transaction(id), queryFn: () => apis.wallets.transaction(id), enabled: !!id })

export const useUserSearch = (query) =>
  useQuery({
    queryKey: ['users', query],
    queryFn: () => apis.auth.searchUsers(query),
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
  })

export const useTransfer = () =>
  useMoneyMutation(({ body, key }) => apis.transfers.create(body, keyOption(key)), {
    success: 'Переказ виконано',
  })

// ─── FX ─────────────────────────────────────────────────────────────────────

export const useRates = () =>
  useQuery({
    queryKey: keys.rates,
    queryFn: apis.fx.rates,
    refetchInterval: 60_000,
  })

export const useQuote = () => useMutation({ mutationFn: apis.fx.quote })

export const useExecuteQuote = () =>
  useMoneyMutation(({ quoteId, key }) => apis.fx.execute({ quoteId }, keyOption(key)), {
    success: 'Конвертацію виконано',
  })

// ─── Business ───────────────────────────────────────────────────────────────

export const useBusiness = (enabled = true) =>
  useQuery({ queryKey: keys.business, queryFn: apis.business.me, enabled, retry: false })

export const useDashboard = (enabled = true) =>
  useQuery({ queryKey: keys.dashboard, queryFn: apis.business.dashboard, enabled })

export const useRegisters = (enabled = true) =>
  useQuery({ queryKey: keys.registers, queryFn: apis.business.registers, enabled })

export const useBusinessProfile = (id) =>
  useQuery({ queryKey: keys.businessProfile(id), queryFn: () => apis.business.profile(id), enabled: !!id })

export const useCreateBusiness = () =>
  useMoneyMutation(apis.business.create, { success: 'Бізнес-профіль створено' })

export const useCreateRegister = () =>
  useMoneyMutation(apis.business.createRegister, { success: 'Касу створено' })

export const useUpdateRegister = () =>
  useMoneyMutation(({ id, body }) => apis.business.updateRegister(id, body))

export const useDeleteRegister = () =>
  useMoneyMutation(apis.business.deleteRegister, { success: 'Касу закрито' })

export const useSetStartingCapital = () =>
  useMoneyMutation(apis.business.setStartingCapital, { success: 'Стартовий капітал збережено' })

export const useMoveFunds = () =>
  useMoneyMutation(({ body, key }) => apis.business.move(body, keyOption(key)), {
    success: 'Кошти переміщено',
  })

// ─── Marketplace & loans ────────────────────────────────────────────────────

export const useRequests = (filters = {}) =>
  useInfiniteQuery({
    queryKey: keys.requests(filters),
    queryFn: ({ pageParam }) => apis.requests.list({ ...filters, cursor: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })

export const useRequest = (id) =>
  useQuery({ queryKey: keys.request(id), queryFn: () => apis.requests.get(id), enabled: !!id })

export const useCreateRequest = () =>
  useMoneyMutation(apis.requests.create, { success: 'Заявку опубліковано' })

export const useCancelRequest = () =>
  useMoneyMutation(apis.requests.cancel, { success: 'Заявку скасовано, холди повернуто' })

export const useFundRequest = () =>
  useMoneyMutation(({ id, body, key }) => apis.requests.fund(id, body, keyOption(key)), {
    success: 'Кошти заморожено під заявку',
  })

export const useCancelFunding = () =>
  useMoneyMutation(apis.requests.cancelFunding, { success: 'Внесок скасовано' })

export const useLoans = (params = {}) =>
  useQuery({ queryKey: keys.loans(params), queryFn: () => apis.loans.list(params) })

export const useLoan = (id) =>
  useQuery({ queryKey: keys.loan(id), queryFn: () => apis.loans.get(id), enabled: !!id })

export const useRepay = () =>
  useMoneyMutation(({ id, body, key }) => apis.loans.repay(id, body, keyOption(key)), {
    success: 'Платіж проведено',
  })

// ─── Stats ──────────────────────────────────────────────────────────────────

export const useSummary = () => useQuery({ queryKey: keys.summary, queryFn: apis.stats.summary })

export const useBalanceHistory = (params = {}) =>
  useQuery({ queryKey: keys.balanceHistory(params), queryFn: () => apis.stats.balanceHistory(params) })

export const usePortfolio = (enabled = true) =>
  useQuery({ queryKey: keys.portfolio, queryFn: apis.stats.portfolio, enabled })

const keyOption = (key) => (key ? { headers: { 'idempotency-key': key } } : undefined)
