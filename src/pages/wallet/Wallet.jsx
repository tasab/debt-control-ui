import { Link } from 'react-router-dom'
import { ArrowLeftRight, Repeat, Snowflake } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Amount } from '@/components/money/Amount'
import { CardsSkeleton, ErrorState } from '@/components/layout/states'
import { useSummary, useWallets } from '@/lib/hooks'
import { isZero } from '@/lib/money'
import { TransactionList } from './TransactionList.jsx'

export default function Wallet() {
  const wallets = useWallets()
  const summary = useSummary()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Гаманець</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/convert">
              <Repeat className="size-4" aria-hidden /> Обміняти
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/transfer">
              <ArrowLeftRight className="size-4" aria-hidden /> Переказати
            </Link>
          </Button>
        </div>
      </div>

      {summary.data && <SummaryStrip summary={summary.data} />}

      {wallets.isLoading && <CardsSkeleton />}
      {wallets.isError && <ErrorState error={wallets.error} onRetry={wallets.refetch} />}

      {wallets.data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wallets.data.map((wallet) => (
            <Card key={wallet.currency}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {wallet.currency}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Amount
                  value={wallet.available}
                  currency={wallet.currency}
                  size="lg"
                  showCurrency={false}
                />
                {/* Held money is the user's, but not spendable — saying so
                    plainly avoids "where did my money go" after funding. */}
                {!isZero(wallet.held) && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Snowflake className="size-3.5" aria-hidden />
                    Заморожено{' '}
                    <Amount value={wallet.held} currency={wallet.currency} size="sm" showCurrency={false} />
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TransactionsPreview />
    </div>
  )
}

function SummaryStrip({ summary }) {
  const items = [
    { label: 'На гаманцях', value: summary.wallets },
    { label: 'Заморожено', value: summary.held },
    { label: 'У позиках', value: summary.lent },
    { label: 'Нараховано %', value: summary.accrued },
    { label: 'Заборгованість', value: summary.borrowed },
  ].filter((item) => !isZero(item.value))

  return (
    <Card>
      <CardContent className="flex flex-wrap gap-x-10 gap-y-4 py-5">
        <div>
          <p className="text-sm text-muted-foreground">Чиста вартість</p>
          <Amount value={summary.netWorth} currency={summary.baseCurrency} size="lg" />
        </div>
        {items.map((item) => (
          <div key={item.label}>
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <Amount value={item.value} currency={summary.baseCurrency} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function TransactionsPreview() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Останні операції</h2>
        <Button asChild variant="ghost" size="sm">
          <Link to="/history">Уся історія</Link>
        </Button>
      </div>
      <TransactionList limit={8} compact />
    </div>
  )
}
