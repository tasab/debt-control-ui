import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeftRight, Plus, Trash2, Wallet } from 'lucide-react'
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
import { FieldError } from '@/pages/auth/Login'
import { registerCashSchema, moveFundsSchema } from '@/lib/schema/forms'
import { applyServerErrors } from '@/lib/formErrors'
import {
  useCreateRegister,
  useDeleteRegister,
  useMoveFunds,
  useRegisters,
  useWallets,
} from '@/lib/hooks'

/**
 * Registers (каси) are physical cash points. Each is an account in the ledger,
 * so moving cash in or out is an ordinary transfer, not a special "adjustment".
 */
export function Registers() {
  const registers = useRegisters()
  const remove = useDeleteRegister()

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Каси</h2>
        <div className="flex gap-2">
          <MoveFundsDialog registers={registers.data ?? []} />
          <NewRegisterDialog />
        </div>
      </div>

      {registers.isLoading && <RowsSkeleton rows={2} />}

      {registers.data?.length === 0 && (
        <EmptyState
          icon={Wallet}
          title="Кас ще немає"
          description="Каса — точка обліку готівки. Залишок рахується з проводок, як і будь-який баланс."
        />
      )}

      {registers.data?.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {registers.data.map((register) => (
            <Card key={register.id}>
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{register.name}</p>
                  <Amount value={register.balance} currency={register.currency} />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Закрити касу ${register.name}`}
                  onClick={() => {
                    if (confirm(`Закрити касу «${register.name}»?`)) remove.mutate(register.id)
                  }}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
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

/** Owner wallet ↔ business wallet ↔ registers, all through one form. */
function MoveFundsDialog({ registers }) {
  const [open, setOpen] = useState(false)
  const move = useMoveFunds()
  const { data: wallets = [] } = useWallets()

  const form = useForm({
    resolver: zodResolver(moveFundsSchema),
    defaultValues: { from: 'owner', to: 'business', currency: 'UAH', amount: '', comment: '' },
  })
  const { from, to, currency, amount } = form.watch()

  const endpoints = [
    { value: 'owner', label: 'Мій особистий гаманець' },
    { value: 'business', label: 'Гаманець бізнесу' },
    ...registers.map((r) => ({ value: `register:${r.id}`, label: `Каса «${r.name}» (${r.currency})` })),
  ]

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await move.mutateAsync({
        body: { ...values, comment: values.comment || undefined },
        key: crypto.randomUUID(),
      })
      form.reset({ ...values, amount: '', comment: '' })
      setOpen(false)
    } catch (error) {
      applyServerErrors(form, error)
    }
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <ArrowLeftRight className="size-4" aria-hidden /> Перемістити
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Переміщення коштів</DialogTitle>
          <DialogDescription>
            Між вашим гаманцем, гаманцем бізнесу й касами. Погашення позик іде з гаманця бізнесу.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="move-from">Звідки</Label>
            <EndpointSelect
              id="move-from"
              value={from}
              onChange={(value) => form.setValue('from', value)}
              options={endpoints}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="move-to">Куди</Label>
            <EndpointSelect
              id="move-to"
              value={to}
              onChange={(value) => form.setValue('to', value)}
              options={endpoints.filter((e) => e.value !== from)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
            <div className="space-y-2">
              <Label htmlFor="move-amount">Сума</Label>
              <AmountInput
                id="move-amount"
                currency={currency}
                value={amount}
                onChange={(value) => form.setValue('amount', value ?? '', { shouldValidate: true })}
                error={form.formState.errors.amount?.message}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="move-currency">Валюта</Label>
              <CurrencySelect
                id="move-currency"
                value={currency}
                onChange={(value) => form.setValue('currency', value)}
              />
            </div>
          </div>
          {from === 'owner' && (
            <p className="text-xs text-muted-foreground">
              Доступно:{' '}
              <Amount
                value={wallets.find((w) => w.currency === currency)?.available ?? '0'}
                currency={currency}
                size="sm"
              />
            </p>
          )}
          <FieldError message={form.formState.errors.root?.message} />
          <DialogFooter>
            <Button type="submit" disabled={move.isPending}>
              {move.isPending ? 'Переміщуємо…' : 'Перемістити'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EndpointSelect({ id, value, onChange, options }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
