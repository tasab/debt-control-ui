import { Fragment, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeftRight,
  CalendarCheck,
  ClipboardList,
  Coins,
  Gauge,
  Minus,
  Pencil,
  PiggyBank,
  Plus,
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
import {
  useBusiness,
  useBusinessHistory,
  useCreateBusiness,
  useDashboard,
  useSetStartingCapital,
} from '@/lib/hooks'
import { Registers } from './Registers.tsx'
import { CashCount, CashCountDialog } from './CashCount.tsx'
import { Spending, SpendDialog } from './Spending.tsx'
import { BusinessHistory } from './History.tsx'
import { ContributionHistory, Members } from './Members.tsx'

export default function Business() {
  const business = useBusiness()

  if (business.isLoading) return <CardsSkeleton />
  // A missing profile is the onboarding path, not an error.
  if (business.isError && business.error?.code === 'NOT_FOUND') return <Onboarding />
  if (business.isError) return <ErrorState error={business.error} onRetry={business.refetch} />

  return (
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
  )
}

/**
 * Правка стартового капіталу.
 *
 * Це число — те, скільки власних грошей було в справі на момент, коли бізнес
 * завели в систему: журнал тих років не бачив, вивести їх нема з чого. Усе,
 * що вносилося й забиралося після того, рахується з проводок і додається до
 * цього числа саме.
 *
 * Тому тут легко помилитися двічі: якщо ті самі гроші ще раз записати
 * внеском, капітал подвоїться, а прибуток провалиться в мінус на ту саму
 * суму. Про це й сказано у вікні.
 *
 * Зберігається датованим рядком, а не перезаписом: змінити капітал заднім
 * числом і тим переписати вже показаний прибуток за минулий місяць — не те,
 * що має ставатися непомітно.
 */
function CapitalDialog({ capital }) {
  const [open, setOpen] = useState(false)
  const save = useSetStartingCapital()
  const [amount, setAmount] = useState(capital?.amount ?? '')
  const [currency, setCurrency] = useState(capital?.currency ?? 'UAH')

  const submit = async (event) => {
    event.preventDefault()
    if (!amount) return
    await save.mutateAsync({ amount, currency })
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setAmount(capital?.amount ?? '')
          setCurrency(capital?.currency ?? 'UAH')
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground">
          <Pencil className="size-3.5" aria-hidden /> Змінити
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Стартовий капітал</DialogTitle>
          <DialogDescription>
            Скільки ваших власних грошей було в справі на старті. Внески й вилучення після
            того рахуються окремо й додаються до цього числа — записувати їх сюди ще раз
            не треба.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid grid-cols-[1fr_7rem] gap-3 sm:grid-cols-[1fr_8rem] sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="capital-amount">Сума</Label>
              <AmountInput
                id="capital-amount"
                currency={currency}
                value={amount}
                onChange={(value) => setAmount(value ?? '')}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capital-currency">Валюта</Label>
              <CurrencySelect
                id="capital-currency"
                className="w-full"
                value={currency}
                onChange={setCurrency}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={save.isPending || !amount}>
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
function OwnMoves({ currency }) {
  const history = useBusinessHistory()
  const moves = (history.data ?? [])
    .filter((move) => move.type === 'business_capital' || move.type === 'business_draw')
    .slice(0, 12)

  return (
    <Card className="min-w-0">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Що вносив і забирав
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 text-sm">
        {history.isLoading && <RowsSkeleton rows={3} />}
        {!history.isLoading && moves.length === 0 && (
          <p className="text-muted-foreground">
            Ще не вносили й не забирали — кнопки під «Моїм капіталом».
          </p>
        )}
        {moves.length > 0 && (
          <ul className="divide-y">
            {moves.map((move) => {
              const incoming = move.type === 'business_capital'
              // Сума руху — те, що лягло на рахунок капіталу чи вилучення;
              // решта рядків проводки описують, звідки саме гроші прийшли.
              const line = move.lines.find(
                (row) => row.kind === (incoming ? 'business_capital' : 'business_draw'),
              )
              if (!line) return null
              const amount = line.amount.replace('-', '')
              const date = new Date(move.createdAt)

              return (
                <li key={move.transactionId} className="flex items-baseline gap-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">
                      {move.comment || (incoming ? 'Внесок' : 'Вилучення')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}
                    </span>
                  </span>
                  <Amount
                    value={incoming ? amount : `-${amount}`}
                    currency={line.currency ?? currency}
                    size="sm"
                    colored
                    signed
                  />
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function Dashboard() {
  // Валюта показу живе тут, а не в URL: це спосіб подивитись на ті самі гроші,
  // а не окрема сторінка. Сервер перераховує підсумки за середнім курсом —
  // клієнт нічого не конвертує (CLIENT_PLAN §0).
  const [displayCurrency, setDisplayCurrency] = useState(null)
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
        {/* Журнал стоїть біля підсумків, а не в картці капіталу власника: це
            історія грошей усього бізнесу, і шукають її поруч із тим числом,
            яке хочуть пояснити. */}
        <BusinessHistory />
        {data.staleCodes?.length > 0 && (
          <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400">
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

      {/* Чиста вартість винесена окремим рядком над рештою.
          П’ять однакових плиток означали, що головне число сторінки треба
          щоразу вишукувати серед чотирьох таких самих; тепер воно єдине в
          своєму рядку і вдвічі більше, а решта чотири — те, з чого воно
          складається. */}
      <Card className="border-muted-foreground/25 bg-muted/50">
        <CardContent className="p-4 sm:p-5">
          <AmountBlock
            icon={Scale}
            label="Чиста вартість"
            value={data.netWorth}
            currency={currency}
            whole
            size="xl"
            hint="Активи мінус борг перед учасниками" 
          />
        </CardContent>
      </Card>

      {/* Чотири доданки одного числа в одному ряду: активи мінус
          зобов’язання дають чисту вартість, а мій капітал плюс прибуток —
          її ж з іншого боку. Виторгу й витрат тут немає: вони накопичені за
          місяцями й живуть у вкладці «Заробіток». */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Card className="border-chart-1/30 bg-chart-1/8">
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

        <Card className="border-destructive/30 bg-destructive/8">
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

        <Card className="border-chart-5/30 bg-chart-5/8">
          <CardContent className="space-y-1 p-4">
            <AmountBlock
              icon={PiggyBank}
              iconClassName="text-chart-5"
              label="Мій капітал"
              // Не стартове число, а скільки моїх грошей у справі зараз:
              // старт плюс внесене мінус забране. Кнопки під карткою рухають
              // саме його — інакше внесок з власної кишені додавався б до
              // прибутку, а число над ними стояло б нерухомо.
              value={data.equity ?? data.startingCapital?.base ?? '0'}
              currency={currency}
              whole
              showCurrency={false}
            />
            {/* Гроші власника рухаються тут, біля свого ж числа: «Додати» —
                внесок у справу, «Забрати» — вилучення. Прибутку це не
                змінює, тому кнопки не стоять серед щоденних дій. */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <SpendDialog
                kind="capital"
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-success/40 text-success hover:bg-success/10 hover:text-success"
                  >
                    <Plus className="size-3.5" aria-hidden />
                    Додати
                  </Button>
                }
              />
              <SpendDialog
                kind="draw"
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Minus className="size-3.5" aria-hidden />
                    Забрати
                  </Button>
                }
              />
            </div>
            {/* Стартове число правиться окремо й тихіше за рух грошей: його
                чіпають раз, коли заводять бізнес, а не щодня. */}
            <CapitalDialog capital={data.startingCapital} />
          </CardContent>
        </Card>

        <Card
          className={
            profitable ? 'border-success/40 bg-success/8' : 'border-destructive/40 bg-destructive/8'
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
      <div className="grid gap-2 sm:grid-cols-2">
        <OwnMoves currency={currency} />

        <Card className="min-w-0">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              У розрізі валют
            </CardTitle>
          </CardHeader>
        <CardContent className="space-y-2 p-4 pt-0 text-sm">
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
                    <p className="font-medium">{row.currency}</p>
                    <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      {parts.map((part) => (
                        <div key={part.label} className="flex items-baseline justify-between gap-2">
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
                  <span className="font-medium">{row.currency}</span>
                  <span className="text-right">
                    <Amount value={row.registers} currency={row.currency} size="sm" showCurrency={false} />
                  </span>
                  <span className="text-right">
                    <Amount value={row.cash} currency={row.currency} size="sm" showCurrency={false} />
                  </span>
                  <span className="text-right">
                    <Amount value={row.wallets} currency={row.currency} size="sm" showCurrency={false} />
                  </span>
                  <span className="text-right">
                    <Amount value={row.debt} currency={row.currency} size="sm" showCurrency={false} />
                  </span>
                </Fragment>
              ))}
            </div>
            </div>
          )}
        </CardContent>
        </Card>
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
