import { cn } from '@/lib/utils'
import { formatAmount, isNegative, isZero } from '@/lib/money'
import { useExponents } from '@/lib/hooks'

/**
 * The only way an amount reaches the screen (CLIENT_PLAN §3).
 *
 * Sign, colour, grouping and the currency code all live here, so a balance
 * looks the same on every page and no component is tempted to do arithmetic on
 * its way to a string.
 */
export function Amount({
  value,
  currency,
  className,
  colored = false,
  signed = false,
  showCurrency = true,
  size = 'base',
}) {
  const exponents = useExponents()
  const exponent = exponents[currency] ?? 2

  const negative = isNegative(value)
  const zero = isZero(value)
  const text = formatAmount(value, {
    exponent,
    sign: signed && !negative && !zero ? 'always' : 'auto',
  })

  return (
    <span
      className={cn(
        'tabular-nums whitespace-nowrap',
        size === 'lg' && 'text-2xl font-semibold tracking-tight',
        size === 'sm' && 'text-sm',
        colored && !zero && (negative ? 'text-destructive' : 'text-success'),
        className,
      )}
      // Screen readers otherwise read "1 000,50" as three separate numbers.
      aria-label={`${text}${showCurrency ? ` ${currency}` : ''}`}
    >
      {text}
      {showCurrency && <span className="ml-1 text-muted-foreground">{currency}</span>}
    </span>
  )
}

/** A balance with its label, used across wallet cards and dashboards. */
export function AmountBlock({ label, value, currency, hint, colored, className }) {
  return (
    <div className={cn('space-y-1', className)}>
      <div className="text-sm text-muted-foreground">{label}</div>
      <Amount value={value} currency={currency} size="lg" colored={colored} />
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}
