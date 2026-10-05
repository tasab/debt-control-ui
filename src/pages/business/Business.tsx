import { Fragment, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Collapsible } from 'radix-ui'
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Flag,
  History,
  Info,
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Coins,
  Gauge,
  Minus,
  Pencil,
  PiggyBank,
  Plus,
  Undo2,
  Scale,
  TrendingUp,
  TriangleAlert,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Amount, AmountBlock } from '@/components/money/Amount'
import { AmountInput } from '@/components/money/AmountInput'
import { CurrencySelect } from '@/components/money/CurrencySelect'
import { CardsSkeleton, ErrorState, RowsSkeleton } from '@/components/layout/states'
import { SectionHeader } from '@/components/layout/Section'
import { FieldError } from '@/pages/auth/Login'
import { businessSchema } from '@/lib/schema/forms'
import { applyServerErrors } from '@/lib/formErrors'
import { cn } from '@/lib/utils'
import { useConfirm } from '@/components/layout/Confirm'
import {
  useBusiness,
  useBusinessHistory,
  useCancelOwnerMove,
  useCreateBusiness,
  useCurrencies,
  useDashboard,
  useRates,
  useSetStartingCapital,
} from '@/lib/hooks'
import { Registers } from './Registers.tsx'
import { CashCount, CashCountDialog } from './CashCount.tsx'
import { Spending, SpendDialog } from './Spending.tsx'
import { BusinessHistory } from './History.tsx'
import { ContributionHistory, Members } from './Members.tsx'
import { BusinessCurrencyProvider, useBusinessCurrency } from './currency.tsx'
import { CurrencyCode } from '@/components/money/Flag'

