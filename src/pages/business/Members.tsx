import { useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, CreditCard, Search, Trash2, User, UserPlus, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Amount } from '@/components/money/Amount'
import { AmountInput } from '@/components/money/AmountInput'
import { CurrencySelect } from '@/components/money/CurrencySelect'
import { EmptyState, RowsSkeleton } from '@/components/layout/states'
import { SectionHeader } from '@/components/layout/Section'
import { useConfirm } from '@/components/layout/Confirm'
import { formatAmount, formatBps } from '@/lib/money'
import { cn } from '@/lib/utils'
import {
  useContributions,
  useEndMembership,
  useHideMember,
  useInviteMember,
  useMembers,
  usePayForMember,
  useUserSearch,
} from '@/lib/hooks'
import { withFlag } from '@/lib/currency'

/**
 * Учасники — сторона власника.
 *
 * Борг перед учасником це просто залишок його рахунку в журналі, тому
 * «скільки я винен Петрові» ніде не зберігається окремо і не може розійтися
 * з рештою обліку.
 */
export function Members({ showTitle = true }) {
  const members = useMembers()

  return (
    <section className="space-y-3">
      <SectionHeader icon={Users} title={showTitle ? 'Учасники' : null}>
        <InviteDialog />
      </SectionHeader>

      {members.isLoading && <RowsSkeleton rows={2} />}

      {members.data?.length === 0 && (
        <EmptyState
          icon={Users}
          title="Учасників ще немає"
          description="Додайте інвестора — щойно він прийме запрошення, його кошти працюватимуть у бізнесі."
        />
      )}

      {members.data?.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {members.data.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      )}
    </section>
  )
}

// Кольори беруться з палітри графіків: вона вже визначена для світлої й
// темної теми, тож нічого не доводиться підбирати вручну.
const MEMBER_TONES = [
  'bg-chart-1/12 text-chart-1',
  'bg-chart-3/12 text-chart-3',
  'bg-chart-5/12 text-chart-5',
  'bg-chart-4/15 text-chart-4',
  'bg-chart-2/12 text-chart-2',
]

/**
 * Колір учасника — стала функція від його id.
 *
 * Не випадкова й не за порядком у списку: людина має лишатися того самого
 * кольору між заходами й не мінятися, коли хтось вище зник зі списку. Саме це
 * робить колір придатним для впізнавання.
 */
const toneFor = (id) => {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 100000
  return MEMBER_TONES[hash % MEMBER_TONES.length]
}

function MemberCard({ member }) {
  const end = useEndMembership()
  const hide = useHideMember()
  const confirm = useConfirm()
  const owing = member.balances.filter((row) => row.balance !== '0')
  // Завершена участь уже нічого не тримає — її можна прибрати з очей. Активну
  // спершу треба закрити, і кнопка про це прямо каже.
  const finished = member.status === 'ended' || member.status === 'declined'

  return (
    // `min-w-0` — не косметика: картка лежить у гріді, а колонка за
    // замовчуванням розтягується під найдовше ім’я чи пошту. Без нього на
    // вузькому телефоні картка вилазила за екран і сторінка їздила вбік.
    <Card className="min-w-0">
      <CardContent className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-full',
                toneFor(member.id),
              )}
              aria-hidden
            >
              <User className="size-4.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium">{member.displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{member.email}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StatusBadge status={member.status} />
            {finished ? (
              <button
                type="button"
                aria-label={`Прибрати ${member.displayName} зі списку`}
                className="tap -mr-1.5 flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                onClick={async () => {
                  const ok = await confirm({
                    title: `Прибрати «${member.displayName}» зі списку?`,
                    description:
                      'Картка зникне, але історія надходжень і проводки в журналі залишаться. Якщо запросите знову — учасник повернеться разом з нею.',
                    confirmLabel: 'Прибрати',
                    destructive: true,
                  })
                  if (ok) hide.mutate(member.id)
                }}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                aria-label={`Завершити участь ${member.displayName}`}
                className="tap -mr-1.5 flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                onClick={async () => {
                  // Попередження називає суму: вихід не просто знімає статус,
                  // він віддає гроші, і це має бути видно до натискання.
                  const debt = owing
                    .map((row) => `${formatAmount(row.balance)} ${withFlag(row.currency)}`)
                    .join(', ')
                  const ok = await confirm({
                    title: `Завершити участь «${member.displayName}»?`,
                    description: debt
                      ? `Бізнес видасть ${debt} готівкою з коштів поза касами, і борг обнулиться.`
                      : 'Боргу перед учасником немає, тож нічого виплачувати не доведеться.',
                    confirmLabel: 'Завершити',
                    destructive: true,
                  })
                  if (ok) end.mutate(member.id)
                }}
              >
                <X className="size-4" aria-hidden />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          {owing.length === 0 && <span className="text-sm text-muted-foreground">Боргу немає</span>}
          {owing.map((row) => (
            <Amount key={row.currency} value={row.balance} currency={row.currency} />
          ))}
        </div>

        {owing.length > 0 && <PayForMemberDialog member={member} owing={owing} />}

        <p className="text-xs text-muted-foreground">
          Ставка: {formatBps(member.rateAnnualBps, { zeroLabel: 'без відсотків' })}
          {member.joinedAt && ` · з ${new Date(member.joinedAt).toLocaleDateString('uk-UA')}`}
        </p>

      </CardContent>
    </Card>
  )
}

