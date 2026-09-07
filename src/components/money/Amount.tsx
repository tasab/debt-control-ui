import { cn } from '@/lib/utils'
import { formatAmount, formatWhole, isNegative, isZero } from '@/lib/money'
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
  // `whole` — сума без копійок. Для підсумків у сотнях тисяч два останні
  // знаки нічого не додають: вони однакові в кожному рядку й лише крадуть
  // ширину в самої цифри. Округлення тут суто для показу — у журнал і в
  // запити йде рівно те, що прийшло з сервера.
  whole = false,
  size = 'base',
}) {
  const exponents = useExponents()
  const exponent = exponents[currency] ?? 2

  const negative = isNegative(value)
  const zero = isZero(value)
  const format = whole ? formatWhole : formatAmount
  const text = format(value, {
    exponent,
    sign: signed && !negative && !zero ? 'always' : 'auto',
  })

  return (
    <span
      className={cn(
        'tabular-nums whitespace-nowrap',
        // На телефоні великий кегль на крок менший: у двоколонковій сітці
        // семизначна сума в text-2xl вилазить за край картки, а перенести її
        // не можна — число не розривається.
        size === 'lg' && 'text-xl font-semibold tracking-tight sm:text-2xl',
        size === 'xl' && 'text-3xl font-semibold tracking-tight sm:text-4xl',
        size === 'sm' && 'text-sm',
        colored && !zero && (negative ? 'text-destructive' : 'text-success'),
        className,
      )}
      // Screen readers otherwise read "1 000,50" as three separate numbers.
      // Валюта озвучується завжди, навіть коли на екрані її не видно: там її
      // підказує сусідній підпис, а на слух підказки немає.
      aria-label={`${text} ${currency}`}
    >
      {text}
      {showCurrency && <span className="ml-1 text-muted-foreground">{currency}</span>}
    </span>
  )
}

/** A balance with its label, used across wallet cards and dashboards. */
export function AmountBlock({
  icon: Icon,
  iconClassName,
  label,
  value,
  currency,
  hint,
  colored,
  whole = false,
  showCurrency,
  size = 'lg',
  className,
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {/* Іконка бере тон картки, підпис лишається приглушеним: інакше
            кольоровим стає весь рядок і сперечається з самою цифрою. */}
        {Icon && <Icon className={cn('size-3.5 shrink-0', iconClassName)} aria-hidden />}
        {label}
      </div>
      <Amount
        value={value}
        currency={currency}
        size={size}
        colored={colored}
        whole={whole}
        showCurrency={showCurrency}
      />
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}
