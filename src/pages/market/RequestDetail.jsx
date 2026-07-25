import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Info, Snowflake, Users } from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Amount } from '@/components/money/Amount'
import { AmountInput } from '@/components/money/AmountInput'
import { StatusBadge } from '@/components/money/StatusBadge'
import { GradeBadge } from '@/components/money/RequestCard'
import { RowsSkeleton, ErrorState } from '@/components/layout/states'
import { FieldError } from '@/pages/auth/Login'
import { fundSchema } from '@/lib/schema/forms'
import { applyServerErrors } from '@/lib/formErrors'
import { compareAmount, formatBps } from '@/lib/money'
import { useAuth } from '@/lib/auth'
import {
  useBusinessProfile,
  useCancelFunding,
  useFundRequest,
  useRequest,
  useWallets,
} from '@/lib/hooks'

export default function RequestDetail() {
  const { id } = useParams()
  const query = useRequest(id)
  const { can } = useAuth()

  if (query.isLoading) return <RowsSkeleton rows={5} />
  if (query.isError) return <ErrorState error={query.error} onRetry={query.refetch} />

  const request = query.data
  const remaining = (BigInt(request.amountTarget) - BigInt(request.amountFunded)).toString()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/market">← До маркетплейсу</Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">{request.business.name}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{request.purpose}</p>
            </div>
            <div className="flex items-center gap-2">
              <GradeBadge rating={request.business.rating} />
              <StatusBadge status={request.status} />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-4">
            <Metric label="Потрібно" value={<Amount value={request.amountTarget} currency={request.currency} />} />
            <Metric
              label="Ставка"
              value={
                request.rateAnnualBps > 0
                  ? `${formatBps(request.rateAnnualBps)} річних`
                  : 'Без відсотків'
              }
            />
            <Metric label="Строк" value={`${request.termDays} днів`} />
            <Metric
              label="Погашення"
              value={request.repaymentType === 'bullet' ? 'Тіло в кінці' : 'Гнучке тіло'}
            />
          </div>

          <div className="space-y-1.5">
            <Progress value={request.fundedBps / 100} />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Зібрано <Amount value={request.amountFunded} currency={request.currency} size="sm" />
              </span>
              <span>
                Залишилось <Amount value={remaining} currency={request.currency} size="sm" />
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted-foreground">
            <span>
              Мінімальний внесок:{' '}
              <Amount value={request.minTicket} currency={request.currency} size="sm" />
            </span>
            <span>Дедлайн: {new Date(request.expiresAt).toLocaleDateString('uk-UA')}</span>
            <span className="flex items-center gap-1">
              <Users className="size-3.5" aria-hidden /> {request.investorCount} інвесторів
            </span>
          </div>

          {request.myFunding ? (
            <MyFunding funding={request.myFunding} currency={request.currency} />
          ) : (
            can('invest') &&
            request.status === 'open' && (
              <FundDialog request={request} remaining={remaining} />
            )
          )}

          <RatingExplainer businessId={request.business.id} />
        </CardContent>
      </Card>

      {request.investors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Хто вже профінансував</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {request.investors.map((investor) => (
                <li key={investor.id} className="flex items-center justify-between py-2.5">
                  <span className="text-sm">
                    {investor.name}
                    {investor.isMe && <span className="ml-2 text-xs text-primary">(ви)</span>}
                  </span>
                  <Amount value={investor.amount} currency={request.currency} size="sm" />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  )
}

function MyFunding({ funding, currency }) {
  const cancel = useCancelFunding()
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary bg-primary/5 p-4">
      <div>
        <p className="text-sm font-medium">Ваш внесок</p>
        <Amount value={funding.amount} currency={currency} />
      </div>
      <Button variant="outline" size="sm" onClick={() => cancel.mutate(funding.id)} disabled={cancel.isPending}>
        Скасувати внесок
      </Button>
    </div>
  )
}

/**
 * Funding dialog. Two things must be unmistakable before confirming: the money
 * is frozen rather than spent, and what the return actually looks like.
 */
function FundDialog({ request, remaining }) {
  const [open, setOpen] = useState(false)
  const fund = useFundRequest()
  const { data: wallets = [] } = useWallets()
  const balance = wallets.find((w) => w.currency === request.currency)?.available ?? '0'

  const form = useForm({ resolver: zodResolver(fundSchema), defaultValues: { amount: '' } })
  const amount = form.watch('amount')

  // Expected interest, shown as an estimate: principal × rate × term / 365.
  // This is the one place the client does arithmetic, and it is a preview of a
  // number the server will compute for real — never a balance.
  const projected =
    amount && BigInt(amount) > 0n
      ? (BigInt(amount) * BigInt(request.rateAnnualBps) * BigInt(request.termDays)) /
        (10000n * 365n)
      : 0n

  const belowMin = amount && compareAmount(amount, request.minTicket) < 0 && amount !== remaining
  const overRemaining = amount && compareAmount(amount, remaining) > 0
  const overBalance = amount && compareAmount(amount, balance) > 0

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await fund.mutateAsync({ id: request.id, body: values, key: crypto.randomUUID() })
      setOpen(false)
      form.reset()
    } catch (error) {
      applyServerErrors(form, error)
    }
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">Профінансувати</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Фінансування заявки</DialogTitle>
          <DialogDescription>{request.business.name}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="fund-amount">Сума внеску</Label>
            <AmountInput
              id="fund-amount"
              currency={request.currency}
              value={amount}
              max={compareAmount(balance, remaining) < 0 ? balance : remaining}
              onMax={(value) => form.setValue('amount', value, { shouldValidate: true })}
              onChange={(value) => form.setValue('amount', value ?? '', { shouldValidate: true })}
              error={
                form.formState.errors.amount?.message ??
                (belowMin
                  ? 'Менше за мінімальний внесок'
                  : overRemaining
                    ? 'Більше, ніж залишилось зібрати'
                    : overBalance
                      ? 'Більше за доступний баланс'
                      : undefined)
              }
            />
            <p className="text-xs text-muted-foreground">
              Доступно: <Amount value={balance} currency={request.currency} size="sm" /> · мінімум{' '}
              <Amount value={request.minTicket} currency={request.currency} size="sm" />
            </p>
          </div>

          {projected > 0n && (
            <div className="rounded-lg border p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Очікуваний дохід за {request.termDays} днів
                </span>
                <Amount value={projected.toString()} currency={request.currency} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Орієнтовно, до комісії платформи з відсоткового доходу. Точні суми рахує сервер за
                фактичними днями користування.
              </p>
            </div>
          )}

          {/* The single most misunderstood step: this is escrow, not a payment. */}
          <div className="flex gap-3 rounded-lg border border-primary/40 bg-primary/5 p-4 text-sm">
            <Snowflake className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <p>
              Кошти <strong>заморожуються</strong>, а не списуються. Якщо заявка не збереться до
              дедлайну — вони повернуться на ваш гаманець повністю.
            </p>
          </div>

          <FieldError message={form.formState.errors.root?.message} />

          <DialogFooter>
            <Button
              type="submit"
              disabled={fund.isPending || belowMin || overRemaining || overBalance || !amount}
            >
              {fund.isPending ? 'Заморожуємо…' : 'Підтвердити'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** The rating with its factors — a letter alone tells the investor nothing. */
function RatingExplainer({ businessId }) {
  const profile = useBusinessProfile(businessId)
  const factors = profile.data?.rating?.factors
  if (!factors) return null

  const LABELS = {
    onTimePayments: 'Платежі вчасно',
    trackRecord: 'Закриті позики',
    tenure: 'Стаж на платформі',
    debtLoad: 'Боргове навантаження',
    verification: 'Верифікація',
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium">Чому такий рейтинг</p>
        <GradeBadge rating={profile.data.rating} />
      </div>
      <Separator />
      <ul className="space-y-2 text-sm">
        {Object.entries(factors).map(([key, factor]) => (
          <li key={key} className="flex items-center gap-3">
            <span className="w-44 shrink-0 text-muted-foreground">{LABELS[key] ?? key}</span>
            <Progress value={factor.value} className="h-1.5 flex-1" />
            <span className="w-12 shrink-0 text-right text-xs text-muted-foreground">
              вага {factor.weight}%
            </span>
          </li>
        ))}
      </ul>
      <p className="flex gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Рейтинг — оцінка на основі історії, а не гарантія повернення коштів. Інвестування пов’язане
        з ризиком втрати частини або всієї суми.
      </p>
    </div>
  )
}
