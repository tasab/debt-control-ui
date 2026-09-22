import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ClipboardList, Plus, Trash2, Wallet } from 'lucide-react'
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
import { Amount } from '@/components/money/Amount'
import { AmountInput } from '@/components/money/AmountInput'
import { CurrencySelect } from '@/components/money/CurrencySelect'
import { Flag } from '@/components/money/Flag'
import { EmptyState, RowsSkeleton } from '@/components/layout/states'
import { SectionHeader } from '@/components/layout/Section'
import { useConfirm } from '@/components/layout/Confirm'
import { FieldError } from '@/pages/auth/Login'
import { registerCashSchema } from '@/lib/schema/forms'
import { applyServerErrors } from '@/lib/formErrors'
import { isZero, subtractAmounts } from '@/lib/money'
import {
  useCountCash,
  useCreateRegister,
  useDeleteRegister,
  useRegisters,
} from '@/lib/hooks'

/**
 * Registers (каси) are physical cash points. Each is an account in the ledger,
 * so moving cash in or out is an ordinary transfer, not a special "adjustment".
 */
export function Registers() {
  const registers = useRegisters()
  const remove = useDeleteRegister()
  const confirm = useConfirm()

  return (
    <section className="space-y-3">
      <SectionHeader icon={Wallet} title="Каси">
        <NewRegisterDialog />
      </SectionHeader>

      {registers.isLoading && <RowsSkeleton rows={2} />}

      {registers.data?.length === 0 && (
        <EmptyState
          icon={Wallet}
          title="Кас ще немає"
          description="Каса — точка обліку готівки. Залишок рахується з проводок, як і будь-який баланс."
        />
      )}

      {registers.data?.length > 0 && (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {registers.data.map((register) => (
            <Card key={register.id}>
              <CardContent className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {/* Назва — підписом, залишок — головним числом картки:
                        зрівняні в одному кеглі, вони змушували щоразу читати
                        рядок, щоб знайти в ньому суму. */}
                    <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                      <Flag code={register.currency} />
                      <span className="truncate">{register.name}</span>
                    </p>
                    <Amount
                      value={register.balance}
                      currency={register.currency}
                      size="lg"
                      showCurrency={false}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="-mr-1 -mt-1 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={`Закрити касу ${register.name}`}
                    onClick={async () => {
                      const ok = await confirm({
                        title: `Закрити касу «${register.name}»?`,
                        description: 'Каса зникне зі списку. Проводки по ній залишаться в журналі.',
                        confirmLabel: 'Закрити',
                        destructive: true,
                      })
                      if (ok) remove.mutate(register.id)
                    }}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
                {/* Внести залишок можна й у «Закритті дня», але шукають цю дію
                    саме тут — біля каси, залишок якої треба поправити. */}
                <CountRegisterDialog register={register} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}

/**
 * Внесення залишку однієї каси.
 *
 * Те саме, що рядок у «Закритті дня», лише для однієї каси: вводиться факт
 * («у касі 98 000»), а різницю з обліком система проводить сама — у виторг,
 * якщо стало більше, у витрати, якщо менше.
 */
function CountRegisterDialog({ register }) {
  const [open, setOpen] = useState(false)
  const save = useCountCash()
  const [amount, setAmount] = useState('')

  const delta = amount === '' ? null : subtractAmounts(amount, register.balance)

  const submit = async (event) => {
    event.preventDefault()
    if (amount === '') return
    await save.mutateAsync({
      body: { registers: [{ registerId: register.id, amount }], cash: [] },
      key: crypto.randomUUID(),
    })
    setAmount('')
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setAmount('')
      }}
    >
      <DialogTrigger asChild>
        {/* У двоколонковій сітці на повний підпис немає ширини, тож на
            телефоні лишається дієслово: біля самої суми його досить. */}
        <Button variant="outline" size="sm" className="w-full">
          <ClipboardList className="size-4" aria-hidden />
          <span className="sm:hidden">Внести</span>
          <span className="hidden sm:inline">Внести залишок</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{register.name}</DialogTitle>
          <DialogDescription>
            Скільки в цій касі зараз насправді. Різниця з обліком піде у виторг або витрати.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor={`count-${register.id}`}>Залишок</Label>
            <AmountInput
              id={`count-${register.id}`}
              currency={register.currency}
              value={amount}
              onChange={(value) => setAmount(value ?? '')}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              За обліком:{' '}
              <Amount value={register.balance} currency={register.currency} size="sm" showCurrency={false} />
              {delta !== null && (
                <>
                  {' · '}
                  {isZero(delta) ? (
                    <span>збігається</span>
                  ) : (
                    <Amount value={delta} currency={register.currency} size="sm" colored signed />
                  )}
                </>
              )}
            </p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={save.isPending || amount === ''}>
              {save.isPending ? 'Зберігаємо…' : 'Зберегти'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function NewRegisterDialog() {
  const [open, setOpen] = useState(false)
  const create = useCreateRegister()
  const form = useForm({
    resolver: zodResolver(registerCashSchema),
    defaultValues: { name: '', currency: 'UAH' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await create.mutateAsync(values)
      form.reset()
      setOpen(false)
    } catch (error) {
      applyServerErrors(form, error)
    }
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" aria-hidden /> Каса
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Нова каса</DialogTitle>
          <DialogDescription>Окрема точка обліку готівки в одній валюті.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="register-name">Назва</Label>
            <Input id="register-name" placeholder="Каса на Хрещатику" {...form.register('name')} />
            <FieldError message={form.formState.errors.name?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-currency">Валюта</Label>
            <CurrencySelect
              id="register-currency"
              className="w-full"
              value={form.watch('currency')}
              onChange={(value) => form.setValue('currency', value)}
            />
          </div>
          <FieldError message={form.formState.errors.root?.message} />
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Створюємо…' : 'Створити'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

