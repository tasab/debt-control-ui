import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
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
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Amount } from '@/components/money/Amount'
import { AmountInput } from '@/components/money/AmountInput'
import { StatusBadge } from '@/components/money/StatusBadge'
import { RowsSkeleton } from '@/components/layout/states'
import { FieldError } from '@/pages/auth/Login'
import { repaySchema } from '@/lib/schema/forms'
import { applyServerErrors } from '@/lib/formErrors'
import { addAmounts, formatBps } from '@/lib/money'
import { useLoans, useRepay } from '@/lib/hooks'

export function MyLoans() {
  const loans = useLoans({ role: 'borrower' })

  if (loans.isLoading) return <RowsSkeleton rows={2} />
  if (!loans.data?.items?.length) return null

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">Мої позики</h2>
      <div className="space-y-3">
        {loans.data.items.map((loan) => (
          <Card key={loan.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <Link to={`/loans/${loan.id}`} className="font-medium hover:underline">
                    Позика на <Amount value={loan.principal} currency={loan.currency} />
                  </Link>
                  <StatusBadge status={loan.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatBps(loan.rateAnnualBps)} річних · до{' '}
                  {new Date(loan.maturesAt).toLocaleDateString('uk-UA')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <p className="text-xs text-muted-foreground">Залишок тіла</p>
                  <Amount value={loan.outstandingPrincipal} currency={loan.currency} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Нараховані %</p>
                  <Amount value={loan.interestOutstanding} currency={loan.currency} />
                </div>
                {loan.status !== 'closed' && <RepayDialog loan={loan} />}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}

/**
 * Repayment. The split (interest first, then principal) is decided by the
 * server; the dialog shows what the amount will cover so it is not a surprise.
 */
function RepayDialog({ loan }) {
  const [open, setOpen] = useState(false)
  const repay = useRepay()
  const form = useForm({ resolver: zodResolver(repaySchema), defaultValues: { amount: '' } })
  const amount = form.watch('amount')

  const total = addAmounts(loan.outstandingPrincipal, loan.interestOutstanding)
  const interestPart =
    amount && BigInt(amount) > 0n
      ? (BigInt(amount) < BigInt(loan.interestOutstanding)
          ? BigInt(amount)
          : BigInt(loan.interestOutstanding)
        ).toString()
      : '0'
  const principalPart = (BigInt(amount || '0') - BigInt(interestPart)).toString()

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await repay.mutateAsync({ id: loan.id, body: values, key: crypto.randomUUID() })
      setOpen(false)
      form.reset()
    } catch (error) {
      applyServerErrors(form, error)
    }
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Погасити</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Погашення позики</DialogTitle>
          <DialogDescription>
            Спершу закриваються відсотки, потім тіло. Кошти списуються з гаманця бізнесу.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="repay-amount">Сума платежу</Label>
            <AmountInput
              id="repay-amount"
              currency={loan.currency}
              value={amount}
              max={total}
              onMax={(value) => form.setValue('amount', value, { shouldValidate: true })}
              onChange={(value) => form.setValue('amount', value ?? '', { shouldValidate: true })}
              error={form.formState.errors.amount?.message}
            />
            <p className="text-xs text-muted-foreground">
              До повного погашення: <Amount value={total} currency={loan.currency} size="sm" />
            </p>
          </div>

          {amount && BigInt(amount) > 0n && (
            <div className="rounded-lg border p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Піде на відсотки</span>
                <Amount value={interestPart} currency={loan.currency} />
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-muted-foreground">Піде на тіло</span>
                <Amount value={principalPart} currency={loan.currency} />
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between font-medium">
                <span>Залишиться боргу</span>
                <Amount
                  value={(BigInt(total) - BigInt(amount)).toString()}
                  currency={loan.currency}
                />
              </div>
            </div>
          )}

          <FieldError message={form.formState.errors.root?.message} />

          <DialogFooter>
            <Button type="submit" disabled={repay.isPending || !amount}>
              {repay.isPending ? 'Проводимо…' : 'Підтвердити платіж'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
