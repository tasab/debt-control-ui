import { useState } from 'react'
import { Search, ShieldCheck, SlidersHorizontal, Snowflake, Trash2 } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  set: { label: 'Встановити баланс', verb: 'Стане' },
  credit: { label: 'Додати до балансу', verb: 'Стане' },
  debit: { label: 'Списати з балансу', verb: 'Стане' },
}

export default function Admin() {
  const [search, setSearch] = useState('')
  const users = useAdminUsers(search)
  // Яку валюту якого учасника зараз редагуємо — null, поки діалог закритий.
  const [editing, setEditing] = useState<{ user: any; wallet: any } | null>(null)

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

            <CardContent className="space-y-3">
              {/* Кошти учасника лежать у бізнесі, а не на гаманці — без цього
                  рядка картка показувала б самі нулі там, де є гроші. */}
              {user.invested?.length > 0 && (
                <div className="rounded-md border border-dashed p-2.5">
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">У бізнесі</p>
                  <div className="space-y-1">
                    {user.invested.map((row, index) => (
                      <div key={index} className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate text-muted-foreground">
                          {row.businessName}
                          <span className="ml-1.5 font-mono text-xs">{row.currency}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <Amount value={row.amount} currency={row.currency} size="sm" />
                          {/* Та сама правка, що й для гаманця: адмін каже
                              «має бути стільки», а куди це лягає — вирішує ціль. */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6"
                            aria-label={`Змінити борг у «${row.businessName}»`}
                            onClick={() =>
                              setEditing({
                                user,
                                wallet: {
                                  currency: row.currency,
                                  available: row.amount,
                                  held: '0',
                                  memberId: row.memberId,
                                  businessName: row.businessName,
                                },
                              })
                            }
                          >
                            <SlidersHorizontal className="size-3.5" aria-hidden />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <ul className="divide-y">
                {user.wallets.map((wallet) => (
                  <li
                    key={wallet.currency}
                    className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                  >
                    <span className="w-12 font-mono text-sm text-muted-foreground">
                      {wallet.currency}
                    </span>
                    <div className="flex flex-1 flex-wrap items-center justify-end gap-x-6 gap-y-1">
                      <Amount value={wallet.available} currency={wallet.currency} />
                      {BigInt(wallet.held) > 0n && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Snowflake className="size-3.5" aria-hidden />
                          заморожено{' '}
                          <Amount
                            value={wallet.held}
                            currency={wallet.currency}
                            size="sm"
                            showCurrency={false}
                          />
                        </span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditing({ user, wallet })}
                      >
                        <SlidersHorizontal className="size-3.5" aria-hidden />
                        Змінити
                      </Button>
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
          user={editing.user}
          wallet={editing.wallet}
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
 * Для адміна це одна дія: «має бути стільки». Що саме правиться, вирішує
 * ціль; знак і рахунок — деталі журналу, і сюди вони не протікають.
 */
function AdjustDialog({ user, wallet, onClose }) {
  const adjust = useAdjustBalance()
  const history = useAdminAdjustments(user.id)
  const [mode, setMode] = useState('set')
  const [amount, setAmount] = useState(mode === 'set' ? wallet.available : '')
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isClaim = Boolean(wallet.memberId)
  const before = BigInt(wallet.available)
  const entered = amount ? BigInt(amount) : 0n
  const after = mode === 'set' ? entered : mode === 'credit' ? before + entered : before - entered
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
            {user.displayName} · {wallet.currency}
            {isClaim && <span className="ml-2 font-normal text-muted-foreground">у бізнесі</span>}
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
            <Label htmlFor="adjust-mode">Дія</Label>
            <Select
              value={mode}
              onValueChange={(next) => {
                setMode(next)
                // «Встановити» починає з поточного балансу — так видно, що саме
                // редагується, і випадкове підтвердження нічого не змінює.
                setAmount(next === 'set' ? wallet.available : '')
              }}
            >
              <SelectTrigger id="adjust-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MODES).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adjust-amount">
              {mode === 'set' ? 'Новий баланс' : 'Сума'}
            </Label>
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
              disabled={adjust.isPending || belowZero || unchanged || comment.trim().length < 3}
            >
              {adjust.isPending ? 'Проводимо…' : 'Підтвердити'}
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
