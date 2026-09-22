import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { HandCoins, PiggyBank, Receipt, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Amount } from '@/components/money/Amount'
import { AmountInput } from '@/components/money/AmountInput'
import { CurrencySelect } from '@/components/money/CurrencySelect'
import { EmptyState, RowsSkeleton } from '@/components/layout/states'
import { SectionHeader } from '@/components/layout/Section'
import { ProfitChart } from './ProfitChart.tsx'
import { FieldError } from '@/pages/auth/Login'
import { spendingSchema } from '@/lib/schema/forms'
import { applyServerErrors } from '@/lib/formErrors'
import { isZero } from '@/lib/money'
import { cn } from '@/lib/utils'
import { useMonthly, useRegisters, useSpend } from '@/lib/hooks'

const MONTHS = [
  'січень', 'лютий', 'березень', 'квітень', 'травень', 'червень',
  'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень',
]

const monthLabel = (key) => {
  const [year, month] = key.split('-')
  return `${MONTHS[Number(month) - 1]} ${year}`
}

/**
 * Витрати, вилучення й помісячний підсумок.
 *
 * Головне тут — різниця між двома способами винести гроші з каси. Зарплата чи
 * оренда — витрата: бізнес справді став біднішим. Гроші, які власник забрав
 * собі, — ні: вони не зникли, їх роздали, і рахувати їх витратою означало б
 * показувати нульовий прибуток щомісяця, скільки б бізнес не заробив.
 *
 * Закривати місяць не треба: журнал знає дату кожної проводки, тож обнулена
 * наприкінці місяця каса на ці числа не впливає.
 */
