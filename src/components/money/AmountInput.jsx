import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { parseAmountInput, toInputValue } from '@/lib/money'
import { useExponents } from '@/lib/hooks'

/**
 * The user types "1000.50"; the form receives "100050".
 *
 * Local text state is kept separate from the emitted value so a half-typed
 * "1." or "0," survives a re-render — reformatting on every keystroke is what
 * makes amount inputs infuriating to type into.
 */
export function AmountInput({
  value,
  onChange,
  currency,
  className,
  error,
  placeholder = '0.00',
  autoFocus,
  id,
  max,
  onMax,
}) {
  const exponents = useExponents()
  const exponent = exponents[currency] ?? 2
  const [text, setText] = useState(() => toInputValue(value, exponent))
  const [localError, setLocalError] = useState(null)

  // Re-sync when the value is changed from outside (a "max" button, a reset, or
  // the other side of the FX form) — but not while the user is mid-edit.
  useEffect(() => {
    const current = parseAmountInput(text, exponent).value
    if (value !== current) setText(toInputValue(value, exponent))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, exponent])

  const handle = (event) => {
    const next = event.target.value
    setText(next)
    const { value: parsed, error: parseError } = parseAmountInput(next, exponent)
    setLocalError(parseError)
    if (!parseError) onChange(parsed)
  }

  const message = error ?? localError

  return (
    <div className="space-y-1">
      <div className="relative">
        <Input
          id={id}
          value={text}
          onChange={handle}
          placeholder={placeholder}
          autoFocus={autoFocus}
          // `decimal` gives phones a keypad with a separator, `text` keeps
          // pasted values like "1 000,50" intact.
          inputMode="decimal"
          type="text"
          autoComplete="off"
          aria-invalid={message ? 'true' : undefined}
          className={cn('pr-24 text-right tabular-nums', message && 'border-destructive', className)}
        />
        <div className="absolute inset-y-0 right-3 flex items-center gap-2 text-sm text-muted-foreground">
          {onMax && max && (
            <button
              type="button"
              onClick={() => onMax(max)}
              className="rounded px-1.5 py-0.5 text-xs font-medium text-primary hover:bg-accent"
            >
              Уся сума
            </button>
          )}
          <span>{currency}</span>
        </div>
      </div>
      {message && <p className="text-xs text-destructive">{message}</p>}
    </div>
  )
}
