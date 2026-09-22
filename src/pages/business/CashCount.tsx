import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarCheck, ClipboardList, Plus, Undo2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Amount } from '@/components/money/Amount'
import { AmountInput } from '@/components/money/AmountInput'
import { Flag } from '@/components/money/Flag'
import { CurrencySelect } from '@/components/money/CurrencySelect'
import { EmptyState, RowsSkeleton } from '@/components/layout/states'
import { SectionHeader } from '@/components/layout/Section'
import { useConfirm } from '@/components/layout/Confirm'
import { FieldError } from '@/pages/auth/Login'
import { cashCountSchema } from '@/lib/schema/forms'
import { applyServerErrors } from '@/lib/formErrors'
import { cn } from '@/lib/utils'
import { addAmounts, formatWhole, isZero, subtractAmounts } from '@/lib/money'
import {
  useCashCounts,
  useCountCash,
  useCountSheet,
  useCurrencies,
  useExponents,
  useReverseCashCount,
} from '@/lib/hooks'

/**
 * Закриття дня.
 *
 * Тут вводиться **факт**, а не рух: скільки насправді лежить у кожній касі й
 * скільки готівки поза ними. Різницю з обліком проводить сервер, і саме вона
 * стає виторгом дня (надлишок) або витратою (нестача) — тому продажі не треба
 * вносити окремо.
 *
 * Порожнє поле означає «не рахував» і не змінює нічого. Нуль означає
 * «порахував, там порожньо» і списує залишок. Ця різниця — головне, що форма
 * має показувати явно.
 */
export function CashCount({ showTitle = true }) {
  const counts = useCashCounts()

  return (
    <section className="space-y-3">
      <SectionHeader icon={CalendarCheck} title={showTitle ? 'Закриття дня' : null}>
        {/* Кнопка живе в шапці сторінки — тут лишається сама історія. */}
      </SectionHeader>

      {counts.isLoading && <RowsSkeleton rows={2} />}

      {counts.data?.length === 0 && (
        <EmptyState
          icon={CalendarCheck}
          title="Перерахунків ще не було"
          description="Увечері введіть підсумки кас і готівки — різницю з обліком система проведе сама."
        />
      )}

      {counts.data?.length > 0 && (
        <div className="space-y-1.5">
          {counts.data.map((count) => (
            <CountRow key={count.id} count={count} />
          ))}
        </div>
      )}
    </section>
  )
}

