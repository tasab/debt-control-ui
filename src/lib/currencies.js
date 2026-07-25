// Base currency of the operation — everything is converted through UAH. This
// stays an app-level constant (the whole engine converts through it), while the
// active currency *list* now lives in the database and is fetched at runtime
// (see useCurrencies in ./store). USD is likewise assumed to exist by the
// engine's grand-total-in-USD step.
export const BASE_CURRENCY = 'UAH'

// Fallback list, matching the seeded rows. Used before the API responds and by
// the pure engine/schema helpers when no list is passed in, so the app still
// renders correctly on first paint and in isolation (tests).
export const DEFAULT_CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'PLN', name: 'Polish Zloty' },
  { code: 'UAH', name: 'Ukrainian Hryvnia' },
]

// Currencies that carry an exchange rate (everything except the UAH base).
export const rateCurrenciesOf = (currencies) =>
  currencies.filter((c) => c.code !== BASE_CURRENCY)
