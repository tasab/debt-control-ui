import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeftRight, HandCoins, Handshake, Search } from 'lucide-react'
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
import { Amount } from '@/components/money/Amount'
import { AmountInput } from '@/components/money/AmountInput'
import { CurrencySelect } from '@/components/money/CurrencySelect'
import { FieldError } from '@/pages/auth/Login'
import { acceptInviteSchema, claimTransferSchema, withdrawSchema } from '@/lib/schema/forms'
import { applyServerErrors } from '@/lib/formErrors'
import { formatBps } from '@/lib/money'
import {
  useAcceptInvite,
  useDeclineInvite,
  useMemberships,
  useTransferClaim,
  useUserSearch,
  useWithdraw,
} from '@/lib/hooks'

/**
 * Вклади живуть на сторінці гаманця, а не окремою вкладкою.
 *
 * Для вкладника це не два різні гаманці, а один: частина коштів лежить
 * вільною, частина працює в бізнесі. Розводити їх по вкладках означало б
 * питати людину, де шукати власні гроші.
 */

/**
 * Запрошення до бізнесу — найпершим блоком.
 *
 * Це єдине, чого від людини чекають, і воно має траплятися на очі саме там,
 * куди вона заходить, а не там, куди має здогадатися зайти.
 */
export function PendingInvites() {
  const memberships = useMemberships()
  const pending = (memberships.data ?? []).filter((m) => m.status === 'pending')
  if (pending.length === 0) return null

  return (
    <div className="space-y-3">
      {pending.map((membership) => (
        <Card key={membership.id} className="border-primary/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Запрошення до бізнесу «{membership.businessName}»
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AcceptInvite membership={membership} />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Вкладене — картка на кожен активний вклад.
 *
 * Не звід по валютах, а саме по вкладах: зняти чи переказати можна лише в
 * межах конкретного бізнесу, тож кнопки мають стояти поруч із його сумою.
 */
export function Investments() {
  const memberships = useMemberships()
  const active = (memberships.data ?? []).filter((m) => m.status === 'active')
  if (active.length === 0) return null

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold tracking-tight">Вкладено</h2>
      <div className="space-y-3">
        {active.map((membership) => (
          <InvestmentCard key={membership.id} membership={membership} />
        ))}
      </div>
    </section>
  )
}

function InvestmentCard({ membership }) {
  const owed = membership.balances.filter((row) => row.balance !== '0')

  return (
    <Card>
      <CardContent className="space-y-4 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{membership.businessName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatBps(membership.rateAnnualBps, { zeroLabel: 'без відсотків' })}
              {membership.joinedAt &&
                ` · з ${new Date(membership.joinedAt).toLocaleDateString('uk-UA')}`}
            </p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none">
            {owed.length > 0 && <WithdrawDialog membership={membership} />}
            <TransferDialog membership={membership} />
          </div>
        </div>

        {owed.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Коштів у бізнесі немає — на гаманці нічого не було на момент вступу
          </p>
        )}

        <div className="flex flex-wrap gap-x-8 gap-y-2">
          {owed.map((row) => (
            <div key={row.currency}>
              <p className="text-xs text-muted-foreground">Бізнес винен</p>
              <Amount value={row.balance} currency={row.currency} size="lg" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/** Приймаючи запрошення, учасник називає свою ставку — нуль теж відповідь. */
function AcceptInvite({ membership }) {
  const accept = useAcceptInvite()
  const decline = useDeclineInvite()
  const form = useForm({
    resolver: zodResolver(acceptInviteSchema),
    // Порожньо, а не 0: інакше людина відкриває форму й починає з того, що
    // стирає нуль. Порожнє поле схема так само читає як нуль (z.coerce),
    // тобто «без відсотків» лишається відповіддю за замовчуванням.
    defaultValues: { ratePercent: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await accept.mutateAsync({
        id: membership.id,
        // На дріт іде bps: ставки скрізь цілі, щоб 0.5% не з’їхало на float.
        body: { rateAnnualBps: Math.round(values.ratePercent * 100) },
      })
    } catch (error) {
      applyServerErrors(form, error)
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <p className="text-sm text-muted-foreground">
        Вас запросили до бізнесу. Назвіть ставку, під яку даєте кошти — нуль означає
        безвідсотково.
      </p>
      {/* Це не «погодитись і потім вкласти»: підтвердження і є вкладенням, і
          сказати про це треба до натискання, а не тостом після. */}
      <p className="text-sm">
        Щойно ви приймете, <span className="font-medium">увесь баланс вашого гаманця
        перейде до бізнесу</span> і стане його боргом перед вами. Відсотки підуть з
        цього ж дня.
      </p>
      {/* Ставка — окремим рядком над кнопками: втиснута між ними, вона на
          телефоні зʼїжджала в третій ряд, і «Прийняти» опинялося вище за
          поле, значення якого воно надсилає. */}
      <div className="w-32 space-y-2">
        <Label htmlFor={`rate-${membership.id}`}>Ставка, % річних</Label>
        <Input
          id={`rate-${membership.id}`}
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="12"
          {...form.register('ratePercent')}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="submit"
          size="lg"
          className="sm:flex-none"
          disabled={accept.isPending || decline.isPending}
        >
          <Handshake className="size-4" aria-hidden />
          {accept.isPending ? 'Приймаємо…' : 'Прийняти запрошення'}
        </Button>
        {/* Відмова нічого не рухає — кошти заходять лише при прийнятті, тож
            підтвердження тут зайве. */}
        <Button
          type="button"
          size="lg"
          variant="ghost"
          disabled={accept.isPending || decline.isPending}
          onClick={() => decline.mutate(membership.id)}
        >
          {decline.isPending ? 'Відхиляємо…' : 'Відхилити'}
        </Button>
      </div>
      <FieldError message={form.formState.errors.ratePercent?.message} />
      <FieldError message={form.formState.errors.root?.message} />
    </form>
  )
}

/**
 * Зняття коштів.
 *
 * Підтвердження власника тут немає навмисно: готівку він видає з каси в руки,
 * а додаток лише фіксує, що борг зменшився. Ставити галочку на те, що вже
 * сталося поза додатком, — зайвий крок, який нічого не гарантує.
 */
function WithdrawDialog({ membership }) {
  const [open, setOpen] = useState(false)
  const withdraw = useWithdraw()
  const owed = membership.balances.filter((row) => row.balance !== '0')

  const form = useForm({
    resolver: zodResolver(withdrawSchema),
    defaultValues: { currency: owed[0]?.currency ?? 'UAH', amount: '', comment: '' },
  })
  const { currency, amount } = form.watch()
  const available = owed.find((row) => row.currency === currency)?.balance ?? '0'

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await withdraw.mutateAsync({
        id: membership.id,
        body: values,
        key: crypto.randomUUID(),
      })
      form.reset({ currency: values.currency, amount: '', comment: '' })
      setOpen(false)
    } catch (error) {
      applyServerErrors(form, error)
    }
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <HandCoins className="size-4" aria-hidden /> Зняти кошти
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Зняти кошти</DialogTitle>
          <DialogDescription>
            Готівку видає власник з каси. Тут фіксується лише те, що бізнес винен вам на цю
            суму менше.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-[1fr_7rem] gap-3 sm:grid-cols-[1fr_8rem] sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor={`withdraw-amount-${membership.id}`}>Сума</Label>
              <AmountInput
                id={`withdraw-amount-${membership.id}`}
                currency={currency}
                value={amount}
                onChange={(value) => form.setValue('amount', value ?? '', { shouldValidate: true })}
                error={form.formState.errors.amount?.message}
                max={available}
                onMax={(value) => form.setValue('amount', value, { shouldValidate: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`withdraw-currency-${membership.id}`}>Валюта</Label>
              {/* Лише ті валюти, які бізнес справді винен: решта дала б
                  відмову вже після натискання. */}
              <CurrencySelect
                id={`withdraw-currency-${membership.id}`}
                value={currency}
                only={owed.map((row) => row.currency)}
                onChange={(value) => form.setValue('currency', value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`withdraw-comment-${membership.id}`}>Причина</Label>
            <Input
              id={`withdraw-comment-${membership.id}`}
              placeholder="На закупівлю товару"
              {...form.register('comment')}
            />
            <FieldError message={form.formState.errors.comment?.message} />
          </div>

          <p className="text-xs text-muted-foreground">
            Доступно: <Amount value={available} currency={currency} size="sm" />
          </p>

          <FieldError message={form.formState.errors.root?.message} />
          <DialogFooter>
            <Button type="submit" disabled={withdraw.isPending}>
              {withdraw.isPending ? 'Знімаємо…' : 'Зняти'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Переказ іншому учаснику того самого бізнесу.
 *
 * Гроші фізично нікуди не йдуть — міняється лише те, кому бізнес винен. Тому
 * підтвердження власника тут не потрібне, а каси навіть не ворушаться.
 */
function TransferDialog({ membership }) {
  const [open, setOpen] = useState(false)
  const [recipient, setRecipient] = useState(null)
  const transfer = useTransferClaim()

  const form = useForm({
    resolver: zodResolver(claimTransferSchema),
    defaultValues: { toUserId: '', currency: 'UAH', amount: '', comment: '' },
  })
  const { currency, amount } = form.watch()
  const available = membership.balances.find((row) => row.currency === currency)?.balance ?? '0'

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await transfer.mutateAsync({
        id: membership.id,
        body: { ...values, comment: values.comment || undefined },
        key: crypto.randomUUID(),
      })
      setRecipient(null)
      form.reset({ toUserId: '', currency: values.currency, amount: '', comment: '' })
      setOpen(false)
    } catch (error) {
      applyServerErrors(form, error)
    }
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <ArrowLeftRight className="size-4" aria-hidden /> Переказати
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Переказ учаснику</DialogTitle>
          <DialogDescription>
            Гроші лишаються в бізнесі — змінюється тільки те, кому він винен. Отримувач має
            бути учасником цього ж бізнесу.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <RecipientPicker
            value={recipient}
            onSelect={(user) => {
              setRecipient(user)
              form.setValue('toUserId', user?.id ?? '', { shouldValidate: true })
            }}
          />
          <FieldError message={form.formState.errors.toUserId?.message} />

          <div className="grid grid-cols-[1fr_7rem] gap-3 sm:grid-cols-[1fr_8rem] sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor={`transfer-amount-${membership.id}`}>Сума</Label>
              <AmountInput
                id={`transfer-amount-${membership.id}`}
                currency={currency}
                value={amount}
                onChange={(value) => form.setValue('amount', value ?? '', { shouldValidate: true })}
                error={form.formState.errors.amount?.message}
                max={available}
                onMax={(value) => form.setValue('amount', value, { shouldValidate: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`transfer-currency-${membership.id}`}>Валюта</Label>
              <CurrencySelect
                id={`transfer-currency-${membership.id}`}
                className="w-full"
                value={currency}
                onChange={(value) => form.setValue('currency', value)}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Доступно: <Amount value={available} currency={currency} size="sm" />
          </p>

          <FieldError message={form.formState.errors.root?.message} />
          <DialogFooter>
            <Button type="submit" disabled={transfer.isPending}>
              {transfer.isPending ? 'Переказуємо…' : 'Переказати'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RecipientPicker({ value, onSelect }) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const search = useUserSearch(debounced)
  const results = useMemo(() => search.data ?? [], [search.data])

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-lg border bg-accent/40 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{value.displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{value.hint}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => onSelect(null)}>
          Змінити
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="claim-recipient">Отримувач</Label>
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id="claim-recipient"
          className="pl-9"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ім’я або пошта"
          autoComplete="off"
        />
      </div>
      {debounced.length >= 2 && (
        <ul className="max-h-56 divide-y overflow-y-auto rounded-md border">
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
                onClick={() => onSelect(user)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{user.displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.hint}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
