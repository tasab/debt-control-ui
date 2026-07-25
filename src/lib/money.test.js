import { describe, expect, it } from 'vitest'
import {
  addAmounts,
  compareAmount,
  formatAmount,
  formatBps,
  formatMoney,
  parseAmountInput,
  toInputValue,
} from './money.js'

describe('formatAmount', () => {
  it('places the decimal point by exponent, not by dividing', () => {
    expect(formatAmount('100050', { exponent: 2, locale: 'en-US' })).toBe('1,000.50')
    expect(formatAmount('5', { exponent: 2, locale: 'en-US' })).toBe('0.05')
    expect(formatAmount('0', { exponent: 2, locale: 'en-US' })).toBe('0.00')
    expect(formatAmount('700', { exponent: 0, locale: 'en-US' })).toBe('700')
  })

  it('survives amounts larger than Number.MAX_SAFE_INTEGER', () => {
    // 90 071 992 547 409.93 — one kopiyka past what a float can represent.
    expect(formatAmount('9007199254740993', { exponent: 2, locale: 'en-US' })).toBe(
      '90,071,992,547,409.93',
    )
  })

  it('uses a real minus sign so it cannot be read as a hyphen', () => {
    expect(formatAmount('-2500', { exponent: 2, locale: 'en-US' })).toBe('−25.00')
  })

  it('appends the currency code when asked', () => {
    expect(formatMoney('100050', 'UAH', { exponent: 2, locale: 'en-US' })).toBe('1,000.50 UAH')
  })
})

describe('parseAmountInput', () => {
  it('accepts what people actually type', () => {
    expect(parseAmountInput('1000.50', 2).value).toBe('100050')
    expect(parseAmountInput('1000,50', 2).value).toBe('100050')
    expect(parseAmountInput('1 000,50', 2).value).toBe('100050')
    expect(parseAmountInput('₴1 000,50', 2).value).toBe('100050')
    expect(parseAmountInput('7', 2).value).toBe('700')
    expect(parseAmountInput('0.05', 2).value).toBe('5')
  })

  it('handles a partially typed number without complaining', () => {
    expect(parseAmountInput('', 2)).toEqual({ value: null, error: null })
    expect(parseAmountInput('1.', 2).value).toBe('100')
  })

  it('refuses more decimals than the currency has', () => {
    expect(parseAmountInput('1.005', 2).error).toMatch(/2 знаки/)
    expect(parseAmountInput('1.5', 0).error).toBeTruthy()
  })

  it('round-trips through toInputValue', () => {
    for (const text of ['0.01', '12.34', '1000000.99']) {
      const { value } = parseAmountInput(text, 2)
      expect(toInputValue(value, 2)).toBe(text)
    }
  })
})

describe('comparison helpers', () => {
  it('compares as integers, not as strings', () => {
    // '9' > '10' as strings; as amounts it is the other way round.
    expect(compareAmount('9', '10')).toBe(-1)
    expect(compareAmount('10000000000000000000', '1')).toBe(1)
  })

  it('adds without precision loss', () => {
    expect(addAmounts('9007199254740993', '1')).toBe('9007199254740994')
  })
})

describe('formatBps', () => {
  it('renders basis points as a percentage', () => {
    expect(formatBps(1800, { locale: 'en-US' })).toBe('18%')
    expect(formatBps(50, { locale: 'en-US' })).toBe('0.5%')
  })
})
