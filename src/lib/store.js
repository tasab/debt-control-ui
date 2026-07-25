import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  createCurrencyRequest,
  createPersonRequest,
  deletePersonRequest,
  deleteSnapshotRequest,
  fetchAudit,
  fetchCurrencies,
  fetchPeople,
  fetchPersonHistory,
  fetchSnapshots,
  putSnapshot,
  updatePersonRequest,
} from './api'
import { BASE_CURRENCY, DEFAULT_CURRENCIES, rateCurrenciesOf } from './currencies'
import { queryClient } from './queryClient'

// Snapshot access, backed by the server API via TanStack Query. The public
// surface (useSnapshots / useSnapshotDates / saveSnapshot / deleteSnapshot) is
// unchanged from the old localStorage store, so the pages didn't need edits.

const SNAPSHOTS_KEY = ['snapshots']

function useSnapshotList() {
  return useQuery({ queryKey: SNAPSHOTS_KEY, queryFn: fetchSnapshots })
}

// Snapshots keyed by date, matching what the pages expect. Empty while loading.
export function useSnapshots() {
  const { data } = useSnapshotList()
  return useMemo(() => {
    const map = {}
    for (const snap of data ?? []) map[snap.date] = snap
    return map
  }, [data])
}

export function useSnapshotDates() {
  const { data } = useSnapshotList()
  return useMemo(() => (data ?? []).map((s) => s.date).sort(), [data])
}

// Loading / error state for pages that want to show it (Dashboard, History).
export function useSnapshotsStatus() {
  const { isLoading, isError, error } = useSnapshotList()
  return { isLoading, isError, error }
}

export async function saveSnapshot(snapshot) {
  await putSnapshot(snapshot)
  await queryClient.invalidateQueries({ queryKey: SNAPSHOTS_KEY })
  // A save may add audit entries and register new people.
  await queryClient.invalidateQueries({ queryKey: ['audit'] })
  await queryClient.invalidateQueries({ queryKey: PEOPLE_KEY })
}

export async function deleteSnapshot(date) {
  await deleteSnapshotRequest(date)
  await queryClient.invalidateQueries({ queryKey: SNAPSHOTS_KEY })
}

// People roster ---------------------------------------------------------------

const PEOPLE_KEY = ['people']

export function usePeople() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: PEOPLE_KEY,
    queryFn: fetchPeople,
  })
  return { people: data ?? [], isLoading, isError, error }
}

export async function createPerson(name) {
  const person = await createPersonRequest(name)
  await queryClient.invalidateQueries({ queryKey: PEOPLE_KEY })
  return person
}

export async function renamePerson(id, name) {
  await updatePersonRequest(id, name)
  await queryClient.invalidateQueries({ queryKey: PEOPLE_KEY })
}

export async function removePerson(id) {
  await deletePersonRequest(id)
  await queryClient.invalidateQueries({ queryKey: PEOPLE_KEY })
}

export function usePersonHistory(id) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['people', id, 'history'],
    queryFn: () => fetchPersonHistory(id),
    enabled: Boolean(id),
  })
  return { history: data ?? [], isLoading, isError, error }
}

// Currencies ------------------------------------------------------------------

const CURRENCIES_KEY = ['currencies']

// The active currency list, fetched from the server. Falls back to the seeded
// defaults until the request resolves, so the engine and forms have a valid
// list to render on first paint. Exposes the derived shapes the app needs:
// `currencies` (all), `rateCurrencies` (non-base), and their code arrays.
export function useCurrencies() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: CURRENCIES_KEY,
    queryFn: fetchCurrencies,
  })
  const currencies = data ?? DEFAULT_CURRENCIES
  return useMemo(() => {
    const rateCurrencies = rateCurrenciesOf(currencies)
    return {
      currencies,
      rateCurrencies,
      codes: currencies.map((c) => c.code),
      rateCodes: rateCurrencies.map((c) => c.code),
      baseCurrency: BASE_CURRENCY,
      isLoading,
      isError,
      error,
    }
  }, [currencies, isLoading, isError, error])
}

export async function addCurrency(code, name) {
  const currency = await createCurrencyRequest(code, name)
  await queryClient.invalidateQueries({ queryKey: CURRENCIES_KEY })
  return currency
}

// Audit log -------------------------------------------------------------------

export function useAudit(date) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['audit', date ?? 'all'],
    queryFn: () => fetchAudit(date ? { date } : {}),
  })
  return { entries: data ?? [], isLoading, isError, error }
}

export function emptyPerson(name = '', id = crypto.randomUUID()) {
  return { id, name, debt: {}, capital: {} }
}

// A blank snapshot for a given date. If a roster is supplied, the people are
// pre-populated (blank amounts) so a new day starts from the standing list.
export function blankSnapshot(date, roster = []) {
  const people = roster.length
    ? roster.map((p) => emptyPerson(p.name, p.id))
    : [emptyPerson()]
  return {
    date,
    rates: {},
    people,
    registers: [
      { id: crypto.randomUUID(), name: 'КАСА 1', amount: '' },
      { id: crypto.randomUUID(), name: 'КАСА 2', amount: '' },
    ],
    startingCapitalUsd: '2000',
  }
}
