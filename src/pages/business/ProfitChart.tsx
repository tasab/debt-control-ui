import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/layout/states'
import { formatAmount } from '@/lib/money'
import { useProfitSeries } from '@/lib/hooks'

/**
 * Прибуток від закриття до закриття.
 *
 * Вісь тут не календарна, і це навмисно: прибуток не набігає рівномірно в
 * часі, він з'являється стрибком того вечора, коли перерахували каси, і
 * просідає, коли записали витрату. Точка — подія, а не день; між двома
 * закриттями лінія йде рівно, бо між ними нічого й не сталося.
 *
 * Тому й лінія ступінчаста (`stepAfter`), а не згладжена: згладжена малювала
 * б поступове зростання в дні, коли касу взагалі не рахували.
 */
export function ProfitChart() {
  const series = useProfitSeries()
  const currency = series.data?.baseCurrency ?? 'UAH'

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Прибуток за закриттями</CardTitle>
        <CardDescription>
          Точка — перерахунок кас або витрата. Внески й вилучення власника сюди не входять.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <Chart query={series} currency={currency} />
      </CardContent>
    </Card>
  )
}

function Chart({ query, currency }) {
  if (query.isLoading) return <RowsSkeleton rows={3} />
  if (query.isError) return <ErrorState error={query.error} onRetry={query.refetch} />

  const points = query.data?.points ?? []
  if (points.length < 2) {
    return (
      <EmptyState
        title="Графік з’явиться після другого закриття"
        description="Одна точка — ще не лінія: щоб побачити, куди рухається прибуток, потрібні хоча б два перерахунки."
      />
    )
  }

  // Recharts потребує чисел, і тільки тут: це координати, а не гроші. Кожна
  // цифра, яку читає людина, і далі форматується з мінорних одиниць.
  const data = points.map((point) => ({
    at: point.at,
    profit: Number(point.profit) / 100,
    delta: Number(point.delta) / 100,
    type: point.type,
  }))

  const money = (value) =>
    `${formatAmount(String(Math.round(value * 100)), { exponent: 2 })} ${currency}`

  // Вісь Y на телефоні пише «12,5 тис.» замість «12 500»: повний запис
  // з’їдав чверть ширини екрана під самі лише підписи.
  const compact = new Intl.NumberFormat('uk-UA', {
    notation: 'compact',
    maximumFractionDigits: 1,
  })

  const day = (value) =>
    new Date(value).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })

  return (
    <div className="h-60 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
          <XAxis
            dataKey="at"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            minTickGap={24}
            tickFormatter={day}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={11}
            width={48}
            tickFormatter={(value) => compact.format(value)}
          />
          <Tooltip
            // У підказці важливі обидва числа: скільки стало всього і скільки
            // саме дало це закриття. Друге й є відповідь на «як минув день».
            formatter={(value, _name, item) => [
              `${money(value)} (${item.payload.delta >= 0 ? '+' : ''}${money(item.payload.delta)})`,
              'Прибуток',
            ]}
            separator=": "
            labelFormatter={(label) => new Date(label).toLocaleDateString('uk-UA')}
            contentStyle={{
              background: 'var(--color-popover)',
              border: '1px solid var(--color-border)',
              borderRadius: '0.5rem',
              fontSize: 12,
            }}
          />
          <Line
            type="stepAfter"
            dataKey="profit"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 0, fill: 'var(--color-primary)' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
