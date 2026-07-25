import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Briefcase, Plus, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Amount, AmountBlock } from '@/components/money/Amount'
import { CurrencySelect } from '@/components/money/CurrencySelect'
import { CardsSkeleton, EmptyState, ErrorState } from '@/components/layout/states'
import { FieldError } from '@/pages/auth/Login'
import { businessSchema } from '@/lib/schema/forms'
import { applyServerErrors } from '@/lib/formErrors'
import { formatBps } from '@/lib/money'
import { useBusiness, useCreateBusiness, useDashboard, useLoans } from '@/lib/hooks'
import { Registers } from './Registers.jsx'
import { MyLoans } from './MyLoans.jsx'

export default function Business() {
  const business = useBusiness()

  if (business.isLoading) return <CardsSkeleton />
  // A missing profile is the onboarding path, not an error.
  if (business.isError && business.error?.code === 'NOT_FOUND') return <Onboarding />
  if (business.isError) return <ErrorState error={business.error} onRetry={business.refetch} />

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{business.data.name}</h1>
          <p className="text-sm text-muted-foreground">{business.data.description}</p>
        </div>
        <Button asChild>
          <Link to="/business/requests/new">
            <Plus className="size-4" aria-hidden /> Нова заявка
          </Link>
        </Button>
      </div>

      <Dashboard />
      <Registers />
      <MyLoans />
    </div>
  )
}

function Dashboard() {
  const dashboard = useDashboard()
  const loans = useLoans({ role: 'borrower' })

  if (dashboard.isLoading) return <CardsSkeleton />
  if (dashboard.isError) return <ErrorState error={dashboard.error} onRetry={dashboard.refetch} />

  const data = dashboard.data
  const currency = data.baseCurrency
  const profitable = !data.profit.startsWith('-')

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Стан бізнесу</h2>
        {data.staleCodes?.length > 0 && (
          <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400">
            <TriangleAlert className="size-3" aria-hidden />
            Оцінка за застарілим курсом: {data.staleCodes.join(', ')}
          </Badge>
        )}
      </div>

      {/* Everything here is computed by the server (CLIENT_PLAN §0) — this
          component only formats what GET /businesses/me/dashboard returned. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="py-5">
            <AmountBlock label="Активи" value={data.assets} currency={currency} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <AmountBlock label="Зобов’язання" value={data.liabilities} currency={currency} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <AmountBlock label="Чиста вартість" value={data.netWorth} currency={currency} />
          </CardContent>
        </Card>
        <Card className={profitable ? 'border-success/40' : 'border-destructive/40'}>
          <CardContent className="py-5">
            <AmountBlock
              label="P&L проти стартового капіталу"
              value={data.profit}
              currency={currency}
              colored
              hint={
                data.startingCapital ? (
                  <>
                    Старт:{' '}
                    <Amount
                      value={data.startingCapital.amount}
                      currency={data.startingCapital.currency}
                      size="sm"
                    />
                  </>
                ) : (
                  'Стартовий капітал не заданий'
                )
              }
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Вартість капіталу
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight">
              {formatBps(data.costOfCapitalBps, { zeroLabel: 'без відсотків' })}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Середньозважена ставка по {data.activeLoanCount} активних позиках
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              У розрізі валют
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.byCurrency.length === 0 && (
              <p className="text-muted-foreground">Ще немає рухів коштів.</p>
            )}
            {data.byCurrency.length > 0 && (
              <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-x-4 gap-y-1.5">
                <span />
                <span className="text-right text-xs text-muted-foreground">Гаманці</span>
                <span className="text-right text-xs text-muted-foreground">Каси</span>
                <span className="text-right text-xs text-muted-foreground">Борг</span>
                {data.byCurrency.map((row) => (
                  <Fragment key={row.currency}>
                    <span className="font-medium">{row.currency}</span>
                    <span className="text-right">
                      <Amount value={row.wallets} currency={row.currency} size="sm" showCurrency={false} />
                    </span>
                    <span className="text-right">
                      <Amount value={row.registers} currency={row.currency} size="sm" showCurrency={false} />
                    </span>
                    <span className="text-right">
                      <Amount value={row.debt} currency={row.currency} size="sm" showCurrency={false} />
                    </span>
                  </Fragment>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {loans.data?.items?.length === 0 && (
        <EmptyState
          icon={Briefcase}
          title="Активних позик немає"
          description="Виставте заявку — інвестори побачать її в маркетплейсі."
          action={
            <Button asChild size="sm">
              <Link to="/business/requests/new">Створити заявку</Link>
            </Button>
          }
        />
      )}
    </section>
  )
}

/** First run: create the business profile. */
function Onboarding() {
  const create = useCreateBusiness()
  const form = useForm({
    resolver: zodResolver(businessSchema),
    defaultValues: { name: '', description: '', baseCurrency: 'UAH' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await create.mutateAsync({ ...values, description: values.description || undefined })
    } catch (error) {
      applyServerErrors(form, error)
    }
  })

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Створіть бізнес-профіль</CardTitle>
          <CardDescription>
            Профіль бачать інвестори поруч із вашими заявками — назва й опис впливають на довіру.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="name">Назва</Label>
              <Input id="name" placeholder="Кав’ярня «Друга Хвиля»" {...form.register('name')} />
              <FieldError message={form.formState.errors.name?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Опис</Label>
              <Textarea
                id="description"
                rows={3}
                placeholder="Дві точки в центрі, обіг ~180 тис. грн/міс."
                {...form.register('description')}
              />
              <FieldError message={form.formState.errors.description?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseCurrency">Основна валюта звітності</Label>
              <CurrencySelect
                id="baseCurrency"
                value={form.watch('baseCurrency')}
                onChange={(value) => form.setValue('baseCurrency', value)}
              />
            </div>

            <FieldError message={form.formState.errors.root?.message} />

            <Button type="submit" className="w-full" disabled={create.isPending}>
              {create.isPending ? 'Створюємо…' : 'Створити профіль'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
