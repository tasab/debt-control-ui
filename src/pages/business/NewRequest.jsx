import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AmountInput } from '@/components/money/AmountInput'
import { CurrencySelect } from '@/components/money/CurrencySelect'
import { Amount } from '@/components/money/Amount'
import { FieldError } from '@/pages/auth/Login'
import { fundingRequestSchema } from '@/lib/schema/forms'
import { applyServerErrors } from '@/lib/formErrors'
import { useCreateRequest } from '@/lib/hooks'

const inTwoWeeks = () => {
  const date = new Date(Date.now() + 14 * 86_400_000)
  return date.toISOString().slice(0, 10)
}

export default function NewRequest() {
  const navigate = useNavigate()
  const create = useCreateRequest()

  const form = useForm({
    resolver: zodResolver(fundingRequestSchema),
    defaultValues: {
      currency: 'UAH',
      amountTarget: '',
      ratePercent: 18,
      termDays: 180,
      repaymentType: 'bullet',
      minTicket: '10000',
      minFillPercent: 50,
      purpose: '',
      expiresAt: inTwoWeeks(),
    },
  })
  const values = form.watch()
  const hasAmount = !!values.amountTarget && BigInt(values.amountTarget || '0') > 0n

  // Full cost of the money, shown before publishing: rate × term, simple
  // interest — the same formula the server accrues with.
  const totalInterest =
    values.amountTarget && BigInt(values.amountTarget || '0') > 0n
      ? (BigInt(values.amountTarget) *
          BigInt(Math.round(values.ratePercent * 100)) *
          BigInt(values.termDays)) /
        (10000n * 365n)
      : 0n

  const onSubmit = form.handleSubmit(async (v) => {
    try {
      await create.mutateAsync({
        currency: v.currency,
        amountTarget: v.amountTarget,
        // The wire format is basis points; percent exists only in this form.
        rateAnnualBps: Math.round(v.ratePercent * 100),
        termDays: Number(v.termDays),
        repaymentType: v.repaymentType,
        minTicket: v.minTicket,
        minFillBps: Math.round(v.minFillPercent * 100),
        purpose: v.purpose || undefined,
        expiresAt: new Date(`${v.expiresAt}T23:59:59Z`).toISOString(),
      })
      navigate('/business')
    } catch (error) {
      applyServerErrors(form, error)
    }
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/business">← До бізнесу</Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Нова заявка на залучення</CardTitle>
          <CardDescription>
            Інвестори побачать її в маркетплейсі. Заявка збирається кількома внесками.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
              <div className="space-y-2">
                <Label htmlFor="amountTarget">Потрібна сума</Label>
                <AmountInput
                  id="amountTarget"
                  currency={values.currency}
                  value={values.amountTarget}
                  onChange={(value) =>
                    form.setValue('amountTarget', value ?? '', { shouldValidate: true })
                  }
                  error={form.formState.errors.amountTarget?.message}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Валюта</Label>
                <CurrencySelect
                  id="currency"
                  value={values.currency}
                  onChange={(value) => form.setValue('currency', value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ratePercent">Ставка, % річних</Label>
                <Input
                  id="ratePercent"
                  type="number"
                  step="0.25"
                  min="0"
                  {...form.register('ratePercent')}
                />
                <FieldError message={form.formState.errors.ratePercent?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="termDays">Строк, днів</Label>
                <Input id="termDays" type="number" min="7" {...form.register('termDays')} />
                <FieldError message={form.formState.errors.termDays?.message} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="repaymentType">Тип погашення</Label>
                <Select
                  value={values.repaymentType}
                  onValueChange={(value) => form.setValue('repaymentType', value)}
                >
                  <SelectTrigger id="repaymentType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bullet">Відсотки щомісяця, тіло в кінці</SelectItem>
                    <SelectItem value="interest_only_flex">
                      Тільки відсотки, тіло за вимогою
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresAt">Дедлайн збору</Label>
                <Input id="expiresAt" type="date" {...form.register('expiresAt')} />
                <FieldError message={form.formState.errors.expiresAt?.message} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="minTicket">Мінімальний внесок</Label>
                <AmountInput
                  id="minTicket"
                  currency={values.currency}
                  value={values.minTicket}
                  onChange={(value) => form.setValue('minTicket', value ?? '')}
                  error={form.formState.errors.minTicket?.message}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minFillPercent">Видавати, якщо зібрано від, %</Label>
                <Input
                  id="minFillPercent"
                  type="number"
                  min="0"
                  max="100"
                  {...form.register('minFillPercent')}
                />
                <p className="text-xs text-muted-foreground">
                  Якщо до дедлайну зібрано менше — холди повертаються інвесторам.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">Ціль залучення</Label>
              <Textarea
                id="purpose"
                rows={3}
                placeholder="Закупівля обладнання для другої точки"
                {...form.register('purpose')}
              />
            </div>

            {hasAmount && (
              <div className="rounded-lg border p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Отримаєте</span>
                  <Amount value={values.amountTarget} currency={values.currency} />
                </div>
                <div className="mt-2 flex justify-between">
                  <span className="text-muted-foreground">
                    {totalInterest > 0n ? 'Заплатите відсотків за строк' : 'Відсотків немає'}
                  </span>
                  <Amount value={totalInterest.toString()} currency={values.currency} />
                </div>
                <Separator className="my-3" />
                <div className="flex justify-between font-medium">
                  <span>Повернете разом</span>
                  <Amount
                    value={(BigInt(values.amountTarget) + totalInterest).toString()}
                    currency={values.currency}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {totalInterest > 0n
                    ? 'Орієнтовно. Відсотки нараховуються щодня за фактичний час користування.'
                    : 'Безвідсоткова заявка — повернути потрібно рівно стільки, скільки отримали.'}
                </p>
              </div>
            )}

            <FieldError message={form.formState.errors.root?.message} />

            <Button type="submit" className="w-full" disabled={create.isPending}>
              {create.isPending ? 'Публікуємо…' : 'Опублікувати заявку'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
