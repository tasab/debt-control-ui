import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { parseAmountInput, toInputValue } from '@/lib/money'
import { useExponents } from '@/lib/hooks'
import { CurrencyCode } from '@/components/money/Flag'

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
  // Голий «0» — так попросив власник: приклад на кшталт «1 500» плутали з
  // підказкою, скільки вводити. Без копійок, бо поле приймає лише цілі.
  placeholder = '0',
  autoFocus,
  id,
  max,
  onMax,
  whole = true,
}) {
  const exponents = useExponents()
  // `whole` — поле для цілих сум, і за замовчуванням таке кожне: копійок у
  // цьому обліку ніхто не вводить, а зайві два знаки лише сповільнюють ввід.
  // У журнал сума все одно йде в мінорних одиницях: міняється ввід, не облік.
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
    // Порожнє значення, яке поле саме ж і віддало через помилку вводу, — не
    // скидання ззовні: витерти текст тут означало б з’їсти те, що людина
    // зараз виправляє.
    const invalid = (whole && /[.,]/.test(text)) || parseAmountInput(text, exponent).error
    if (invalid && (value === '' || value == null)) return
    const current = toMinor(parseAmountInput(text, exponent).value)
    if (value !== current) setText(toInputValue(toField(value), exponent))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, exponent])

  const handle = (event) => {
    const next = event.target.value
    setText(next)
    // Ціле поле не мовчить про кому: просто викинути її означало б, що
    // «20,5» тихо стає «205» — у десять разів більше. Тож сума скидається,
    // поки кому не приберуть, і кнопка запису не дасть зберегти.
    if (whole && /[.,]/.test(next)) {
      setLocalError('Лише цілі числа, без копійок')
      onChange(null)
      return
    }
    const { value: parsed, error: parseError } = parseAmountInput(next, exponent)
    setLocalError(parseError)
    if (!parseError) onChange(toMinor(parsed))
  }

  // Помилка самого вводу точніша за помилку форми: «лише цілі» пояснює, що
  // не так, а «введіть суму» — ні.
  const message = localError ?? error

  return (
    <div className="space-y-1">
      <div className="relative">
        <Input
          id={id}
          value={text}
          onChange={handle}
          placeholder={placeholder}
          autoFocus={autoFocus}
          // `numeric` — клавіатура без роздільника для цілих сум, `decimal` —
          // з ним; `text` keeps pasted values like "1 000,50" intact.
          inputMode={whole ? 'numeric' : 'decimal'}
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
            // Прапорець біля коду займає ще ~1.5rem.
            onMax && max ? 'pr-30 sm:pr-38' : 'pr-20',
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
          <CurrencyCode code={currency} />
        </div>
      </div>
      {message && <p className="text-xs text-destructive">{message}</p>}
    </div>
  )
}
