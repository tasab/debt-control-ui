import { z } from 'zod'
import { BASE_CURRENCY, DEFAULT_CURRENCIES } from './currencies'

// Client-side snapshot validation, mirroring the server's rules (Phase S2) so
// bad input is caught before it reaches the engine or the API. Returns a flat
// map of { pathKey: message } plus an ordered list for a summary panel.
//
// The currency codes are dynamic (they live in the DB), so callers pass the
// active list; it defaults to the seeded set. The zod schema is rebuilt per set
// of codes and memoized so repeated saves with the same list stay cheap.

const DEFAULT_CODES = DEFAULT_CURRENCIES.map((c) => c.code)
const DEFAULT_RATE_CODES = DEFAULT_CODES.filter((c) => c !== BASE_CURRENCY)

// A money amount: blank/absent is allowed (→ 0), otherwise a number ≥ 0.
// `positive` requires > 0 (used for rates). Accepts numeric strings.
function amount({ positive = false } = {}) {
  return z
    .union([z.string(), z.number()])
    .optional()
    .superRefine((value, ctx) => {
      if (value === '' || value === null || value === undefined) return
      const s = typeof value === 'string' ? value.trim() : value
      if (s === '') return
      const n = Number(s)
      if (!Number.isFinite(n)) {
        ctx.addIssue({ code: 'custom', message: 'must be a number' })
        return
      }
      if (positive && n <= 0) {
        ctx.addIssue({ code: 'custom', message: 'must be greater than 0' })
      } else if (!positive && n < 0) {
        ctx.addIssue({ code: 'custom', message: 'must be 0 or greater' })
      }
    })
}

// Build the snapshot schema for a given set of currency codes. Cached by the
// codes signature so validating many snapshots with the same list is cheap.
const schemaCache = new Map()

function snapshotSchemaFor(codes, rateCodes) {
  const key = `${codes.join(',')}|${rateCodes.join(',')}`
  const cached = schemaCache.get(key)
  if (cached) return cached

  const amountMap = z
    .object(Object.fromEntries(codes.map((c) => [c, amount()])))
    .partial()

  const rateMap = z
    .object(
      Object.fromEntries(
        rateCodes.map((c) => [
          c,
          z
            .object({
              buy: amount({ positive: true }),
              sell: amount({ positive: true }),
            })
            .partial()
            .optional(),
        ]),
      ),
    )
    .partial()

  const schema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be yyyy-mm-dd'),
    rates: rateMap.optional(),
    people: z
      .array(
        z.object({
          id: z.string(),
          name: z.string().optional(),
          debt: amountMap.optional(),
          capital: amountMap.optional(),
        }),
      )
      .optional(),
    registers: z
      .array(
        z.object({
          id: z.string(),
          name: z.string().optional(),
          amount: amount(),
        }),
      )
      .optional(),
    startingCapitalUsd: amount(),
  })

  schemaCache.set(key, schema)
  return schema
}

// Validate a snapshot against the active currency list. Returns { valid,
// fieldErrors, list }. fieldErrors is keyed by a dotted path (e.g.
// "rates.USD.buy", "people.<id>.debt.EUR") so the form can highlight the exact
// input. `allowed` defaults to the seeded currency set.
export function validateSnapshot(snapshot, allowed = {}) {
  const codes = allowed.codes ?? DEFAULT_CODES
  const rateCodes = allowed.rateCodes ?? DEFAULT_RATE_CODES
  const result = snapshotSchemaFor(codes, rateCodes).safeParse(snapshot)
  if (result.success) return { valid: true, fieldErrors: {}, list: [] }

  const fieldErrors = {}
  const list = []
  for (const issue of result.error.issues) {
    // Rewrite people[index] paths to people.<id> so keys are stable across
    // reorders and match what the form uses to address inputs.
    const parts = [...issue.path]
    if (parts[0] === 'people' && typeof parts[1] === 'number') {
      const person = snapshot.people?.[parts[1]]
      if (person) parts[1] = person.id
    }
    if (parts[0] === 'registers' && typeof parts[1] === 'number') {
      const reg = snapshot.registers?.[parts[1]]
      if (reg) parts[1] = reg.id
    }
    const key = parts.join('.')
    fieldErrors[key] = issue.message
    list.push({ key, message: issue.message })
  }
  return { valid: false, fieldErrors, list }
}