export default function Business() {
  const business = useBusiness()

  if (business.isLoading) return <CardsSkeleton />
  // A missing profile is the onboarding path, not an error.
  if (business.isError && business.error?.code === 'NOT_FOUND') return <Onboarding />
  if (business.isError) return <ErrorState error={business.error} onRetry={business.refetch} />

  return (
    // Валюта показу спільна для всієї сторінки: підсумки, графік прибутку й
    // таблиця по місяцях мають рахуватися в одному, інакше числа на сусідніх
    // картках не порівняти.
    <BusinessCurrencyProvider>
      <div className="space-y-6">
        {/* Перерахунок стоїть у самій шапці, навпроти назви: це щоденна дія,
          але плиткою на всю ширину вона забирала перший екран у цифр, заради
          яких сюди й заходять. */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {business.data.name}
            </h1>
            <p className="truncate text-sm text-muted-foreground">{business.data.description}</p>
          </div>
          <DailyActions />
        </div>

        <Dashboard />
        <Registers />
        <Sections />
      </div>
    </BusinessCurrencyProvider>
  )
}

/**
 * Правка «Мого капіталу» — того самого числа, що на картці.
 *
 * Раніше тут правилося стартове число, а картка показувала стартове плюс
 * внесене мінус забране. Людина вводила одне, бачила інше й не розуміла
 * чому. Тепер у полі — те, що на картці, і що введено, те й стане на картці.
 *
 * Внески й вилучення при цьому не зникають: це реальні рухи грошей у касах,
 * стерти їх — значить розвести каси з журналом. Замість того сервер отримує
 * нове стартове число, підібране так, щоб разом із ними вийшла введена сума:
 * стартовий = введене − (внесено − забрано).
 *
 * Рахуємо у валюті показу — у ній і картка, і поле, і нове стартове число,
 * тож курс між ними не стоїть.
 *
 * Зберігається датованим рядком, а не перезаписом: змінити капітал заднім
 * числом і тим переписати вже показаний прибуток за минулий місяць — не те,
 * що має ставатися непомітно.
 */
function CapitalDialog({ data }) {
  const [open, setOpen] = useState(false)
  const save = useSetStartingCapital()
  const currency = data.baseCurrency
  const current = data.equity ?? data.startingCapital?.base ?? '0'
  // Внесено мінус забрано — та частина капіталу, яку пишуть кнопки.
  const moves = BigInt(current) - BigInt(data.startingCapital?.base ?? '0')
  const prefill = () => (BigInt(current) > 0n ? current : '')
  const [amount, setAmount] = useState(prefill)

  const starting = amount ? BigInt(amount) - moves : null
  const tooSmall = starting != null && starting <= 0n

  const submit = async (event) => {
    event.preventDefault()
    if (!amount || tooSmall) return
    await save.mutateAsync({ amount: starting.toString(), currency })
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setAmount(prefill())
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground">
          <Pencil className="size-3.5" aria-hidden /> Змінити
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Мій капітал</DialogTitle>
          <DialogDescription>
            Скільки ваших власних грошей у справі зараз. Що введете — те й буде на картці. Гроші в
            касах не рухаються, тому зміниться прибуток: він рахується як чиста вартість мінус ваш
            капітал.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="capital-amount">
              Сума, <CurrencyCode code={currency} />
            </Label>
            <AmountInput
              id="capital-amount"
              currency={currency}
              value={amount}
              onChange={(value) => setAmount(value ?? '')}
              error={
                tooSmall
                  ? 'Менше, ніж уже внесено кнопками. Скасуйте зайві внески в розкладі капіталу.'
                  : undefined
              }
              autoFocus
            />
            {/* Внески й вилучення лишаються — видно, на що зсунеться старт. */}
            {moves !== 0n && starting != null && !tooSmall && (
              <p className="text-xs text-muted-foreground">
                Внески й вилучення (
                <Amount value={moves.toString()} currency={currency} size="sm" signed />) лишаються;
                стартовий стане <Amount value={starting.toString()} currency={currency} size="sm" />
                .
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={save.isPending || !amount || tooSmall}>
              {save.isPending ? 'Зберігаємо…' : 'Зберегти'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const SECTIONS = [
  { value: 'members', label: 'Учасники', icon: Users, render: () => <Members showTitle={false} /> },
  {
    value: 'earnings',
    label: 'Заробіток',
    icon: TrendingUp,
    render: () => <Spending showTitle={false} />,
  },
  {
    value: 'closing',
    label: 'Закриття дня',
    icon: CalendarCheck,
    render: () => <CashCount showTitle={false} />,
  },
  {
    value: 'moves',
    label: 'Рух вкладів',
    icon: ArrowLeftRight,
    render: () => <ContributionHistory showTitle={false} />,
  },
]

/**
 * Розділи сторінки — табками, а не стосом секцій.
 *
 * Стан бізнесу й каси лишаються завжди на видноті: перше — це підсумок, за
 * яким сюди й заходять, друге — те, що чіпаєш щодня. Решта чотири блоки
 * потрібні по черзі, а не одночасно, і разом розтягували сторінку на кілька
 * екранів, де все губилося.
 *
 * Вибрана вкладка запам'ятовується в межах сесії: перемикатися між станом
 * бізнесу й тим самим розділом по кілька разів на день — звичайна річ.
 */
function Sections() {
  const [tab, setTab] = useState(() => {
    try {
      return sessionStorage.getItem('business-tab') ?? SECTIONS[0].value
    } catch {
      return SECTIONS[0].value
    }
  })

  const select = (value) => {
    setTab(value)
    try {
      sessionStorage.setItem('business-tab', value)
    } catch {
      // Приватний режим забороняє запис — вкладка просто не запам'ятається.
    }
  }

  return (
    <Tabs value={tab} onValueChange={select} className="space-y-3">
      {/* Чотири розділи на телефоні — сітка 2×2, а не стрічка з прокруткою:
          так видно всі чотири одразу. Прокрутка ховала б два останні за краєм
          екрана, і про їх існування дізнавалися б випадково. */}
      {/* `group-data-…:h-auto` — не зайве поряд із `h-auto`: базова висота
          списку задана саме варіантом (`…/tabs:h-9`), і звичайний клас її не
          перекриває. Без цього другий ряд вкладок вивалювався з коробки
          списку й накривав кнопки розділу під ним. */}
      <TabsList className="grid h-auto w-full grid-cols-2 gap-1 group-data-[orientation=horizontal]/tabs:h-auto sm:flex sm:w-auto sm:justify-start">
        {SECTIONS.map((section) => (
          <TabsTrigger key={section.value} value={section.value} className="h-9 gap-1.5 px-2.5">
            <section.icon className="size-4" aria-hidden />
            <span className="truncate">{section.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {SECTIONS.map((section) => (
        <TabsContent key={section.value} value={section.value} className="mt-0">
          {section.render()}
        </TabsContent>
      ))}
    </Tabs>
  )
}

/**
 * Чотири дії, заради яких сюди заходять щодня.
 *
 * Лишився сам перерахунок кас: це те, що роблять щовечора, і стоїть воно
 * навпроти назви бізнесу — звичайною кнопкою, а не плиткою.
 *
 * Витрата живе у вкладці «Заробіток», поряд із виторгом, який вона зменшує;
 * внесок і вилучення власних грошей — на картці «Мій капітал», бо рухають
 * саме її.
 */
function DailyActions() {
  return (
    <CashCountDialog
      trigger={
        <Button size="sm" className="shrink-0">
          <ClipboardList className="size-4" aria-hidden />
          Порахувати каси
        </Button>
      }
    />
  )
}

/**
 * Що власник вносив і забирав — звичайний список, а не аналітика.
 *
 * Питання тут одне: коли я давав і коли брав. Тому рядок — це дата, сума зі
 * знаком і причина; сальдо рахувати не треба, воно вже стоїть у картці
 * «Мій капітал» над ним.
 *
 * Рухи беруться з того самого журналу, що й «Історія рахунку»: окремого
 * запиту для них не потрібно, а фільтр по двох типах — два рядки.
 */
// Скасовані записи лишаються в історії, а зустрічна проводка йде окремим
// типом — у списку мають бути обидва, інакше сальдо в картці не сходилося б
// із тим, що видно очима.
const OWNER_MOVE_TYPES = [
  'business_capital',
  'business_draw',
  'business_capital_cancel',
  'business_draw_reversal',
]

function OwnMoves({ currency }) {
  return (
    <AccordionCard title="Що вносив і забирав">
      <OwnMovesList currency={currency} limit={12} />
    </AccordionCard>
  )
}

/**
 * Картка, яка відкривається натиском на заголовок і за замовчуванням закрита.
 *
 * Деталі під підсумками потрібні зрідка, а відкриті завжди відсували
 * наступні секції на кілька екранів униз. Згорнуті — займають рядок.
 */
function AccordionCard({ title, children }) {
  return (
    <Collapsible.Root asChild>
      <Card className="group min-w-0 gap-0 py-0">
        <Collapsible.Trigger className="flex w-full items-center justify-between gap-2 rounded-xl p-4 text-left text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {title}
          <ChevronDown
            className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180"
            aria-hidden
          />
        </Collapsible.Trigger>
        <Collapsible.Content>
          <CardContent className="space-y-2 p-4 pt-0 text-sm">{children}</CardContent>
        </Collapsible.Content>
      </Card>
    </Collapsible.Root>
  )
}

// Сам список рухів — і в картці під капіталом (останні), і у вікні розкладу
// капіталу (усі): рядок, скасування й підписи мають бути однаковими.
function OwnMovesList({ currency, limit }) {
  const history = useBusinessHistory()
  const cancel = useCancelOwnerMove()
  const confirm = useConfirm()
  const moves = (history.data ?? [])
    .filter((move) => OWNER_MOVE_TYPES.includes(move.type))
    .slice(0, limit)
  // Що вже скасовано: зустрічна проводка посилається на оригінал, і кнопку в
  // нього треба прибрати, а сам рядок — притишити.
  const cancelled = new Set((history.data ?? []).map((move) => move.reversalOf).filter(Boolean))

  return (
    <>
      {history.isLoading && <RowsSkeleton rows={3} />}
      {!history.isLoading && moves.length === 0 && (
        <p className="text-muted-foreground">
          Ще не вносили й не забирали — кнопки під «Моїм капіталом».
        </p>
      )}
      {moves.length > 0 && (
        <ul className="divide-y">
          {moves.map((move) => {
            // Рух капіталу — це рядок на рахунку капіталу або вилучення;
            // решта рядків проводки описують, звідки саме гроші прийшли.
            // Капітал росте, коли цей рядок від'ємний, тож знак перевертаємо
            // — і однаково для внеску, вилучення й скасування кожного з них.
            const line = move.lines.find(
              (row) => row.kind === 'business_capital' || row.kind === 'business_draw',
            )
            if (!line) return null
            const delta = (-BigInt(line.amount)).toString()
            const date = new Date(move.createdAt)
            const undone = cancelled.has(move.transactionId)
            const isCancel = Boolean(move.reversalOf)

            return (
              <li key={move.transactionId} className="flex items-baseline gap-2 py-2">
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate', undone && 'line-through opacity-60')}>
                    {move.comment ||
                      (isCancel ? 'Скасування' : delta.startsWith('-') ? 'Вилучення' : 'Внесок')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {date.toLocaleDateString('uk-UA', {
                      day: 'numeric',
                      month: 'short',
                    })}
                    {undone && ' · скасовано'}
                  </span>
                </span>
                {/* Гроші зрушили в гривні за курсом, але людина називала суму в
                    своїй валюті — її видно під гривнями, щоб не перераховувати
                    в голові, скільки ж то було євро. */}
                <span
                  className={cn(
                    'flex flex-col items-end',
                    undone && 'line-through opacity-60',
                  )}
                >
                  <Amount
                    value={delta}
                    currency={line.currency ?? currency}
                    size="sm"
                    colored
                    signed
                  />
                  {move.asked && move.asked.currency !== line.currency && (
                    <span className="text-xs text-muted-foreground">
                      {delta.startsWith('-') ? '−' : '+'}
                      <Amount value={move.asked.amount} currency={move.asked.currency} />
                    </span>
                  )}
                </span>
                {/* Скасувати можна лише сам запис, а не скасування: далі це
                      перетворилося б на ланцюг, у якому вже не розібратися. */}
                {!undone && !isCancel && (
                  <button
                    type="button"
                    aria-label="Скасувати запис"
                    className="tap -mr-1 flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                    disabled={cancel.isPending}
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'Скасувати цей запис?',
                        description: delta.startsWith('-')
                          ? 'Вилучення скасується сторно: гроші повернуться в касу, з якої їх забрали.'
                          : 'Каса не зміниться — гроші з неї нікуди не ділися. Сума просто перестане бути вашим капіталом і рахуватиметься виторгом.',
                        confirmLabel: 'Скасувати запис',
                        destructive: true,
                      })
                      if (ok) cancel.mutate(move.transactionId)
                    }}
                  >
                    <Undo2 className="size-3.5" aria-hidden />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

/**
 * Розклад «Мого капіталу»: з чого складається число на картці.
 *
 * Без нього картка показувала одне число, а «Змінити» — інше, і не було
 * видно, що між ними стоять внески й вилучення. Тут видно всі доданки, ті
 * самі, якими рахує сервер: стартовий + внесено − забрано.
 *
 * Кожен рух валюти зафіксовано в гривні за курсом на момент руху — сервер
 * не перераховує минуле за сьогоднішнім курсом. Нижче — по валютах, у яких
 * гроші насправді вносили й забирали, і повний список рухів.
 */
/** Доданки «Мого капіталу» з відповіді дашборду, у валюті показу. */
function capitalTerms(data) {
  return {
    startValue: data.startingCapital?.base ?? '0',
    capital: data.capital ?? '0',
    draw: data.draw ?? '0',
    equity: data.equity ?? data.startingCapital?.base ?? '0',
  }
}

/**
 * Смуга складу капіталу — усе, що власник поклав у справу (старт +
 * внесено), а праворуч від неї відрізано те, що вже забрали. Частки лише для
 * ширини, тому Number тут досить: копійки на ширину в пікселях не впливають.
 */
function CapitalBar({ data, className = undefined }) {
  const { startValue, capital, draw } = capitalTerms(data)
  const put = Math.max(Number(startValue), 0) + Math.max(Number(capital), 0)
  const share = (value) => (put > 0 ? Math.min(Math.max(Number(value) / put, 0), 1) * 100 : 0)

  return (
    <div className={cn('relative flex h-2.5 overflow-hidden rounded-full bg-muted', className)}>
      <div className="bg-chart-5" style={{ width: `${share(startValue)}%` }} />
      <div className="bg-success" style={{ width: `${share(capital)}%` }} />
      <div
        className="absolute inset-y-0 right-0 bg-[repeating-linear-gradient(135deg,var(--destructive)_0_4px,var(--muted)_4px_8px)]"
        style={{ width: `${share(draw)}%` }}
      />
    </div>
  )
}

function CapitalBreakdown({ data, trigger }) {
  const currency = data.baseCurrency
  const starting = data.startingCapital
  const { startValue, capital, draw, equity } = capitalTerms(data)

  const parts = [
    {
      key: 'start',
      icon: Flag,
      label: 'Старт',
      value: startValue,
      tone: 'text-chart-5',
      tile: 'border-chart-5/25 bg-chart-5/8',
      sign: '',
    },
    {
      key: 'in',
      icon: ArrowDownLeft,
      label: 'Внесено',
      value: capital,
      tone: 'text-success',
      tile: 'border-success/25 bg-success/8',
      sign: '+',
    },
    {
      key: 'out',
      icon: ArrowUpRight,
      label: 'Забрано',
      value: draw,
      tone: 'text-destructive',
      tile: 'border-destructive/25 bg-destructive/8',
      sign: '−',
    },
  ]

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="gap-5 sm:max-w-lg">
        <DialogHeader className="flex-row items-center gap-3 space-y-0 text-left">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-chart-5/12">
            <PiggyBank className="size-5 text-chart-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <DialogTitle className="text-sm font-medium text-muted-foreground">
              Мій капітал
            </DialogTitle>
            <Amount
              value={equity}
              currency={currency}
              size="xl"
              whole
              className="text-2xl sm:text-4xl"
            />
          </div>
        </DialogHeader>
        <DialogDescription className="-mt-2">
          Скільки ваших власних грошей зараз у справі. Внески й вилучення не змінюють прибутку —
          вони змінюють саме це число.
        </DialogDescription>

        {/* Склад числа: що поклали і скільки з того вже забрали. */}
        <CapitalBar data={data} />

        {/* На телефоні три плитки в ряд обрізали і підпис, і суму — там вони
            стають рядками «підпис ліворуч, сума праворуч». */}
        <div className="grid gap-2 sm:grid-cols-3">
          {parts.map((part) => (
            <div
              key={part.key}
              className={cn(
                'flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 rounded-lg border p-2.5 sm:block',
                part.tile,
              )}
            >
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <part.icon className={cn('size-3.5 shrink-0', part.tone)} aria-hidden />
                <span className="truncate">{part.label}</span>
              </div>
              <p className="truncate text-sm font-semibold sm:mt-1 sm:text-base">
                {part.sign && <span className={part.tone}>{part.sign}</span>}
                <Amount value={part.value} currency={currency} whole showCurrency={false} />
              </p>
              {part.key === 'start' && starting && starting.currency !== currency && (
                <p className="w-full truncate text-right text-[11px] text-muted-foreground sm:text-left">
                  <Amount value={starting.amount} currency={starting.currency} whole />
                </p>
              )}
            </div>
          ))}
        </div>

        {data.ownerCapital?.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-medium">По валютах</h3>
            <ul className="divide-y rounded-lg border">
              {data.ownerCapital.map((row) => (
                // Код і підсумок — першим рядком, внесено й забрано — під ними:
                // в один рядок на телефоні три суми налазили одна на одну.
                <li key={row.currency} className="space-y-0.5 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <CurrencyCode
                      code={row.currency}
                      className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold"
                    />
                    <Amount
                      value={row.equity}
                      currency={row.currency}
                      size="sm"
                      colored
                      signed
                      className="font-semibold"
                    />
                  </div>
                  <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    {row.capital !== '0' && (
                      <span>
                        <span className="text-success">+</span>
                        <Amount value={row.capital} currency={row.currency} showCurrency={false} />{' '}
                        внесено
                      </span>
                    )}
                    {row.draw !== '0' && (
                      <span>
                        <span className="text-destructive">−</span>
                        <Amount value={row.draw} currency={row.currency} showCurrency={false} />{' '}
                        забрано
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-sm font-medium">
            <History className="size-3.5 text-muted-foreground" aria-hidden />
            Усі внески й вилучення
          </h3>
          <div className="rounded-lg border px-3 text-sm">
            <OwnMovesList currency={currency} />
          </div>
        </section>

        <p className="flex gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
          <Info className="mt-px size-3.5 shrink-0" aria-hidden />
          Рух у валюті зафіксовано в гривні за курсом того дня, коли його зробили, — минуле не
          перераховується за сьогоднішнім курсом. Курсова різниця по грошах у касах іде в прибуток.
        </p>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Картка «Мій капітал» над рештою підсумків.
 *
 * Ліворуч — число й те, з чого воно складається (старт, внесено, забрано й
 * смуга), щоб «чому саме стільки» було видно, не відкриваючи вікна; натиск
 * на цю частину відкриває повний розклад. Праворуч — дії: гроші власника
 * рухаються тут, біля свого ж числа, а не серед щоденних дій, бо прибутку
 * вони не змінюють.
 */
function CapitalCard({ data }) {
  const currency = data.baseCurrency
  const { startValue, capital, draw, equity } = capitalTerms(data)

  return (
    <Card className="gap-0 border-chart-5/30 bg-chart-5/8 py-0">
      <CardContent className="flex flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-center md:gap-6">
        <CapitalBreakdown
          data={data}
          trigger={
            <button
              type="button"
              className="group/capital -m-2 flex min-w-0 flex-1 items-start gap-3 rounded-lg p-2 text-left transition-colors hover:bg-chart-5/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label="Розклад мого капіталу"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-chart-5/15">
                <PiggyBank className="size-5 text-chart-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 space-y-1.5">
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  Мій капітал
                  <ChevronRight
                    className="size-3.5 transition-transform group-hover/capital:translate-x-0.5"
                    aria-hidden
                  />
                </span>
                {/* Не стартове число, а скільки моїх грошей у справі зараз:
                    старт плюс внесене мінус забране. */}
                <Amount value={equity} currency={currency} size="xl" whole className="block" />
                <span className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                  <span>
                    старт{' '}
                    <Amount
                      value={startValue}
                      currency={currency}
                      whole
                      showCurrency={false}
                      className="font-medium text-foreground"
                    />
                  </span>
                  <span>
                    <span className="font-medium text-success">
                      +<Amount value={capital} currency={currency} whole showCurrency={false} />
                    </span>{' '}
                    внесено
                  </span>
                  <span>
                    <span className="font-medium text-destructive">
                      −<Amount value={draw} currency={currency} whole showCurrency={false} />
                    </span>{' '}
                    забрано
                  </span>
                </span>
                <CapitalBar data={data} className="mt-1 h-1.5 max-w-md" />
              </span>
            </button>
          }
        />

        <div className="flex flex-col gap-2 md:w-60 md:shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <SpendDialog
              kind="capital"
              trigger={
                <Button className="w-full bg-success text-success-foreground hover:bg-success/90">
                  <Plus className="size-4" aria-hidden />
                  Додати
                </Button>
              }
            />
            <SpendDialog
              kind="draw"
              trigger={
                <Button
                  variant="outline"
                  className="w-full border-destructive/40 bg-background text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Minus className="size-4" aria-hidden />
                  Забрати
                </Button>
              }
            />
          </div>
          {/* Стартове число правиться окремо й тихіше за рух грошей: його
              чіпають раз, коли заводять бізнес, а не щодня. */}
          <div className="flex justify-center">
            <CapitalDialog data={data} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const NET_WORTH_KEY = 'net-worth-currency'

/**
 * Чиста вартість — зі своїм перемикачем валюти.
 *
 * Валюта показу сторінки рахує всі підсумки разом; а «скільки це все в
 * доларах чи злотих» хочеться глянути окремо, не перемикаючи решту сторінки.
 * Вибір запам’ятовується в браузері, як і валюта сторінки. Поки він не
 * зроблений, картка йде за валютою сторінки.
 */
function NetWorthCard({ data }) {
  const [own, setOwn] = useState(() => {
    try {
      return localStorage.getItem(NET_WORTH_KEY)
    } catch {
      return null
    }
  })
  const currency = own ?? data.baseCurrency
  const separate = currency !== data.baseCurrency
  // Той самий запит дашборду, лише в іншій валюті: сервер рахує, клієнт
  // нічого не конвертує (CLIENT_PLAN §0). Кеш спільний із перемикачем угорі.
  const other = useDashboard(currency, separate)
  const value = separate ? other.data?.netWorth : data.netWorth

  const choose = (next) => {
    setOwn(next)
    try {
      localStorage.setItem(NET_WORTH_KEY, next)
    } catch {
      // Не зберегли — вибір діє до перезавантаження.
    }
  }

  return (
    <Card className="gap-0 border-muted-foreground/25 bg-muted/50 py-0">
      <CardContent className="space-y-1 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
            <Scale className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">Чиста вартість</span>
          </span>
          <CurrencySelect
            id="net-worth-currency"
            className="h-7 w-auto shrink-0 gap-1 bg-background px-2 text-xs"
            value={currency}
            onChange={choose}
          />
        </div>
        {separate && other.isError ? (
          <p className="text-sm text-muted-foreground">Немає курсу для {currency}</p>
        ) : value == null ? (
          <div className="h-7 w-24 animate-pulse rounded bg-muted" />
        ) : (
          <Amount value={value} currency={currency} size="lg" whole className="block" />
        )}
        <p className="text-xs text-muted-foreground">Активи мінус борг перед учасниками</p>
      </CardContent>
    </Card>
  )
}

/**
 * Курси, за якими рахуються підсумки.
 *
 * Питання «чому тут ця цифра» майже завжди впирається в курс, а курс лежав
 * на окремій сторінці — треба було піти, подивитися й повернутися. Тепер він
 * поруч із перемикачем валюти, під тією ж рукою.
 *
 * Показується середній між купівлею і продажем: саме ним сервер оцінює все,
 * що лежить не в базовій валюті. Курс, який давно не оновлювали, підписаний
 * окремо — інакше застаріле число виглядало б таким самим надійним.
 */
function RatesHint({ base, stale }) {
  const [open, setOpen] = useState(false)
  const { data: rates = [] } = useRates()
  const { data: currencies = [] } = useCurrencies()
  const pivot = currencies.find((item) => item.isBase)?.code

  if (rates.length === 0) return null

  const mid = (rate) => ((Number(rate.bid) + Number(rate.sell)) / 2).toFixed(2)

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 px-2 text-muted-foreground sm:h-8"
          aria-label="Курси, за якими рахуються підсумки"
          onClick={() => setOpen((value) => !value)}
        >
          <Coins className="size-4" aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent align="end">
        <p className="mb-1.5 font-medium">Рахуємо за середнім курсом</p>
        <ul className="space-y-0.5 tabular-nums">
          {[...rates]
            .sort((a, b) => a.code.localeCompare(b.code))
            .map((rate) => (
              <li key={rate.code} className="flex items-baseline justify-between gap-4">
                <span>
                  1 <CurrencyCode code={rate.code} />
                  {stale.includes(rate.code) && (
                    <span className="ml-1 text-amber-600 dark:text-amber-400">застарілий</span>
                  )}
                </span>
                <span>
                  {mid(rate)} <CurrencyCode code={pivot} />
                </span>
              </li>
            ))}
        </ul>
        {base !== pivot && (
          <p className="mt-1.5 text-muted-foreground">
            Показ у <CurrencyCode code={base} /> — перерахунок через{' '}
            <CurrencyCode code={pivot} /> за цими ж курсами.
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

function Dashboard() {
  // Валюта показу живе в браузері, а не в URL: це спосіб подивитись на ті
  // самі гроші, а не окрема сторінка. Сервер перераховує підсумки за середнім
  // курсом — клієнт нічого не конвертує (CLIENT_PLAN §0).
  const { currency: displayCurrency, setCurrency: setDisplayCurrency } = useBusinessCurrency()
  const dashboard = useDashboard(displayCurrency)

  if (dashboard.isLoading) return <CardsSkeleton />
  if (dashboard.isError) return <ErrorState error={dashboard.error} onRetry={dashboard.refetch} />

  const data = dashboard.data
  const currency = data.baseCurrency
  const profitable = !data.profit.startsWith('-')

  return (
    <section className="space-y-3">
      <SectionHeader
        icon={Gauge}
        title="Стан бізнесу"
        hint={dashboard.isFetching ? 'перераховуємо…' : undefined}
      >
        <CurrencySelect
          className="h-9 gap-2 text-xs sm:h-8 sm:w-auto"
          value={currency}
          onChange={setDisplayCurrency}
        />
        <RatesHint base={currency} stale={data.staleCodes ?? []} />
        {/* Журнал стоїть біля підсумків, а не в картці капіталу власника: це
            історія грошей усього бізнесу, і шукають її поруч із тим числом,
            яке хочуть пояснити. */}
        <BusinessHistory />
        {data.staleCodes?.length > 0 && (
          <Badge
            variant="outline"
            className="gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400"
          >
            <TriangleAlert className="size-3" aria-hidden />
            Застарілий курс: {data.staleCodes.join(', ')}
          </Badge>
        )}
      </SectionHeader>

      {/* Everything here is computed by the server (CLIENT_PLAN §0) — this
          component only formats what GET /businesses/me/dashboard returned.

          Копійок тут немає. Підсумки бізнесу — це сотні тисяч, і два останні
          знаки в кожному з п’яти чисел не несуть нічого, крім шуму: вони
          однакові з рядка в рядок і крадуть ширину в самої цифри. Округлення
          суто для показу — у журналі й у запитах лишається точна сума.

          Валюта названа один раз, на головній картці: перемикач просто над
          нею вже показує, у чому рахуємо, і повторювати код у кожній плитці
          означало б п’ять разів відповісти на питання, якого ніхто не ставив.

          Колір несе сенс, а не прикрашає: своє — синім, чуже — червоним,
          різниця між ними — нейтральним. Тон приглушений (8–12% від токена
          теми), щоб цифра лишалася головним на картці. */}

      {/* Мій капітал — окремо й на всю ширину на будь-якому екрані: це
          єдина картка з діями, і їй потрібне місце під кнопки. Решта чотири
          підсумки — під ним, на великому екрані одним рядком, на меншому —
          кожен на всю ширину. Активи мінус зобов’язання дають чисту
          вартість, а мій капітал плюс прибуток — її ж з іншого боку. Виторгу
          й витрат тут немає: вони накопичені за місяцями й живуть у вкладці
          «Заробіток». */}
      <CapitalCard data={data} />

      <div className="grid gap-2 lg:grid-cols-4">
        <NetWorthCard data={data} />

        <Card className="gap-0 border-chart-1/30 bg-chart-1/8 py-0">
          <CardContent className="p-4">
            <AmountBlock
              icon={Coins}
              iconClassName="text-chart-1"
              label="Активи"
              value={data.assets}
              currency={currency}
              whole
              showCurrency={false}
            />
          </CardContent>
        </Card>

        <Card className="gap-0 border-destructive/30 bg-destructive/8 py-0">
          <CardContent className="p-4">
            <AmountBlock
              icon={Users}
              iconClassName="text-destructive"
              label="Зобов’язання"
              value={data.liabilities}
              currency={currency}
              whole
              showCurrency={false}
            />
          </CardContent>
        </Card>

        <Card
          className={
            profitable
              ? 'gap-0 border-success/40 bg-success/8 py-0'
              : 'gap-0 border-destructive/40 bg-destructive/8 py-0'
          }
        >
          <CardContent className="p-4">
            <AmountBlock
              icon={TrendingUp}
              iconClassName={profitable ? 'text-success' : 'text-destructive'}
              label="Прибуток"
              value={data.profit}
              currency={currency}
              colored
              whole
              showCurrency={false}
              hint="Чиста вартість мінус ваш капітал"
            />
          </CardContent>
        </Card>
      </div>

      {/* `min-w-0` на картці — не косметика: усередині неї лежить таблиця з
          власною мінімальною шириною, а колонка гріда за замовчуванням
          розтягується під найширший вміст. Без цього картка вилазила за
          екран телефона замість того, щоб таблиця возилася вбік у собі. */}
      <div className="grid gap-2">
        <OwnMoves currency={currency} />

        <AccordionCard title="У розрізі валют">
            {data.byCurrency.length === 0 && (
              <p className="text-muted-foreground">Ще немає рухів коштів.</p>
            )}
            {/* Суми лишаються у своїй валюті: перемикач угорі міняє валюту
              підсумків, а не цієї таблиці — тут видно, що саме лежить.

              На телефоні кожна валюта — окремий блок, а не рядок таблиці.
              Таблиця з п’яти колонок не стискається до ширини екрана, і
              єдиний спосіб її там показати — власне вікно прокрутки вбік;
              саме воно на iOS відкидало сторінку назад до цієї секції при
              скролі вгору. Блоки нічого вбік не возять — і відкидати
              більше нема чому. */}
            {data.byCurrency.length > 0 && (
              <div className="space-y-2 sm:hidden">
                {data.byCurrency.map((row) => {
                  const parts = [
                    { label: 'Каси', value: row.registers },
                    { label: 'Готівка', value: row.cash },
                    { label: 'Гаманці', value: row.wallets },
                    { label: 'Борг', value: row.debt },
                  ].filter((part) => part.value !== '0')

                  return (
                    <div key={row.currency} className="rounded-lg border p-3">
                      <CurrencyCode code={row.currency} className="block font-medium" />
                      <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        {parts.map((part) => (
                          <div
                            key={part.label}
                            className="flex items-baseline justify-between gap-2"
                          >
                            <dt className="text-muted-foreground">{part.label}</dt>
                            <dd>
                              <Amount
                                value={part.value}
                                currency={row.currency}
                                size="sm"
                                showCurrency={false}
                              />
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )
                })}
              </div>
            )}

            {data.byCurrency.length > 0 && (
              <div className="no-scrollbar -mx-4 hidden overflow-x-auto overscroll-x-contain px-4 sm:block">
                <div className="grid min-w-[26rem] grid-cols-[auto_1fr_1fr_1fr_1fr] gap-x-4 gap-y-1.5">
                  <span />
                  <span className="text-right text-xs text-muted-foreground">Каси</span>
                  <span className="text-right text-xs text-muted-foreground">Готівка</span>
                  <span className="text-right text-xs text-muted-foreground">Гаманці</span>
                  <span className="text-right text-xs text-muted-foreground">Борг</span>
                  {data.byCurrency.map((row) => (
                    <Fragment key={row.currency}>
                      <CurrencyCode code={row.currency} className="font-medium" />
                      <span className="text-right">
                        <Amount
                          value={row.registers}
                          currency={row.currency}
                          size="sm"
                          showCurrency={false}
                        />
                      </span>
                      <span className="text-right">
                        <Amount
                          value={row.cash}
                          currency={row.currency}
                          size="sm"
                          showCurrency={false}
                        />
                      </span>
                      <span className="text-right">
                        <Amount
                          value={row.wallets}
                          currency={row.currency}
                          size="sm"
                          showCurrency={false}
                        />
                      </span>
                      <span className="text-right">
                        <Amount
                          value={row.debt}
                          currency={row.currency}
                          size="sm"
                          showCurrency={false}
                        />
                      </span>
                    </Fragment>
                  ))}
                </div>
              </div>
            )}
        </AccordionCard>
      </div>
    </section>
  )
}

/** First run: create the business profile. */
function Onboarding() {
  const create = useCreateBusiness()
  const form = useForm({
    resolver: zodResolver(businessSchema),
    defaultValues: { name: '', description: '', baseCurrency: 'UAH' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await create.mutateAsync({ ...values, description: values.description || undefined })
    } catch (error) {
      applyServerErrors(form, error)
    }
  })

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Створіть бізнес-профіль</CardTitle>
          <CardDescription>
            Профіль бачать інвестори поруч із вашими заявками — назва й опис впливають на довіру.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="name">Назва</Label>
              <Input id="name" placeholder="Кав’ярня «Друга Хвиля»" {...form.register('name')} />
              <FieldError message={form.formState.errors.name?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Опис</Label>
              <Textarea
                id="description"
                rows={3}
                placeholder="Дві точки в центрі, обіг ~180 тис. грн/міс."
                {...form.register('description')}
              />
              <FieldError message={form.formState.errors.description?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseCurrency">Основна валюта звітності</Label>
              <CurrencySelect
                id="baseCurrency"
                className="w-full"
                value={form.watch('baseCurrency')}
                onChange={(value) => form.setValue('baseCurrency', value)}
              />
            </div>

            <FieldError message={form.formState.errors.root?.message} />

            <Button type="submit" size="lg" className="w-full" disabled={create.isPending}>
              {create.isPending ? 'Створюємо…' : 'Створити профіль'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
