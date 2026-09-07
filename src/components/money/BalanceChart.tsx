import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/layout/states'
import { formatAmount } from '@/lib/money'
import { useBalanceHistory, useSummary } from '@/lib/hooks'

export const RANGES = {
  '30': 'Місяць',
  '90': '3 місяці',
  '365': 'Рік',
}

/**
 * Динаміка портфеля за період.
 *
 * Дані рахуються з журналу проводок, а не зі щоденних знімків, тож графік є
 * від першого руху коштів — навіть за той час, коли додатком ще не
 * користувалися щодня. Дні без проводок повторюють попередній залишок: баланс
 * не змінюється сам по собі.
 */
export function BalanceChart({ title = 'Динаміка портфеля', defaultRange = '30' }) {
  const [range, setRange] = useState(defaultRange)
  const summary = useSummary()
  const currency = summary.data?.baseCurrency ?? 'UAH'

  const from = useMemo(
    () => new Date(Date.now() - Number(range) * 86_400_000).toISOString(),
    [range],
  )
  const history = useBalanceHistory({ from })

  return (
    <Card>
      <CardHeader className="gap-3 space-y-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>
            Гаманець і вкладене в {currency} за поточним курсом.
          </CardDescription>
        </div>
        {/* Перемикач періоду на телефоні розтягується на всю ширину: три
            рівні частини — це три великі цілі замість трьох дрібних кнопок,
            притиснутих до правого краю. */}
        <Tabs value={range} onValueChange={setRange} className="w-full sm:w-auto">
          <TabsList className="w-full sm:w-auto">
            {Object.entries(RANGES).map(([value, label]) => (
              <TabsTrigger key={value} value={value} className="h-8 flex-1 sm:flex-none">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      {/* Вужчі поля на телефоні — графіку віддано кожен піксель ширини. */}
      <CardContent className="px-2 sm:px-6">
        <Chart query={history} currency={currency} />
      </CardContent>
    </Card>
  )
}

function Chart({ query, currency }) {
  if (query.isLoading) return <RowsSkeleton rows={3} />
  if (query.isError) return <ErrorState error={query.error} onRetry={query.refetch} />

  const points = query.data ?? []
  if (points.length < 2) {
    return (
      <EmptyState
        title="Даних для графіка ще немає"
        description="Графік з’явиться, щойно буде хоча б два дні з рухом коштів."
      />
    )
  }

  // Recharts потребує чисел, і тільки тут: це координати, а не гроші. Кожна
  // цифра, яку читає людина, і далі форматується з мінорних одиниць.
  const data = points.map((point) => ({
    date: point.date,
    total: Number(point.totalBase) / 100,
    wallet: Number(point.kinds.wallet ?? 0) / 100,
    invested: Number(point.kinds.invested ?? 0) / 100,
  }))

  const money = (value) =>
    `${formatAmount(String(Math.round(value * 100)), { exponent: 2 })} ${currency}`

  // Вісь Y на телефоні пише «12,5 тис.» замість «12 500»: повний запис
  // з’їдав чверть ширини екрана під самі лише підписи.
  const compact = new Intl.NumberFormat('uk-UA', {
    notation: 'compact',
    maximumFractionDigits: 1,
  })

  return (
    <div className="h-60 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
            minTickGap={24}
            tickFormatter={(value) => value.slice(5)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={11}
            width={48}
            tickFormatter={(value) => compact.format(value)}
          />
          <Tooltip
            formatter={(value, name) => [money(value), name]}
            labelFormatter={(label) => new Date(label).toLocaleDateString('uk-UA')}
            contentStyle={{
              background: 'var(--color-popover)',
              border: '1px solid var(--color-border)',
              borderRadius: '0.5rem',
              fontSize: 12,
            }}
          />
          <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          {/* Разом — заливкою, дві складові — лініями поверх: видно і підсумок,
              і за рахунок чого саме він рухався. */}
          <Area
            type="monotone"
            dataKey="total"
            name="Разом"
            stroke="var(--color-primary)"
            fill="url(#fill-total)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="invested"
            name="Вкладено"
            stroke="var(--color-success)"
            fill="none"
            strokeWidth={1.5}
          />
          <Area
            type="monotone"
            dataKey="wallet"
            name="Гаманець"
            stroke="var(--color-muted-foreground)"
            fill="none"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