/**
 * «Оплатив зі своїх» — власник заплатив за учасника власними грошима, повз
 * каси бізнесу.
 *
 * Борг перед учасником меншає, а капітал власника росте на ту саму суму:
 * гроші не заробив бізнес, їх вклав власник. Тому прибуток не змінюється.
 * Списати борг правкою балансу показало б цю суму як заробіток.
 */
function PayForMemberDialog({ member, owing }) {
  const [open, setOpen] = useState(false)
  const pay = usePayForMember()
  const [currency, setCurrency] = useState(owing[0].currency)
  const [amount, setAmount] = useState('')
  const [comment, setComment] = useState('')
  const [error, setError] = useState(null)

  const owed = owing.find((row) => row.currency === currency)?.balance ?? '0'
  const tooMuch = amount ? BigInt(amount) > BigInt(owed) : false
  const left = amount && !tooMuch ? (BigInt(owed) - BigInt(amount)).toString() : null
  const ready = amount && !tooMuch && comment.trim().length >= 3

  const submit = async (event) => {
    event.preventDefault()
    if (!ready) return
    setError(null)
    try {
      await pay.mutateAsync({
        id: member.id,
        body: { currency, amount, comment: comment.trim() },
        key: crypto.randomUUID(),
      })
      setOpen(false)
    } catch (failure) {
      setError(failure.fields?.amount ?? failure.fields?.comment ?? failure.message)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setCurrency(owing[0].currency)
          setAmount('')
          setComment('')
          setError(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <CreditCard className="size-4" aria-hidden />
          Оплатив зі своїх
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Оплатив зі своїх</DialogTitle>
          <DialogDescription>
            Ви заплатили за учасника {member.displayName} власними грошима, не з кас бізнесу.
            Борг перед ним
            зменшиться, а ваш капітал зросте на ту саму суму. Каси й прибуток не зміняться.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid grid-cols-[1fr_7rem] gap-3 sm:grid-cols-[1fr_8rem] sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor={`pay-for-${member.id}-amount`}>Сума</Label>
              <AmountInput
                id={`pay-for-${member.id}-amount`}
                currency={currency}
                value={amount}
                onChange={(value) => setAmount(value ?? '')}
                max={owed}
                onMax={setAmount}
                error={tooMuch ? 'Більше, ніж бізнес винен' : undefined}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`pay-for-${member.id}-currency`}>Валюта</Label>
              <CurrencySelect
                id={`pay-for-${member.id}-currency`}
                className="w-full"
                value={currency}
                onChange={setCurrency}
                only={owing.map((row) => row.currency)}
              />
            </div>
          </div>

          <p className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
            Бізнес винен <Amount value={owed} currency={currency} size="sm" />
            {left != null && (
              <>
                {' · '}стане <Amount value={left} currency={currency} size="sm" />
                {' · '}ваш капітал{' '}
                <span className="text-success">
                  +<Amount value={amount} currency={currency} size="sm" />
                </span>
              </>
            )}
          </p>

          <div className="space-y-2">
            <Label htmlFor={`pay-for-${member.id}-comment`}>За що</Label>
            <Input
              id={`pay-for-${member.id}-comment`}
              placeholder="Квитки на потяг"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pay.isPending || !ready}>
              {pay.isPending ? 'Записуємо…' : 'Записати'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function StatusBadge({ status }) {
  if (status === 'active') return <Badge variant="outline">Активний</Badge>
  if (status === 'pending') return <Badge variant="outline">Запрошено</Badge>
  // Відмова і вихід — різні історії, і власник має бачити яка саме.
  if (status === 'declined') return <Badge variant="outline">Відхилив</Badge>
  return <Badge variant="outline">Завершено</Badge>
}

function InviteDialog() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const invite = useInviteMember()

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const search = useUserSearch(debounced)
  const results = useMemo(() => search.data ?? [], [search.data])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="size-4" aria-hidden /> Додати
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Додати учасника</DialogTitle>
          <DialogDescription>
            Людина отримає запрошення й сама назве свою ставку. Кошти почнуть рахуватися з дня,
            коли ви підтвердите, що прийняли їх.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="member-search">Кого додаємо</Label>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="member-search"
              className="pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ім’я або пошта"
              autoComplete="off"
              type="search"
              enterKeyHint="search"
            />
          </div>

          {debounced.length >= 2 && (
            <ul className="max-h-64 divide-y overflow-y-auto overscroll-contain rounded-md border">
              {search.isLoading && (
                <li className="px-4 py-3 text-sm text-muted-foreground">Шукаємо…</li>
              )}
              {!search.isLoading && !results.length && (
                <li className="px-4 py-3 text-sm text-muted-foreground">Нікого не знайдено</li>
              )}
              {results.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    disabled={invite.isPending}
                    onClick={async () => {
                      await invite.mutateAsync({ userId: user.id })
                      setOpen(false)
                      setQuery('')
                    }}
                    className="tap flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                        {user.displayName?.trim().charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{user.displayName}</p>
                        <p className="truncate text-xs text-muted-foreground">{user.hint}</p>
                      </div>
                    </div>
                    <UserPlus className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Що і коли зайшло в бізнес від учасників. Записується автоматично. */
export function ContributionHistory({ showTitle = true }) {
  const rows = useContributions()
  const moves = rows.data ?? []

  return (
    <section className="space-y-3">
      <SectionHeader icon={ArrowLeftRight} title={showTitle ? 'Рух вкладів' : null} />

      {rows.isLoading && <RowsSkeleton rows={2} />}

      {/* Раніше порожній список просто зникав — і вкладка «Рух вкладів»
          відкривалася зовсім порожньою, без жодного натяку, чи то нічого не
          було, чи то щось зламалося. */}
      {!rows.isLoading && moves.length === 0 && (
        <EmptyState
          icon={ArrowLeftRight}
          title="Вкладів ще не було"
          description="Тут з’явиться кожне надходження від учасника й кожне зняття."
        />
      )}

      <div className="space-y-1.5">
        {moves.map((row) => (
          <Card key={row.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 p-3 text-sm">
              <div className="min-w-0">
                <span className="font-medium">{row.displayName}</span>
                <span className="ml-2 text-muted-foreground">
                  {row.direction === 'in' ? 'передав бізнесу' : 'забрав'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Amount value={row.amount} currency={row.currency} size="sm" />
                <span className="text-xs text-muted-foreground">
                  {new Date(row.decidedAt ?? row.declaredAt).toLocaleDateString('uk-UA')}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
