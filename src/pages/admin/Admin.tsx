import { useState } from 'react'
import {
  Minus,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Snowflake,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { UserShareDialog } from '@/pages/wallet/ShareBalance'
import { Amount } from '@/components/money/Amount'
import { AmountInput } from '@/components/money/AmountInput'
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/layout/states'
import { FieldError } from '@/pages/auth/Login'
import { useConfirm } from '@/components/layout/Confirm'
import { formatAmount } from '@/lib/money'
import { Rates } from './Rates.tsx'
import {
  useAdjustBalance,
  useAdminAdjustments,
  useAdminUsers,
  useDeleteUser,
  useExponents,
} from '@/lib/hooks'

/**
 * Адмінська правка рахунків учасників.
 *
 * Баланс не поле, а сума незмінного журналу, тому кожна правка — це звичайне
 * збалансоване проведення проти `external` (як поповнення). Наслідок, який
 * видно тут: у користувача правка з’являється у виписці, а не змінює число
 * нишком. Заморожені кошти не редагуються — вони належать відкритій заявці.
 */
const MODES = {
  set: {
    title: 'Встановити баланс',
    field: 'Новий баланс',
    verb: 'Стане',
    submit: 'Підтвердити',
  },
  credit: {
    title: 'Додати до балансу',
    field: 'Скільки додати',
    verb: 'Стане',
    submit: 'Додати',
  },
  debit: {
    title: 'Зняти з балансу',
    field: 'Скільки зняти',
    verb: 'Стане',
    submit: 'Зняти',
  },
}

/**
 * Гроші учасника одним списком.
 *
 * Для адміна немає різниці, де саме лежить сума — на гаманці чи в боргу
 * бізнесу перед людиною: правиться вона однаково. Тому окремого блоку «У
 * бізнесі» немає, а рядок лише підписаний назвою бізнесу.
 */
const balanceRows = (user) => [
  ...(user.wallets ?? []).map((wallet) => ({
    key: `wallet:${wallet.currency}`,
    currency: wallet.currency,
    available: wallet.available,
    held: wallet.held,
  })),
  ...(user.invested ?? []).map((row) => ({
    key: `member:${row.memberId}:${row.currency}`,
    currency: row.currency,
    available: row.amount,
    held: '0',
    memberId: row.memberId,
    businessName: row.businessName,
  })),
]

export default function Admin() {
  const [search, setSearch] = useState('')
  const users = useAdminUsers(search)
  // Яку валюту якого учасника зараз редагуємо і якою дією — null, поки діалог
  // закритий.
  const [editing, setEditing] = useState<{
    user: any
    wallet: any
    mode: string
  } | null>(null)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <ShieldCheck className="size-5 text-primary" aria-hidden />
          Рахунки учасників
        </h1>
        <p className="text-sm text-muted-foreground">
          Правка балансу проводиться через журнал: користувач бачить її у своїй виписці, а сума
          лишається збалансованою. Заморожені кошти редагувати не можна.
        </p>
      </div>

      <Rates />

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          className="pl-9"
          placeholder="Пошук за ім’ям або поштою"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {users.isLoading && <RowsSkeleton rows={4} />}
      {users.isError && <ErrorState error={users.error} onRetry={users.refetch} />}
      {users.data?.items?.length === 0 && (
        <EmptyState
          icon={Search}
          title="Нікого не знайдено"
          description="Спробуйте інший запит — пошук іде за ім’ям і поштою."
        />
      )}

      <div className="space-y-3">
        {users.data?.items?.map((user) => (
          <Card key={user.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">{user.displayName}</CardTitle>
                  <CardDescription className="truncate">{user.email}</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {user.isAdmin && <Badge variant="secondary">адмін</Badge>}
                  {user.capabilities?.map((capability) => (
                    <Badge key={capability} variant="outline">
                      {capability === 'invest' ? 'інвестор' : 'бізнес'}
                    </Badge>
                  ))}
                  {user.businessName && (
                    <Badge variant="outline" className="max-w-40 truncate">
                      {user.businessName}
                    </Badge>
                  )}
                  <UserShareDialog user={user} />
                  <DeleteUserButton user={user} />
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <ul className="divide-y">
                {balanceRows(user).map((row) => (
                  <li
                    key={row.key}
                    className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                  >
                    <span className="flex min-w-12 items-baseline gap-2 text-sm">
                      <span className="font-mono text-muted-foreground">{row.currency}</span>
                      {row.businessName && (
                        <span className="truncate text-muted-foreground">{row.businessName}</span>
                      )}
                    </span>
                    <div className="flex flex-1 flex-wrap items-center justify-end gap-x-6 gap-y-1">
                      <Amount value={row.available} currency={row.currency} />
                      {BigInt(row.held) > 0n && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Snowflake className="size-3.5" aria-hidden />
                          заморожено{' '}
                          <Amount
                            value={row.held}
                            currency={row.currency}
                            size="sm"
                            showCurrency={false}
                          />
                        </span>
                      )}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditing({ user, wallet: row, mode: 'set' })}
                        >
                          <SlidersHorizontal className="size-3.5" aria-hidden />
                          Змінити
                        </Button>
                        {/* Напрям руху грошей видно ще до натискання: додати —
                            зелене, зняти — червоне, як і самі суми в списках. */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-success/40 text-success hover:bg-success/10 hover:text-success"
                          onClick={() => setEditing({ user, wallet: row, mode: 'credit' })}
                        >
                          <Plus className="size-3.5" aria-hidden />
                          Додати
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setEditing({ user, wallet: row, mode: 'debit' })}
                        >
                          <Minus className="size-3.5" aria-hidden />
                          Зняти
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {editing && (
        <AdjustDialog
          key={`${editing.user.id}:${editing.wallet.key}:${editing.mode}`}
          user={editing.user}
          wallet={editing.wallet}
          mode={editing.mode}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

/**
 * Видалення користувача.
 *
 * Сервер відмовить, якщо за людиною лишилися гроші чи бізнес, — і тут це
 * сказано наперед, щоб вікно не пропонувало того, чого не станеться.
 */
function DeleteUserButton({ user }) {
  const remove = useDeleteUser()
  const confirm = useConfirm()
  const exponents = useExponents()

  const money = (amount, currency) =>
    `${formatAmount(amount, { exponent: exponents[currency] ?? 2 })} ${currency}`

  // Усе, що зникне разом із людиною: вільні кошти на гаманці й те, що бізнес
  // їй винен. Модалка називає це поіменно — списувати гроші наосліп не можна.
  const losses = [
    ...(user.wallets ?? [])
      .filter((wallet) => wallet.available !== '0')
      .map((wallet) => `${money(wallet.available, wallet.currency)} з гаманця`),
    ...(user.invested ?? []).map(
      (row) => `${money(row.amount, row.currency)} у «${row.businessName}»`,
    ),
  ]

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground hover:text-destructive"
      aria-label={`Видалити ${user.displayName}`}
      disabled={remove.isPending}
      onClick={async () => {
        if (user.businessName) {
          await confirm({
            title: `«${user.displayName}» не можна видалити`,
            description: `У користувача є бізнес «${user.businessName}» — з касами, учасниками й боргами перед ними. Спершу розберіться з бізнесом.`,
            confirmLabel: 'Зрозуміло',
            cancelLabel: 'Закрити',
          })
          return
        }

        const ok = await confirm({
          title: `Видалити «${user.displayName}»?`,
          description:
            losses.length > 0
              ? `Буде списано: ${losses.join(', ')}. Гроші з гаманця вийдуть із системи, борг бізнесу перед ним стане його виторгом. Скасувати це можна лише вручну через журнал.`
              : 'Людина зникне зі списків і не зможе увійти, активні сесії обірвуться. Проводки в журналі залишаться.',
          confirmLabel: losses.length > 0 ? 'Списати й видалити' : 'Видалити',
          destructive: true,
        })
        if (ok) remove.mutate({ id: user.id, force: losses.length > 0 })
      }}
    >
      <Trash2 className="size-4" aria-hidden />
    </Button>
  )
}

/**
 * Правка балансу — гаманця або боргу бізнесу перед учасником.
 *
 * Дію задає кнопка, якою вікно відкрили: «Змінити» каже «має бути стільки»,
 * «Додати» й «Зняти» — «на стільки більше чи менше». Вибирати її ще раз
 * усередині нема з чого. Що саме правиться, вирішує ціль; знак і рахунок —
 * деталі журналу, і сюди вони не протікають.
 */
function AdjustDialog({ user, wallet, mode, onClose }) {
  const adjust = useAdjustBalance()
  const history = useAdminAdjustments(user.id)
  // Поле починається порожнім: підставлений баланс читався як уже введена
  // сума, і робота починалася зі стирання чужих нулів.
  const [amount, setAmount] = useState('')
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isClaim = Boolean(wallet.memberId)
  const before = BigInt(wallet.available)
  const entered = amount ? BigInt(amount) : 0n
  const after = !amount
    ? before
    : mode === 'set'
      ? entered
      : mode === 'credit'
        ? before + entered
        : before - entered
  const belowZero = after < 0n
  const unchanged = after === before

  const submit = async (event) => {
    event.preventDefault()
    setError(null)
    try {
      await adjust.mutateAsync({
        id: user.id,
        body: {
          currency: wallet.currency,
          mode,
          amount: amount || '0',
          comment,
          ...(isClaim ? { memberId: wallet.memberId } : {}),
        },
        key: crypto.randomUUID(),
      })
      onClose()
    } catch (err) {
      // Тут немає react-hook-form, тож показуємо те поле, на яке лаявся сервер.
      setError(err.fields ? Object.values(err.fields)[0] : err.message)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {MODES[mode].title}
            <span className="ml-2 font-normal text-muted-foreground">
              {user.displayName} · {wallet.currency}
              {isClaim && ' у бізнесі'}
            </span>
          </DialogTitle>
          <DialogDescription>
            {isClaim ? (
              <>
                «{wallet.businessName}» винен{' '}
                <Amount value={wallet.available} currency={wallet.currency} size="sm" />. Правка
                змінює саме борг, каси не рухаються.
              </>
            ) : (
              <>
                Доступний баланс:{' '}
                <Amount value={wallet.available} currency={wallet.currency} size="sm" />
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="adjust-amount">{MODES[mode].field}</Label>
            <AmountInput
              id="adjust-amount"
              currency={wallet.currency}
              value={amount}
              onChange={(value) => setAmount(value ?? '')}
              max={mode === 'debit' ? wallet.available : undefined}
              onMax={mode === 'debit' ? (value) => setAmount(value) : undefined}
              error={belowZero ? 'Баланс не може стати від’ємним' : undefined}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adjust-comment">Причина</Label>
            <Textarea
              id="adjust-comment"
              rows={2}
              placeholder="Компенсація за помилковий переказ №…"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Потрапляє в журнал аудиту і в коментар до операції — її побачить і користувач.
            </p>
          </div>

          <div className="rounded-lg border p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Було</span>
              <Amount value={wallet.available} currency={wallet.currency} />
            </div>
            <div className="mt-2 flex justify-between font-medium">
              <span>{MODES[mode].verb}</span>
              <Amount
                value={(after < 0n ? 0n : after).toString()}
                currency={wallet.currency}
                colored
              />
            </div>
          </div>

          <FieldError message={error} />

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Скасувати
            </Button>
            <Button
              type="submit"
              // Колір кнопки той самий, що й у рядку списку, — щоб у вікні не
              // доводилося перечитувати, яку саме дію підтверджуєш.
              variant={mode === 'debit' ? 'destructive' : 'default'}
              className={
                mode === 'credit'
                  ? 'bg-success text-success-foreground hover:bg-success/90'
                  : undefined
              }
              disabled={
                adjust.isPending || !amount || belowZero || unchanged || comment.trim().length < 3
              }
            >
              {adjust.isPending ? 'Проводимо…' : MODES[mode].submit}
            </Button>
          </DialogFooter>
        </form>

        {history.data?.items?.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Останні коригування</p>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {history.data.items.slice(0, 5).map((row) => (
                  <li key={row.id} className="flex justify-between gap-3">
                    <span className="truncate">
                      {new Date(row.createdAt).toLocaleDateString('uk-UA')} · {row.actor ?? '—'}
                      {row.comment ? ` · ${row.comment}` : ''}
                    </span>
                    {row.before !== null && row.after !== null && (
                      <span className="flex shrink-0 items-center gap-1">
                        <Amount
                          value={row.before}
                          currency={row.currency}
                          size="sm"
                          showCurrency={false}
                        />
                        →
                        <Amount value={row.after} currency={row.currency} size="sm" />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
