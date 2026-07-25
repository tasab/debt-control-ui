import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Info } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { AmountBlock } from '@/components/money/Amount'
import { GradeBadge } from '@/components/money/RequestCard'
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/layout/states'
import { formatAmount } from '@/lib/money'
import { useAuth } from '@/lib/auth'
import { useBalanceHistory, useSummary } from '@/lib/hooks'

const RANGES = {
  '30': 'Місяць',
  '90': 'Квартал',
  '365': 'Рік',
}

export default function Profile() {
  const { user } = useAuth()
  const [range, setRange] = useState('90')
  const summary = useSummary()

  const from = useMemo(
    () => new Date(Date.now() - Number(range) * 86_400_000).toISOString(),
    [range],
  )
  const history = useBalanceHistory({ from })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{user?.displayName}</h1>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </div>

      {user?.rating && <RatingCard rating={user.rating} />}

      {summary.data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="py-5">
              <AmountBlock
                label="Чиста вартість"
                value={summary.data.netWorth}
                currency={summary.data.baseCurrency}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-5">
              <AmountBlock
                label="На гаманцях"
                value={summary.data.wallets}
                currency={summary.data.baseCurrency}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-5">
              <AmountBlock
                label="У позиках"
                value={summary.data.lent}
                currency={summary.data.baseCurrency}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-5">
              <AmountBlock
                label="Заморожено"
                value={summary.data.held}
                currency={summary.data.baseCurrency}
              />
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Динаміка балансу</CardTitle>
            <CardDescription>
              Оцінка в {summary.data?.baseCurrency ?? 'UAH'} за середнім курсом на дату.
            </CardDescription>
          </div>
          <Tabs value={range} onValueChange={setRange}>
            <TabsList>
              {Object.entries(RANGES).map(([value, label]) => (
                <TabsTrigger key={value} value={value}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <BalanceChart query={history} currency={summary.data?.baseCurrency ?? 'UAH'} />
        </CardContent>
      </Card>
    </div>
  )
}

function BalanceChart({ query, currency }) {
  if (query.isLoading) return <RowsSkeleton rows={3} />
  if (query.isError) return <ErrorState error={query.error} onRetry={query.refetch} />

  const points = query.data ?? []
  if (points.length < 2) {
    return (
      <EmptyState
        title="Даних для графіка ще замало"
        description="Знімки балансу пишуться щоночі — графік з’явиться за кілька днів."
      />
    )
  }

  // Recharts needs numbers, and only here: these are display coordinates, not
  // money. Every figure the user reads is still formatted from minor units.
  const data = points.map((point) => ({
    date: point.date,
    total: Number(point.totalBase) / 100,
    wallet: Number(point.kinds.wallet ?? 0) / 100,
    lent: Number(point.kinds.lent ?? 0) / 100,
    held: Number(point.kinds.held ?? 0) / 100,
  }))

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="fill-total" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            tickFormatter={(value) => value.slice(5)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={70}
            tickFormatter={(value) => new Intl.NumberFormat('uk-UA').format(value)}
          />
          <Tooltip
            formatter={(value) => [
              `${formatAmount(String(Math.round(value * 100)), { exponent: 2 })} ${currency}`,
            ]}
            labelFormatter={(label) => new Date(label).toLocaleDateString('uk-UA')}
            contentStyle={{
              background: 'var(--color-popover)',
              border: '1px solid var(--color-border)',
              borderRadius: '0.5rem',
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            name="Разом"
            stroke="var(--color-primary)"
            fill="url(#fill-total)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function RatingCard({ rating }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-base">
          Рейтинг бізнесу <GradeBadge rating={rating} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={rating.score} />
        <Separator />
        <p className="flex gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Рейтинг відображає історію платежів, стаж і боргове навантаження. Це оцінка, а не
          гарантія — інвестори бачать її разом із цим застереженням.
        </p>
      </CardContent>
    </Card>
  )
}
