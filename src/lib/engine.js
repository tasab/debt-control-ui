import Decimal from 'decimal.js'
import { BASE_CURRENCY, DEFAULT_CURRENCIES } from './currencies'

// The calculation engine. This is the single, tested conversion function the
// concept doc asks for — the whole app funnels through computeSnapshot().
// All money math uses decimal.js so rates and amounts are exact (never floats).
//
// The currency list is passed in (it lives in the DB now); it defaults to the
// seeded set so the pure helpers still work standalone and in tests.

const ZERO = new Decimal(0)

// Coerce any user-entered value to a Decimal, defaulting missing/blank/NaN to 0
// explicitly (rather than relying on blank-cell coercion, per APP_CONCEPT §5).
function d(value) {
  if (value === null || value === undefined) return ZERO
  // Trim strings so a stray space (the sheet's Q6 bug) reads as 0, not NaN.
  const v = typeof value === 'string' ? value.trim() : value
  if (v === '') return ZERO
  let n
  try {
    n = new Decimal(v)
  } catch {
    // Any non-numeric junk defaults to 0 explicitly, per APP_CONCEPT §5.
    return ZERO
  }
  return n.isNaN() ? ZERO : n
}

// Average rate = (buy + sell) / 2. The base currency is always 1.
export function averageRate(rate) {
  if (!rate) return ZERO
  return d(rate.buy).plus(d(rate.sell)).dividedBy(2)
}

export function averageRates(rates, currencies = DEFAULT_CURRENCIES) {
  const out = {}
  for (const { code } of currencies) {
    out[code] = code === BASE_CURRENCY ? new Decimal(1) : averageRate(rates?.[code])
  }
  return out
}

// Sum a per-person map field (debt or capital) into a per-currency total.
function sumByCurrency(people, field, currencies) {
  const totals = {}
  for (const { code } of currencies) totals[code] = ZERO
  for (const person of people ?? []) {
    for (const { code } of currencies) {
      totals[code] = totals[code].plus(d(person?.[field]?.[code]))
    }
  }
  return totals
}

// Convert a per-currency total map to UAH using the average rates.
// Always uses the summed total per currency (fixes the PLN E20=E5 bug).
function toUah(totals, avg, currencies) {
  let sum = ZERO
  for (const { code } of currencies) {
    sum = sum.plus(totals[code].times(avg[code]))
  }
  return sum
}

/**
 * Run the full calculation chain (APP_CONCEPT §3) for one dated snapshot.
 * `currencies` is the active list (defaults to the seeded set). Returns Decimal
 * values; use .toNumber()/.toFixed() at the display edge.
 */
export function computeSnapshot(snapshot, currencies = DEFAULT_CURRENCIES) {
  const avg = averageRates(snapshot?.rates, currencies)

  const debtByCurrency = sumByCurrency(snapshot?.people, 'debt', currencies)
  const capitalByCurrency = sumByCurrency(snapshot?.people, 'capital', currencies)

  const debtUah = toUah(debtByCurrency, avg, currencies)
  const capitalUah = toUah(capitalByCurrency, avg, currencies)
  const netUah = capitalUah.minus(debtUah)

  const registersTotal = (snapshot?.registers ?? []).reduce(
    (acc, r) => acc.plus(d(r?.amount)),
    ZERO,
  )

  const grandUah = netUah.plus(registersTotal)
  // Grand total in USD needs a USD rate; if USD was removed or unrated, fall
  // back to 0 rather than dividing by zero.
  const usdRate = avg.USD ?? ZERO
  const grandUsd = usdRate.isZero() ? ZERO : grandUah.dividedBy(usdRate)

  const startingUsd = d(snapshot?.startingCapitalUsd)
  const profitUsd = grandUsd.minus(startingUsd)
  const returnPct = startingUsd.isZero()
    ? ZERO
    : profitUsd.dividedBy(startingUsd).times(100)

  return {
    avg,
    debtByCurrency,
    capitalByCurrency,
    debtUah,
    capitalUah,
    netUah,
    registersTotal,
    grandUah,
    grandUsd,
    startingUsd,
    profitUsd,
    returnPct,
  }
}
