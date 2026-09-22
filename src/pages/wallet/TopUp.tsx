import { useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Amount } from '@/components/money/Amount'
import { AmountInput } from '@/components/money/AmountInput'
import { CurrencySelect } from '@/components/money/CurrencySelect'
import { ActionTileLabel, actionTileClass } from '@/components/layout/ActionTile'
import { cn } from '@/lib/utils'
import { useTopUpSelf, useWithdrawSelf } from '@/lib/hooks'

/**
 * Записати собі власні кошти — і зняти їх.
 *
 * Це не платіж і не поповнення ззовні — рейок у системи немає (D1). Це запис
 * у власному зошиті: «у мене є стільки», щоб далі цим можна було переказувати
 * й вкладати, не смикаючи адміністратора. Зняття — те саме дзеркально: гроші
 * пішли з рахунку в готівку на руки.
 *
 * Через те, що сума береться з голови, у виписці вона стоїть окремим типом
 * (`self_topup` / `self_withdrawal`) і підписана «записано вами» чи «знято
 * вами». Той, хто читає історію, має бачити різницю між грошима, які провів
 * адміністратор, і тими, які власник рахунку вписав сам, — інакше зошит не
 * відрізнити від підробки.
 */
const MODES = {
  topup: {
    icon: Plus,
    tile: 'Записати',
    action: 'Додати',
    title: 'Записати власні кошти',
    description:
      'Скільки у вас є на руках. Сума ляже на ваш гаманець — далі її можна переказувати й вкладати. У виписці буде видно, що запис зробили ви, а не адміністратор.',
    amountLabel: 'Сума',
    commentLabel: 'Звідки ці кошти',
    commentHint: 'Зарплата за вересень',
    pending: 'Записуємо…',
    submit: 'Записати',
  },
  withdraw: {
    icon: Minus,
    tile: 'Зняти',
    action: 'Зняти',
    title: 'Зняти власні кошти',
    description:
      'Скільки ви забрали з рахунку на руки. Сума піде з гаманця, і у виписці буде видно, що зняли її ви. Заморожені кошти не рухаються.',
    amountLabel: 'Сума',
    commentLabel: 'Куди ці кошти',
    commentHint: 'Зняв готівкою на ремонт',
    pending: 'Знімаємо…',
    submit: 'Зняти',
  },
}

export function TopUpDialog({
  asTile = false,
  mode = 'topup',
  currency: fixedCurrency,
  available,
  block = false,
}) {
  const [open, setOpen] = useState(false)
  const topUp = useTopUpSelf()
  const withdraw = useWithdrawSelf()
  const mutation = mode === 'withdraw' ? withdraw : topUp
  const copy = MODES[mode]
  // Коли діалог відкритий із картки валюти, валюту вже обрали — питати про неї
  // вдруге нема сенсу.
  const [currency, setCurrency] = useState(fixedCurrency ?? 'UAH')
  const [amount, setAmount] = useState('')
  const [comment, setComment] = useState('')

  // Один ключ на спробу: повтор після обірваної відповіді має лишитися тим
  // самим записом, а не стати другим.
  const idempotencyKey = useRef(crypto.randomUUID())

  const tooMuch =
    mode === 'withdraw' && available != null && amount ? BigInt(amount) > BigInt(available) : false

  const submit = async (event) => {
    event.preventDefault()
    if (!amount || tooMuch) return
    await mutation.mutateAsync({
      body: { currency, amount, comment: comment.trim() || undefined },
      key: idempotencyKey.current,
    })
    idempotencyKey.current = crypto.randomUUID()
    setAmount('')
    setComment('')
    setOpen(false)
  }

  const Icon = copy.icon

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setAmount('')
          setComment('')
        }
      }}
    >
      <DialogTrigger asChild>
        {asTile ? (
          <button type="button" className={actionTileClass()}>
            <Icon className="size-5" aria-hidden />
            <ActionTileLabel>{copy.tile}</ActionTileLabel>
          </button>
        ) : (
          // Кнопка в картці рахунку: на всю ширину половини картки й кольором
          // напрямку — зелене додає, червоне забирає, як і суми в списках.
          <Button
            variant="outline"
            size={block ? 'default' : 'sm'}
            className={cn(
              block && 'w-full',
              mode === 'withdraw'
                ? 'border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive'
                : 'border-success/40 text-success hover:bg-success/10 hover:text-success',
            )}
          >
            <Icon className="size-4" aria-hidden /> {copy.action}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {copy.title}
            {fixedCurrency && (
              <span className="ml-2 font-normal text-muted-foreground">{fixedCurrency}</span>
            )}
          </DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div
            className={cn(
              'gap-3 sm:gap-4',
              fixedCurrency ? 'grid' : 'grid grid-cols-[1fr_7rem] sm:grid-cols-[1fr_8rem]',
            )}
          >
            <div className="space-y-2">
              <Label htmlFor="topup-amount">{copy.amountLabel}</Label>
              <AmountInput
                id="topup-amount"
                currency={currency}
                value={amount}
                onChange={(value) => setAmount(value ?? '')}
                max={mode === 'withdraw' ? available : undefined}
                onMax={mode === 'withdraw' && available ? (value) => setAmount(value) : undefined}
                error={tooMuch ? 'Більше, ніж доступно на рахунку' : undefined}
                autoFocus
              />
            </div>
            {!fixedCurrency && (
              <div className="space-y-2">
                <Label htmlFor="topup-currency">Валюта</Label>
                <CurrencySelect
                  id="topup-currency"
                  className="w-full"
                  value={currency}
                  onChange={setCurrency}
                />
              </div>
            )}
          </div>

          {mode === 'withdraw' && available != null && (
            <p className="text-xs text-muted-foreground">
              Доступно: <Amount value={available} currency={currency} size="sm" />
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="topup-comment">{copy.commentLabel}</Label>
            <Textarea
              id="topup-comment"
              rows={2}
              maxLength={280}
              placeholder={copy.commentHint}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Необовʼязково, але через місяць саме цей рядок пояснить, звідки взялася сума.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              size="lg"
              variant={mode === 'withdraw' ? 'destructive' : 'default'}
              className={
                mode === 'topup'
                  ? 'bg-success text-success-foreground hover:bg-success/90'
                  : undefined
              }
              disabled={mutation.isPending || !amount || tooMuch}
            >
              {mutation.isPending ? copy.pending : copy.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
