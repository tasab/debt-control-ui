import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as apis from '../api/index.ts'

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
  dashboard: (params) => ['business', 'dashboard', params],
  registers: ['business', 'registers'],
  countSheet: ['business', 'count-sheet'],
  cashCounts: ['business', 'cash-counts'],
  monthly: (params) => ['business', 'monthly', params],
  businessHistory: ['business', 'history'],
  members: ['business', 'members'],
  contributions: ['business', 'contributions'],
  memberships: ['memberships'],
  businessProfile: (id) => ['business', id],
  summary: ['stats', 'summary'],
  balanceHistory: (params) => ['stats', 'history', params],
  adminUsers: (query) => ['admin', 'users', query],
  adminAdjustments: (id) => ['admin', 'adjustments', id],
  shares: ['shares'],
  share: (token) => ['share', token],
}

/** Anything that moved money invalidates all of it — cheap and never stale. */
const MONEY_KEYS = [['wallets'], ['transactions'], ['stats'], ['business'], ['memberships'], ['admin'], ['fx']]

// `invalidate` — для мутацій, які нічого не рухають у журналі (посилання на
// баланс): скидати весь грошовий кеш заради списку посилань немає сенсу, а
// лишити його несвіжим — тим паче.
function useMoneyMutation(fn, { success, onSuccess, invalidate, money = true } = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (data, variables, context) => {
      if (money) {
        for (const key of MONEY_KEYS) queryClient.invalidateQueries({ queryKey: key })
      }
      for (const key of invalidate ?? []) queryClient.invalidateQueries({ queryKey: key })
      // `variables` передається так само, як у onSuccess: без нього повідомлення
      // не може залежати від того, що саме надсилали, а спроба це зробити
      // падала винятком уже після успішної проводки.
      if (success) {
        toast.success(typeof success === 'function' ? success(data, variables) : success)
      }
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

/** Записати собі власні кошти — без адміністратора, у свій же гаманець. */
export const useTopUpSelf = () =>
  useMoneyMutation(({ body, key }) => apis.transfers.topUpSelf(body, keyOption(key)), {
    success: 'Записано',
  })

// ─── FX ─────────────────────────────────────────────────────────────────────

export const useRates = () =>
  useQuery({
    queryKey: keys.rates,
    queryFn: apis.fx.rates,
    refetchInterval: 60_000,
  })

/** Власні курси обмінника. Перемагають стрічку й не старіють. */
export const useSetRate = () =>
  useMoneyMutation(apis.fx.setRate, { success: (data) => `Курс ${data.code} збережено` })

export const useQuote = () => useMutation({ mutationFn: apis.fx.quote })

export const useExecuteQuote = () =>
  useMoneyMutation(({ quoteId, key }) => apis.fx.execute({ quoteId }, keyOption(key)), {
    success: 'Конвертацію виконано',
  })

// ─── Business ───────────────────────────────────────────────────────────────

export const useBusiness = (enabled = true) =>
  useQuery({ queryKey: keys.business, queryFn: apis.business.me, enabled, retry: false })

/** `displayCurrency` міняє лише подання — сервер рахує, клієнт не конвертує. */
export const useDashboard = (displayCurrency, enabled = true) => {
  const params = displayCurrency ? { in: displayCurrency } : undefined
  return useQuery({
    queryKey: keys.dashboard(displayCurrency ?? null),
    queryFn: () => apis.business.dashboard(params),
    enabled,
    // Валюта показу міняється туди-сюди; попередній підсумок лишається на
    // екрані замість того, щоб блимати скелетоном на кожен клік.
    placeholderData: (previous) => previous,
  })
}

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

// ─── Вечірній перерахунок ───────────────────────────────────────────────────

export const useCountSheet = (enabled = true) =>
  useQuery({ queryKey: keys.countSheet, queryFn: apis.business.countSheet, enabled })

export const useCashCounts = (enabled = true) =>
  useQuery({ queryKey: keys.cashCounts, queryFn: apis.business.cashCounts, enabled })

/** Названий рух грошей із каси: витрата або вилучення власником. */
export const useSpend = () =>
  useMoneyMutation(({ body, key }) => apis.business.spend(body, keyOption(key)), {
    success: (_data, variables) =>
      ({ draw: 'Вилучення записано', capital: 'Внесок записано' })[variables.body.kind] ??
      'Витрату записано',
  })

export const useMonthly = (params = {}) =>
  useQuery({ queryKey: keys.monthly(params), queryFn: () => apis.business.monthly(params) })

/** Уся стрічка рухів грошей бізнесу — з журналу проводок. */
export const useBusinessHistory = (enabled = true) =>
  useQuery({ queryKey: keys.businessHistory, queryFn: apis.business.history, enabled })

/** Виправлення помилкового закриття — сторно, а не правка на місці. */
export const useReverseCashCount = () =>
  useMoneyMutation(apis.business.reverseCashCount, { success: 'Перерахунок скасовано' })

// ─── Учасники ───────────────────────────────────────────────────────────────

export const useMembers = (enabled = true) =>
  useQuery({ queryKey: keys.members, queryFn: apis.business.members, enabled })

/** Історія того, що зайшло в бізнес від учасників — лише читання. */
export const useContributions = (enabled = true) =>
  useQuery({ queryKey: keys.contributions, queryFn: apis.business.contributions, enabled })

export const useInviteMember = () =>
  useMoneyMutation(apis.business.invite, { success: 'Запрошення надіслано' })

/** Завершення участі виплачує решту боргу готівкою — тост каже, чи було що. */
export const useEndMembership = () =>
  useMoneyMutation(apis.business.endMembership, {
    success: (data) =>
      data.returned?.length > 0
        ? 'Участь завершено, кошти видано з каси'
        : 'Участь завершено',
  })

/** Прибрати картку зі списку. Рядок і його рахунки в журналі лишаються. */
export const useHideMember = () =>
  useMoneyMutation(apis.business.hideMember, { success: 'Учасника прибрано зі списку' })

export const useSetMemberRate = () =>
  useMoneyMutation(({ id, body }) => apis.business.setMemberRate(id, body), {
    success: 'Ставку оновлено',
  })

// Сторона інвестора.

export const useMemberships = () =>
  useQuery({ queryKey: keys.memberships, queryFn: apis.memberships.list })

export const useAcceptInvite = () =>
  useMoneyMutation(({ id, body }) => apis.memberships.accept(id, body), {
    success: (data) =>
      data.swept?.length > 0
        ? 'Участь підтверджено — ваші кошти передано бізнесу'
        : 'Участь підтверджено. На гаманці не було коштів, тож передавати не було чого',
  })

export const useDeclineInvite = () =>
  useMoneyMutation(apis.memberships.decline, { success: 'Запрошення відхилено' })

/** Зняття: гроші видає власник з каси, додаток фіксує зменшення боргу. */
export const useWithdraw = () =>
  useMoneyMutation(({ id, body, key }) => apis.memberships.withdraw(id, body, keyOption(key)), {
    success: 'Знято — заберіть готівку у власника',
  })

export const useTransferClaim = () =>
  useMoneyMutation(({ id, body, key }) => apis.memberships.transfer(id, body, keyOption(key)), {
    success: 'Переказ виконано',
  })

export const useCountCash = () =>
  useMoneyMutation(({ body, key }) => apis.business.countCash(body, keyOption(key)), {
    success: (data) =>
      data.transactionId ? 'Перерахунок збережено' : 'Перерахунок збігся з обліком',
  })

// ─── Stats ──────────────────────────────────────────────────────────────────

export const useSummary = () => useQuery({ queryKey: keys.summary, queryFn: apis.stats.summary })

export const useBalanceHistory = (params = {}) =>
  useQuery({ queryKey: keys.balanceHistory(params), queryFn: () => apis.stats.balanceHistory(params) })

// ─── Посилання на баланс ────────────────────────────────────────────────────

export const useShares = () => useQuery({ queryKey: keys.shares, queryFn: apis.shares.list })

export const useCreateShare = () =>
  useMoneyMutation((body) => apis.shares.create(body), {
    success: 'Посилання створено',
    money: false,
    invalidate: [keys.shares],
  })

export const useRevokeShare = () =>
  useMoneyMutation((id) => apis.shares.revoke(id), {
    success: 'Посилання відкликано',
    money: false,
    invalidate: [keys.shares],
  })

/**
 * Сторінка за посиланням. Без ретраїв: недійсний токен недійсний остаточно, і
 * три спроби поспіль лише затягують показ пояснення.
 */
export const useSharedBalance = (token) =>
  useQuery({
    queryKey: keys.share(token),
    queryFn: () => apis.shares.view(token),
    enabled: !!token,
    retry: false,
  })

// ─── Admin ──────────────────────────────────────────────────────────────────

/** М'яке видалення: людина зникає зі списків, проводки лишаються. */
export const useDeleteUser = () =>
  useMoneyMutation(({ id, force }) => apis.admin.deleteUser(id, force), {
    success: (data) =>
      data.writtenOff?.length > 0
        ? 'Користувача видалено, залишки списано'
        : 'Користувача видалено',
  })

export const useAdminUsers = (query = '') =>
  useQuery({ queryKey: keys.adminUsers(query), queryFn: () => apis.admin.users({ q: query }) })

export const useAdminAdjustments = (id) =>
  useQuery({
    queryKey: keys.adminAdjustments(id),
    queryFn: () => apis.admin.adjustments(id),
    enabled: !!id,
  })

export const useAdjustBalance = () =>
  useMoneyMutation(({ id, body, key }) => apis.admin.adjust(id, body, keyOption(key)), {
    // Якщо людина в бізнесі, гроші не лишаються на гаманці — і сказати про це
    // треба одразу, інакше «баланс змінено» суперечило б нулю на екрані.
    success: (data) =>
      data.swept?.length > 0
        ? 'Баланс змінено — кошти передано бізнесу учасника'
        : 'Баланс змінено',
  })

const keyOption = (key) => (key ? { headers: { 'idempotency-key': key } } : undefined)
