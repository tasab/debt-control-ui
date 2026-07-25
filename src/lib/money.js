/**
 * The only place in the client that touches money arithmetic.
 *
 * The client does not compute money (CLIENT_PLAN §0): balances, fees, interest
 * and conversions all arrive from the server already calculated. What lives
 * here is formatting a string of minor units into text, and parsing what a
 * human typed back into minor units — nothing else.
 *
 * Amounts are strings ("100500") and are converted with BigInt, never Number:
 * Number silently loses precision above 2^53 and turns 0.1 + 0.2 into 0.30000000000000004.
 */

/** Currency exponents come from GET /currencies; 2 is the sane fallback. */
export const DEFAULT_EXPONENT = 2

/**
 * "100050" + exponent 2 → "1000.50"
 * Grouping uses the user's locale via Intl, so 1 000 000,00 renders correctly
 * in uk-UA without us hand-rolling separators.
 */
export function formatAmount(value, { exponent = DEFAULT_EXPONENT, locale = 'uk-UA', sign = 'auto' } = {}) {
  const raw = normalise(value)
  const negative = raw.startsWith('-')
  const digits = (negative ? raw.slice(1) : raw).padStart(exponent + 1, '0')
  const whole = digits.slice(0, digits.length - exponent) || '0'
  const frac = exponent > 0 ? digits.slice(digits.length - exponent) : ''

  const grouped = new Intl.NumberFormat(locale).format(BigInt(whole))
  const decimalSeparator = separatorFor(locale)
  const body = exponent > 0 ? `${grouped}${decimalSeparator}${frac}` : grouped

  if (negative) return `−${body}` // U+2212, so a minus is never mistaken for a hyphen
  if (sign === 'always') return `+${body}`
  return body
}

/** Same, with the currency code appended: "1 000,50 UAH". */
export function formatMoney(value, currency, options = {}) {
  return `${formatAmount(value, options)} ${currency}`
}

/**
 * What a human typed → minor units. Handles the things people actually do:
 * commas as decimal separators, thin spaces from a paste, a leading currency
 * symbol, more decimals than the currency has.
 *
 * Returns { value, error } rather than throwing — this runs on every keystroke.
 */
export function parseAmountInput(input, exponent = DEFAULT_EXPONENT) {
  const text = String(input ?? '')
    .replace(/[\s  ']/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '')

  if (!text || text === '-' || text === '.') return { value: null, error: null }
  if (!/^-?\d*(\.\d*)?$/.test(text)) return { value: null, error: 'Тільки цифри' }

  const negative = text.startsWith('-')
  const [whole = '', frac = ''] = text.replace('-', '').split('.')
  if (frac.length > exponent) {
    return { value: null, error: `Максимум ${exponent} знаки після коми` }
  }

  const minor = BigInt((whole || '0') + frac.padEnd(exponent, '0'))
  return { value: `${negative ? '-' : ''}${minor}`, error: null }
}

/** Minor units → the text an input should show while editing ("1000.50"). */
export function toInputValue(value, exponent = DEFAULT_EXPONENT) {
  if (value === null || value === undefined || value === '') return ''
  const raw = normalise(value)
  const negative = raw.startsWith('-')
  const digits = (negative ? raw.slice(1) : raw).padStart(exponent + 1, '0')
  const whole = digits.slice(0, digits.length - exponent)
  const frac = exponent > 0 ? `.${digits.slice(digits.length - exponent)}` : ''
  return `${negative ? '-' : ''}${whole}${frac}`
}

export const isZero = (value) => BigInt(normalise(value)) === 0n
export const isNegative = (value) => BigInt(normalise(value)) < 0n
export const compareAmount = (a, b) => {
  const left = BigInt(normalise(a))
  const right = BigInt(normalise(b))
  return left === right ? 0 : left > right ? 1 : -1
}

/**
 * Adding two amounts of the SAME currency — for summing a list the server
 * already computed per row. Never use this to derive a balance; that comes
 * from the server.
 */
export const addAmounts = (...values) =>
  values.reduce((acc, v) => acc + BigInt(normalise(v)), 0n).toString()

/** Basis points → "18%" / "0.5%". Rates are integers everywhere else. */
export function formatBps(bps, { locale = 'uk-UA' } = {}) {
  const percent = Number(bps) / 100
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(percent)}%`
}

function normalise(value) {
  if (value === null || value === undefined || value === '') return '0'
  const text = String(value)
  if (!/^-?\d+$/.test(text)) {
    // Loud in development, harmless in production: a float here means someone
    // did arithmetic that belongs on the server.
    if (import.meta.env?.DEV) {
      console.error(`[money] expected minor units as a digit string, got "${text}"`)
    }
    return '0'
  }
  return text
}

function separatorFor(locale) {
  const parts = new Intl.NumberFormat(locale).formatToParts(1.1)
  return parts.find((p) => p.type === 'decimal')?.value ?? '.'
}