export function Spending({ showTitle = true }) {
  const report = useMonthly()

  return (
    <section className="space-y-3">
      <SectionHeader icon={TrendingUp} title={showTitle ? 'Заробіток по місяцях' : null}>
        <SpendDialog kind="capital" />
        <SpendDialog kind="expense" />
        <SpendDialog kind="draw" />
      </SectionHeader>

      {/* Графік перший: питання «чи росте заробіток» читається з лінії за
          секунду, а таблиця по місяцях відповідає на «скільки саме». */}
      <ProfitChart />

      {report.isLoading && <RowsSkeleton rows={3} />}

      {report.data?.months?.length === 0 && (
        <EmptyState
          icon={Receipt}
          title="Ще немає що показати"
          description="Місяць з’явиться тут, щойно буде перший виторг або витрата."
        />
      )}

      {report.data?.months?.length > 0 && (
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Усе в {report.data.baseCurrency} за поточним курсом
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {/* Одні й ті самі числа двома розкладками. Шість колонок цифр
                читаються поглядом лише тоді, коли всі вміщаються на екран; на
                телефоні та сама таблиця перетворювалася на смугу завширшки
                42rem, яку доводилося возити пальцем туди-сюди на кожен рядок.
                Тому там місяць — картка, де головне число стоїть окремо. */}
            <div className="space-y-2 lg:hidden">
              {report.data.months.map((row) => (
                <MonthCard key={row.month} row={row} currency={report.data.baseCurrency} />
              ))}
              <MonthCard
                row={{ month: null, ...report.data.total }}
                currency={report.data.baseCurrency}
                total
              />
            </div>

            <div className="hidden lg:block">
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-6 gap-y-2 text-sm">
                <span />
                <span className="text-right text-xs text-muted-foreground">Виторг</span>
                <span className="text-right text-xs text-muted-foreground">Витрати</span>
                <span className="text-right text-xs text-muted-foreground">Прибуток</span>
                <span className="text-right text-xs text-muted-foreground">Внесено</span>
                <span className="text-right text-xs text-muted-foreground">Забрано</span>

                {report.data.months.map((row) => (
                  <Row key={row.month} row={row} currency={report.data.baseCurrency} />
                ))}

                <span className="border-t pt-2 font-medium">Разом</span>
                <span className="border-t pt-2 text-right">
                  <Amount value={report.data.total.income} currency={report.data.baseCurrency} size="sm" showCurrency={false} />
                </span>
                <span className="border-t pt-2 text-right">
                  <Amount value={report.data.total.expense} currency={report.data.baseCurrency} size="sm" showCurrency={false} />
                </span>
                <span className="border-t pt-2 text-right font-medium">
                  <Amount value={report.data.total.profit} currency={report.data.baseCurrency} size="sm" colored showCurrency={false} />
                </span>
                <span className="border-t pt-2 text-right text-muted-foreground">
                  <Amount value={report.data.total.capital} currency={report.data.baseCurrency} size="sm" showCurrency={false} />
                </span>
                <span className="border-t pt-2 text-right text-muted-foreground">
                  <Amount value={report.data.total.draw} currency={report.data.baseCurrency} size="sm" showCurrency={false} />
                </span>
              </div>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              «Внесено» і «Забрано» — рух ваших власних грошей. Вони міняють касу, але не
              прибуток: принесене не стає заробленим, а зароблене не перестає ним бути від
              того, що ви його забрали.
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  )
}

/**
 * Місяць на телефоні — картка.
 *
 * Прибуток винесено вгору поруч із назвою місяця: це єдине число, заради
 * якого сюди заходять, а виторг із витратами — те, з чого воно склалося.
 * Внесене й забране стоять окремим рядком і приглушені, бо це рух власних
 * грошей, який до прибутку не додається.
 */
function MonthCard({ row, currency, total = false }) {
  const own = !isZero(row.capital) || !isZero(row.draw)

  return (
    <div className={cn('rounded-lg border px-3 py-2.5', total && 'bg-muted/50')}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate font-medium">{total ? 'Разом' : monthLabel(row.month)}</span>
        <Amount value={row.profit} currency={currency} colored showCurrency={false} />
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
        <span>
          Виторг <Amount value={row.income} currency={currency} size="sm" showCurrency={false} />
        </span>
        <span>
          Витрати <Amount value={row.expense} currency={currency} size="sm" showCurrency={false} />
        </span>
      </div>
      {own && (
        <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground/80">
          {!isZero(row.capital) && (
            <span>
              Внесено{' '}
              <Amount value={row.capital} currency={currency} size="sm" showCurrency={false} />
            </span>
          )}
          {!isZero(row.draw) && (
            <span>
              Забрано <Amount value={row.draw} currency={currency} size="sm" showCurrency={false} />
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ row, currency }) {
  return (
    <>
      <span className="font-medium">{monthLabel(row.month)}</span>
      <span className="text-right">
        <Amount value={row.income} currency={currency} size="sm" showCurrency={false} />
      </span>
      <span className="text-right">
        <Amount value={row.expense} currency={currency} size="sm" showCurrency={false} />
      </span>
      <span className="text-right font-medium">
        <Amount value={row.profit} currency={currency} size="sm" colored showCurrency={false} />
      </span>
      <span className="text-right text-muted-foreground">
        <Amount value={row.capital} currency={currency} size="sm" showCurrency={false} />
      </span>
      <span className="text-right text-muted-foreground">
        <Amount value={row.draw} currency={currency} size="sm" showCurrency={false} />
      </span>
    </>
  )
}

/**
 * Три способи зрушити гроші повз касовий перерахунок.
 *
 * Різниця між ними — не в сумі, а в тому, що вона означає. Витрата зменшує
 * прибуток, вилучення й внесок — ні: власні гроші не стають заробітком від
 * того, що полежали в касі, і не перестають бути заробітком від того, що їх
 * забрали.
 */
export const SPEND_KINDS = {
  expense: {
    label: 'Витрата',
    title: 'Витрата',
    icon: Receipt,
    variant: 'default',
    description:
      'Зарплати, оренда, закупівля. Каса зменшиться, і на цю суму впаде прибуток за місяць.',
    placeholder: 'Зарплати за вересень',
  },
  draw: {
    label: 'Забрати собі',
    title: 'Вилучення прибутку',
    icon: HandCoins,
    variant: 'outline',
    description:
      'Гроші, які ви забрали собі. Каса зменшиться, але прибуток за місяць залишиться таким, яким був — ви його заробили.',
    placeholder: 'Прибуток за вересень',
  },
  capital: {
    label: 'Внести своє',
    title: 'Внесок власника',
    icon: PiggyBank,
    variant: 'outline',
    description:
      'Власні гроші в обігу. Якщо приносите їх зараз — каса зросте. Якщо вони вже в касі й перерахунок записав їх виторгом — оберіть «вже в касі», і сума перейде з виторгу у ваш капітал.',
    placeholder: 'Власні кошти в обіг',
  },
}

/**
 * `trigger` дозволяє тій самій дії стояти і дрібною кнопкою в заголовку
 * розділу, і плиткою у швидких діях бізнесу: діалог один, вигляд кнопки —
 * справа того місця, де вона стоїть.
 */
export function SpendDialog({ kind, trigger }) {
  const [open, setOpen] = useState(false)
  const spend = useSpend()
  const registers = useRegisters()
  const preset = SPEND_KINDS[kind]
  const incoming = kind === 'capital'

  const form = useForm({
    resolver: zodResolver(spendingSchema),
    defaultValues: { kind, source: 'cash', currency: 'UAH', amount: '', comment: '' },
  })
  const { source, currency, amount } = form.watch()

  const sources = [
    // Для внеску є ще один «звідки»: гроші вже в касі, просто перерахунок
    // записав їх виторгом. Тоді нічого не рухається, крім класифікації.
    ...(incoming
      ? [{ value: 'income', label: 'Вже в касі — списати з виторгу' }]
      : []),
    { value: 'cash', label: `Готівка поза касами (${currency})` },
    ...(registers.data ?? [])
      .filter((r) => r.currency === currency)
      .map((r) => ({ value: `register:${r.id}`, label: `Каса «${r.name}»` })),
  ]

  const reclassifying = incoming && source === 'income'

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await spend.mutateAsync({ body: values, key: crypto.randomUUID() })
      form.reset({ kind, source: 'cash', currency: values.currency, amount: '', comment: '' })
      setOpen(false)
    } catch (error) {
      applyServerErrors(form, error)
    }
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant={preset.variant}>
            <preset.icon className="size-4" aria-hidden />
            {preset.label}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{preset.title}</DialogTitle>
          <DialogDescription>{preset.description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-[1fr_7rem] gap-3 sm:grid-cols-[1fr_8rem] sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor={`spend-amount-${kind}`}>Сума</Label>
              <AmountInput
                id={`spend-amount-${kind}`}
                currency={currency}
                value={amount}
                onChange={(value) => form.setValue('amount', value ?? '', { shouldValidate: true })}
                error={form.formState.errors.amount?.message}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`spend-currency-${kind}`}>Валюта</Label>
              <CurrencySelect
                id={`spend-currency-${kind}`}
                className="w-full"
                value={currency}
                onChange={(value) => {
                  form.setValue('currency', value)
                  // Каса іншої валюти зникає зі списку — джерело скидається,
                  // щоб не лишитись з вибраним, чого вже немає.
                  form.setValue('source', 'cash')
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`spend-source-${kind}`}>{incoming ? 'Звідки гроші' : 'Звідки'}</Label>
            <Select value={source} onValueChange={(value) => form.setValue('source', value)}>
              <SelectTrigger id={`spend-source-${kind}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sources.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={form.formState.errors.source?.message} />
            {reclassifying && (
              <p className="text-xs text-muted-foreground">
                Каса не зміниться — гроші вже в ній. Зменшиться лише виторг, а з ним і прибуток:
                ці кошти ви не заробили, а принесли.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`spend-comment-${kind}`}>Причина</Label>
            <Input
              id={`spend-comment-${kind}`}
              placeholder={preset.placeholder}
              {...form.register('comment')}
            />
            <FieldError message={form.formState.errors.comment?.message} />
          </div>

          <FieldError message={form.formState.errors.root?.message} />
          <DialogFooter>
            <Button type="submit" disabled={spend.isPending}>
              {spend.isPending ? 'Записуємо…' : 'Записати'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
