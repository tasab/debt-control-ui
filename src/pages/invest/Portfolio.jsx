import { Link } from 'react-router-dom'
import { AlertTriangle, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Amount, AmountBlock } from '@/components/money/Amount'
import { StatusBadge } from '@/components/money/StatusBadge'
import { CardsSkeleton, EmptyState, ErrorState } from '@/components/layout/states'
import { formatBps } from '@/lib/money'
import { useLoans, usePortfolio } from '@/lib/hooks'

export default function Portfolio() {
  const portfolio = usePortfolio()
  const loans = useLoans({ role: 'investor' })

  if (portfolio.isLoading) return <CardsSkeleton />
  if (portfolio.isError) return <ErrorState error={portfolio.error} onRetry={portfolio.refetch} />

  const data = portfolio.data
  const currency = data.baseCurrency

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Портфель</h1>
        <p className="text-sm text-muted-foreground">
          Усі суми оцінені в {currency} за середнім курсом — лише для звітності.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="py-5">
            <AmountBlock
              label="Активні вкладення"
              value={data.activePrincipal}
              currency={currency}
              hint={`${data.positionCount} позицій`}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <AmountBlock
              label="Отримано відсотків"
              value={data.netInterest}
              currency={currency}
              hint={`Комісія платформи: ${data.feesPaid}`}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <AmountBlock
              label="Повернуто тіла"
              value={data.principalReturned}
              currency={currency}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Середня ставка
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight">
              {formatBps(data.weightedRateBps)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Зважена за розміром вкладень
            </p>
          </CardContent>
        </Card>
      </div>

      {/* §11: concentration is a warning, not a block — the decision is theirs. */}
      {data.concentrationWarning && (
        <div className="flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <p>
            <strong>{(data.concentrationWarning.shareBps / 100).toFixed(0)}%</strong> портфеля — в
            одному бізнесі ({data.concentrationWarning.name}). Розподіл між кількома позиками
            зменшує вплив одного дефолту.
          </p>
        </div>
      )}

      {data.distribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Розподіл за бізнесами</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.distribution.map((row) => (
              <div key={row.businessId} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="truncate">{row.name}</span>
                  <Amount value={row.amount} currency={currency} size="sm" />
                </div>
                <Progress value={row.shareBps / 100} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Мої інвестиції</h2>

        {loans.data?.items?.length === 0 && (
          <EmptyState
            icon={TrendingUp}
            title="Ви ще нічого не профінансували"
            description="Оберіть заявку в маркетплейсі — кошти заморожуються, поки вона збирається."
            action={
              <Button asChild size="sm">
                <Link to="/market">До маркетплейсу</Link>
              </Button>
            }
          />
        )}

        <div className="space-y-3">
          {loans.data?.items?.map((loan) => (
            <Card key={loan.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link to={`/loans/${loan.id}`} className="font-medium hover:underline">
                      Частка {(loan.myShareBps / 100).toFixed(1)}%
                    </Link>
                    <StatusBadge status={loan.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatBps(loan.rateAnnualBps)} річних · до{' '}
                    {new Date(loan.maturesAt).toLocaleDateString('uk-UA')}
                  </p>
                </div>

                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground">Вкладено</p>
                    <Amount value={loan.myPrincipalShare ?? '0'} currency={loan.currency} />
                  </div>
                  {loan.nextPayment && (
                    <div>
                      <p className="text-xs text-muted-foreground">Наступний платіж</p>
                      <p className="text-sm font-medium">
                        {new Date(loan.nextPayment.dueAt).toLocaleDateString('uk-UA')}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