function CountRow({ count }) {
  const reverse = useReverseCashCount()
  const confirm = useConfirm()
  const changed = count.lines.filter((line) => !isZero(line.delta))
  const date = new Date(count.countedAt)
  const reversed = Boolean(count.reversedAt)

  return (
    <Card className={reversed ? 'opacity-60' : undefined}>
      <CardContent className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 p-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })}
            <span className="ml-2 font-normal text-muted-foreground">
              {date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </p>
          {count.note && <p className="truncate text-xs text-muted-foreground">{count.note}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {changed.length === 0 && (
            <span className="text-muted-foreground">Збіглося з обліком</span>
          )}
          {/* Скасований перерахунок лишається видимим і закресленим: помилка —
              теж частина історії, і ховати її означало б робити вигляд, що
              цифри ніколи не було. */}
          {changed.map((line, index) => (
            <Amount
              key={index}
              value={line.delta}
              currency={line.currency}
              size="sm"
              colored={!reversed}
              signed
              className={reversed ? 'line-through' : undefined}
            />
          ))}

          {reversed ? (
            <Badge variant="outline" className="text-muted-foreground">
              Скасовано
            </Badge>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              disabled={reverse.isPending}
              onClick={async () => {
                const ok = await confirm({
                  title: 'Скасувати цей перерахунок?',
                  description:
                    'Залишки кас і виторг повернуться до попередніх. Запис лишиться в історії позначеним як скасований.',
                  confirmLabel: 'Скасувати перерахунок',
                  cancelLabel: 'Залишити',
                  destructive: true,
                })
                if (ok) reverse.mutate(count.id)
              }}
            >
              <Undo2 className="size-4" aria-hidden /> Скасувати
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function CashCountDialog({ trigger }) {
  const [open, setOpen] = useState(false)
  const sheet = useCountSheet(open)
  const save = useCountCash()
  const { data: currencies = [] } = useCurrencies()

  const form = useForm({
    resolver: zodResolver(cashCountSchema),
    defaultValues: { registers: [], cash: [], note: '' },
  })

  // Рядки приходять із сервера, тому форма перезбирається, коли аркуш
  // завантажився — і кожного разу з порожніми сумами: попередній залишок є
  // підказкою поруч, але ніколи не підставляється у поле. Інакше «зберегти»
  // не подумавши підтвердило б облік замість того, щоб його перевірити.
  useEffect(() => {
    if (!sheet.data) return
    form.reset({
      registers: sheet.data.registers.map((r) => ({ registerId: r.id, amount: '' })),
      cash: sheet.data.cash.map((c) => ({ currency: c.currency, amount: '' })),
      note: '',
    })
    setPrefilled(false)
  }, [sheet.data, form])

  const values = form.watch()
  const exponents = useExponents()
  const exponentOf = (code) => exponents[code] ?? 2
  const cashRows = values.cash ?? []
  const cashBalances = new Map((sheet.data?.cash ?? []).map((c) => [c.currency, c.balance]))
  const [prefilled, setPrefilled] = useState(false)

  /**
   * Підставити поточні залишки в усі поля.
   *
   * За вечір змінюються одна-дві позиції з семи, а решта та сама. Заповнювати
   * незмінне вручну — половина роботи ні за чим; із підстановкою лишається
   * поправити те, що справді зрушило.
   *
   * Вимикач повертає поля в порожній стан, а не в нулі: порожнє означає «не
   * рахував», і плутати це з «порахував, там нуль» не можна.
   */
  const togglePrefill = (next) => {
    setPrefilled(next)
    form.setValue(
      'registers',
      (sheet.data?.registers ?? []).map((r) => ({
        registerId: r.id,
        amount: next ? r.balance : '',
      })),
      { shouldValidate: true },
    )
    form.setValue(
      'cash',
      cashRows.map((row) => ({
        currency: row.currency,
        amount: next ? (cashBalances.get(row.currency) ?? '0') : '',
      })),
      { shouldValidate: true },
    )
  }

  const addCurrency = (code) => {
    if (cashRows.some((row) => row.currency === code)) return
    form.setValue('cash', [...cashRows, { currency: code, amount: '' }], { shouldValidate: true })
  }

  const removeCurrency = (code) => {
    form.setValue(
      'cash',
      cashRows.filter((row) => row.currency !== code),
      { shouldValidate: true },
    )
  }

  const onSubmit = form.handleSubmit(async (formValues) => {
    // Незаповнені рядки не їдуть узагалі — «не рахував» не має нічого міняти.
    const filled = (rows) => rows.filter((row) => row.amount !== '' && row.amount != null)
    try {
      await save.mutateAsync({
        body: {
          registers: filled(formValues.registers ?? []),
          cash: filled(formValues.cash ?? []),
          note: formValues.note || undefined,
        },
        key: crypto.randomUUID(),
      })
      setOpen(false)
    } catch (error) {
      applyServerErrors(form, error)
    }
  })

  const registers = sheet.data?.registers ?? []
  const unusedCurrencies = currencies.filter(
    (c) => !cashRows.some((row) => row.currency === c.code),
  )

  /**
   * Що саме проведеться — по валютах, ще до збереження.
   *
   * Сервер порахує це сам і під блокуванням, але побачити «сьогодні +2 100 ₴
   * виторгу» треба до натискання, а не в тості після: помилку в сумі ловлять
   * саме тут. Різниці в межах однієї валюти складаються, бо так їх і проведе
   * журнал — переклали з каси в касу, і виторгу немає.
   */
  const pending = []
  const netByCurrency = new Map()
  const add = (currency, delta) =>
    netByCurrency.set(currency, addAmounts(netByCurrency.get(currency) ?? '0', delta))

  for (const [index, register] of registers.entries()) {
    const typed = values.registers?.[index]?.amount
    if (typed === '' || typed == null) continue
    add(register.currency, subtractAmounts(typed, register.balance))
  }
  for (const row of cashRows) {
    if (row.amount === '' || row.amount == null) continue
    add(row.currency, subtractAmounts(row.amount, cashBalances.get(row.currency) ?? '0'))
  }
  for (const [currency, delta] of netByCurrency) {
    if (!isZero(delta)) pending.push({ currency, delta })
  }
  const countedAnything = [...(values.registers ?? []), ...cashRows].some(
    (row) => row.amount !== '' && row.amount != null,
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <ClipboardList className="size-4" aria-hidden /> Порахувати
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Закриття дня</DialogTitle>
          <DialogDescription>
            Скільки є насправді. Різницю проведемо самі: надлишок — виторг, нестача — витрата.
            Порожнє поле — «не рахував».
          </DialogDescription>
        </DialogHeader>

        {sheet.isLoading && <RowsSkeleton rows={3} />}

        {sheet.data && (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <Checkbox checked={prefilled} onCheckedChange={togglePrefill} />
              <span>Підставити поточні залишки</span>
              <span className="ml-auto text-xs text-muted-foreground">і поправити, що змінилось</span>
            </label>

            {registers.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Каси</p>
                <div className="divide-y overflow-hidden rounded-lg border">
                  {registers.map((register, index) => (
                    <CountField
                      key={register.id}
                      id={`count-register-${register.id}`}
                      label={register.name}
                      currency={register.currency}
                      previous={register.balance}
                      value={values.registers?.[index]?.amount ?? ''}
                      onChange={(next) =>
                        form.setValue(`registers.${index}.amount`, next ?? '', {
                          shouldValidate: true,
                        })
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Готівка поза касами</p>
              {cashRows.length === 0 && (
                <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                  Додайте валюту, якщо тримаєте готівку окремо від кас.
                </p>
              )}
              {cashRows.length > 0 && (
                <div className="divide-y overflow-hidden rounded-lg border">
                  {cashRows.map((row, index) => (
                    <CountField
                      key={row.currency}
                      id={`count-cash-${row.currency}`}
                      label={row.currency}
                      currency={row.currency}
                      previous={cashBalances.get(row.currency) ?? '0'}
                      value={row.amount ?? ''}
                      onChange={(next) =>
                        form.setValue(`cash.${index}.amount`, next ?? '', { shouldValidate: true })
                      }
                      onRemove={() => removeCurrency(row.currency)}
                    />
                  ))}
                </div>
              )}

              {unusedCurrencies.length > 0 && (
                <AddCurrency options={unusedCurrencies} onAdd={addCurrency} />
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="count-note" className="text-xs text-muted-foreground">
                Нотатка
              </Label>
              <Input
                id="count-note"
                className="h-9"
                placeholder="Інкасація ввечері"
                {...form.register('note')}
              />
              <FieldError message={form.formState.errors.note?.message} />
            </div>

            <FieldError message={form.formState.errors.registers?.message} />
            <FieldError message={form.formState.errors.root?.message} />

            {/* Підсумок стоїть просто над кнопкою: це останнє, що людина бачить
                перед тим, як провести день. */}
            {pending.length > 0 && (
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Буде проведено
                </p>
                <div className="space-y-1">
                  {pending.map((row) => (
                    <div key={row.currency} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Flag code={row.currency} />
                        {row.delta.startsWith('-') ? 'нестача' : 'виторг'}
                      </span>
                      <span
                        className={cn(
                          'tabular-nums font-medium',
                          row.delta.startsWith('-') ? 'text-destructive' : 'text-success',
                        )}
                      >
                        {formatWhole(row.delta, {
                          exponent: exponentOf(row.currency),
                          sign: 'always',
                        })}{' '}
                        <span className="font-normal text-muted-foreground">{row.currency}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {countedAnything && pending.length === 0 && (
              <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                Усе збіглося з обліком — проводити нічого, але перерахунок збережеться.
              </p>
            )}

            <DialogFooter className="sm:justify-between">
              <p className="hidden text-xs text-muted-foreground sm:block">
                Порожні поля не змінять нічого
              </p>
              <Button type="submit" disabled={save.isPending || !countedAnything}>
                {save.isPending ? 'Зберігаємо…' : 'Зберегти'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Один рядок перерахунку: скільки порахували, скільки каже облік, і різниця
 * між ними — одразу, до збереження. Побачити «−1 200» перед натисканням
 * набагато корисніше, ніж прочитати про це в історії наступного дня.
 */
/**
 * Один рядок перерахунку.
 *
 * Назва й поточний облік ліворуч, поле праворуч, різниця під полем. Раніше це
 * було три рядки заввишки на кожну касу, і форма з п'яти позицій уже не
 * вміщалася в екран — а вводять її щовечора.
 */
/**
 * Один рядок перерахунку.
 *
 * Назва й поточний облік ліворуч, поле праворуч, різниця під назвою — усе в
 * один рядок заввишки. Порахований рядок трохи підсвічений: коли позицій
 * п'ять, «що я вже ввів» має бути видно поглядом, а не звірянням.
 */
function CountField({ id, label, currency, previous, value, onChange, onRemove }) {
  const exponents = useExponents()
  const exponent = exponents[currency] ?? 2
  const counted = value !== '' && value != null
  const delta = counted ? subtractAmounts(value, previous) : null
  // Рядок із залишком прибрати не можна — прибирання означає «не рахував», і
  // гроші лишились би на місці. Щоб їх списати, треба ввести нуль, і кнопка
  // поруч робить саме це: вона не ховає рядок, а каже «тут порожньо».
  const hasBalance = !isZero(previous)

  return (
    <div
      className={cn(
        'grid grid-cols-[1fr_8.5rem] items-center gap-2 px-3 py-2 transition-colors sm:grid-cols-[1fr_10rem] sm:gap-3',
        counted && 'bg-accent/40',
      )}
    >
      <div className="min-w-0">
        <Label htmlFor={id} className="flex items-center gap-2">
          <Flag code={currency} />
          <span className="truncate">{label}</span>
          {onRemove && !hasBalance && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Прибрати ${label} з переліку`}
              title="Прибрати рядок — залишок не зміниться"
              className="ml-0.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          )}
          {hasBalance && !counted && (
            <button
              type="button"
              onClick={() => onChange('0')}
              title="Порахувати як нуль — залишок спишеться"
              className="ml-0.5 rounded border px-1 text-[10px] leading-4 text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
            >
              обнулити
            </button>
          )}
        </Label>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
          <span>було {formatWhole(previous, { exponent })}</span>
          {delta !== null &&
            (isZero(delta) ? (
              <span>· збігається</span>
            ) : (
              <span className={delta.startsWith('-') ? 'text-destructive' : 'text-success'}>
                · {formatWhole(delta, { exponent, sign: 'always' })}
              </span>
            ))}
        </p>
      </div>
      <AmountInput id={id} currency={currency} value={value} onChange={onChange} whole />
    </div>
  )
}

function AddCurrency({ options, onAdd }) {
  const [picking, setPicking] = useState(false)

  if (!picking) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 text-muted-foreground"
        onClick={() => setPicking(true)}
      >
        <Plus className="size-4" aria-hidden /> Додати валюту
      </Button>
    )
  }

  return (
    <CurrencySelect
      value=""
      only={options.map((c) => c.code)}
      onChange={(code) => {
        onAdd(code)
        setPicking(false)
      }}
    />
  )
}
