import { useRef, useState } from 'react'
import { Plus } from 'lucide-react'
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
import { AmountInput } from '@/components/money/AmountInput'
import { CurrencySelect } from '@/components/money/CurrencySelect'
import { ActionTileLabel, actionTileClass } from '@/components/layout/ActionTile'
import { useTopUpSelf } from '@/lib/hooks'

/**
 * Записати собі власні кошти.
 *
 * Це не платіж і не поповнення ззовні — рейок у системи немає (D1). Це запис
 * у власному зошиті: «у мене є стільки», щоб далі цим можна було переказувати
 * й вкладати, не смикаючи адміністратора.
 *
 * Через те, що сума береться з голови, у виписці вона стоїть окремим типом
 * (`self_topup`) і підписана «записано вами». Той, хто читає історію, має
 * бачити різницю між грошима, які провів адміністратор, і тими, які власник
 * рахунку вписав сам, — інакше зошит не відрізнити від підробки.
 */
export function TopUpDialog({ asTile = false }) {
  const [open, setOpen] = useState(false)
  const topUp = useTopUpSelf()
  const [currency, setCurrency] = useState('UAH')
  const [amount, setAmount] = useState('')
  const [comment, setComment] = useState('')

  // Один ключ на спробу: повтор після обірваної відповіді має лишитися тим
  // самим записом, а не стати другим.
  const idempotencyKey = useRef(crypto.randomUUID())

  const submit = async (event) => {
    event.preventDefault()
    if (!amount) return
    await topUp.mutateAsync({
      body: { currency, amount, comment: comment.trim() || undefined },
      key: idempotencyKey.current,
    })
    idempotencyKey.current = crypto.randomUUID()
    setAmount('')
    setComment('')
    setOpen(false)
  }

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
            <Plus className="size-5" aria-hidden />
            <ActionTileLabel>Записати</ActionTileLabel>
          </button>
        ) : (
          <Button variant="outline" size="sm">
            <Plus className="size-4" aria-hidden /> Записати
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Записати власні кошти</DialogTitle>
          <DialogDescription>
            Скільки у вас є на руках. Сума ляже на ваш гаманець — далі її можна переказувати
            й вкладати. У виписці буде видно, що запис зробили ви, а не адміністратор.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid grid-cols-[1fr_7rem] gap-3 sm:grid-cols-[1fr_8rem] sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="topup-amount">Сума</Label>
              <AmountInput
                id="topup-amount"
                currency={currency}
                value={amount}
                onChange={(value) => setAmount(value ?? '')}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topup-currency">Валюта</Label>
              <CurrencySelect
                id="topup-currency"
                className="w-full"
                value={currency}
                onChange={setCurrency}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="topup-comment">Звідки ці кошти</Label>
            <Textarea
              id="topup-comment"
              rows={2}
              maxLength={280}
              placeholder="напр. зарплата за вересень"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Необовʼязково, але через місяць саме цей рядок пояснить, звідки взялася сума.
            </p>
          </div>

          <DialogFooter>
            <Button type="submit" size="lg" disabled={topUp.isPending || !amount}>
              {topUp.isPending ? 'Записуємо…' : 'Записати'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
