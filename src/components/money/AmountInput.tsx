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
  // Приклад, а не «0.00»: нуль у порожньому полі читається як уже введена
  // сума, і робота починається з витирання цифр, яких немає. Приклад суми
  // читається інакше: він сірий і його не сплутаєш із власним вводом.
  placeholder = '1 500',
  autoFocus,
  id,
  max,
  onMax,
  whole = false,
}) {
  const exponents = useExponents()
  // `whole` — поле для цілих сум. Копійки при перерахунку каси ніхто не
  // рахує, і зайві два нулі в кожному рядку лише сповільнюють ввід. У журнал
  // сума все одно йде в мінорних одиницях: міняється ввід, не облік.
  const exponent = whole ? 0 : (exponents[currency] ?? 2)
  const scale = whole ? 10n ** BigInt(exponents[currency] ?? 2) : 1n
  // Назовні значення завжди в мінорних одиницях; усередині поля — у тих, які
  // бачить людина, тож при `whole` вони відрізняються на множник.
  const toField = (minor) =>
    minor === '' || minor == null ? '' : (BigInt(minor) / scale).toString()
  const toMinor = (field) => (field == null ? null : (BigInt(field) * scale).toString())

  const [text, setText] = useState(() => toInputValue(toField(value), exponent))
  const [localError, setLocalError] = useState(null)

  // Re-sync when the value is changed from outside (a "max" button, a reset, or
  // the other side of the FX form) — but not while the user is mid-edit.
  useEffect(() => {
    const current = toMinor(parseAmountInput(text, exponent).value)
    if (value !== current) setText(toInputValue(toField(value), exponent))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, exponent])

  const handle = (event) => {
    const next = event.target.value
    setText(next)
    const { value: parsed, error: parseError } = parseAmountInput(next, exponent)
    setLocalError(parseError)
    if (!parseError) onChange(toMinor(parsed))
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
          className={cn(
            'text-right tabular-nums',
            // Reserve exactly as much room as the suffix actually occupies:
            // the currency code alone, or the code plus the "max" button.
            //
            // На телефоні поле стоїть у парі з вибором валюти, і повний
            // напис «Уся сума» лишав під самі цифри сантиметр — тому там
            // кнопка коротша, а з sm: повертається звичний підпис.
            onMax && max ? 'pr-24 sm:pr-32' : 'pr-14',
            message && 'border-destructive',
            className,
          )}
        />
        <div className="absolute inset-y-0 right-3 flex items-center gap-2 text-sm text-muted-foreground">
          {onMax && max && (
            <button
              type="button"
              onClick={() => onMax(max)}
              className="rounded px-1.5 py-1 text-xs font-medium text-primary hover:bg-accent"
            >
              <span className="sm:hidden">Усе</span>
              <span className="hidden sm:inline">Уся сума</span>
            </button>
          )}
          <span>{currency}</span>
        </div>
      </div>
      {message && <p className="text-xs text-destructive">{message}</p>}
    </div>
  )
}
