import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import Decimal from 'decimal.js'
import { averageRates } from '../lib/engine'
import { money } from '../lib/format'
import {
  useCurrencies,
  usePeople,
  usePersonHistory,
  useSnapshots,
} from '../lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Convert a per-currency amount map to a single UAH figure at the given rates.
function toUah(map, avg, currencies) {
  let sum = new Decimal(0)
  for (const { code } of currencies) {
    const v = map?.[code]
    if (v == null || String(v).trim() === '') continue
    try {
      sum = sum.plus(new Decimal(String(v).trim()).times(avg[code] ?? 0))
    } catch {
      /* ignore non-numeric */
    }
  }
  return sum
}

export default function PersonDetail() {
  const { id } = useParams()
  const { people } = usePeople()
  const { currencies } = useCurrencies()
  const { history, isLoading, isError, error } = usePersonHistory(id)
  const snapshots = useSnapshots()

  const person = people.find((p) => p.id === id)

  // Convert each date's debt/capital to UAH using that date's rates, so the
  // trend is comparable across currencies (mirrors the engine's conversion).
  const series = useMemo(
    () =>
      history.map((row) => {
        const avg = averageRates(snapshots[row.date]?.rates, currencies)
        return {
          date: row.date,
          debtUah: toUah(row.debt, avg, currencies).toNumber(),
          capitalUah: toUah(row.capital, avg, currencies).toNumber(),
        }
      }),
    [history, snapshots, currencies],
  )

  return (
    <div className="space-y-6">
      <div>
        <Link to="/people" className="text-sm text-primary hover:underline">
          ← People
        </Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          {person ? person.name : 'Person'}
        </h1>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {isError && (
        <p className="text-destructive">
          Failed to load history: {error?.message}
        </p>
      )}

      {!isLoading && history.length === 0 && (
        <p className="text-muted-foreground">
          No snapshots reference this person yet.
        </p>
      )}

      {series.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Debt &amp; capital (UAH)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={series}
                  margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    fontSize={12}
                    stroke="var(--muted-foreground)"
                  />
                  <YAxis
                    fontSize={12}
                    width={70}
                    stroke="var(--muted-foreground)"
                  />
                  <Tooltip
                    formatter={(v) => `${money(v)} UAH`}
                    contentStyle={{
                      background: 'var(--popover)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      color: 'var(--popover-foreground)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="debtUah"
                    name="Debt (UAH)"
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                    dot
                  />
                  <Line
                    type="monotone"
                    dataKey="capitalUah"
                    name="Capital (UAH)"
                    stroke="var(--chart-3)"
                    strokeWidth={2}
                    dot
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {history.length > 0 && (
        <Card>
          <CardContent>
            <Table className="text-right">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">Date</TableHead>
                  <TableHead className="text-left">Kind</TableHead>
                  {currencies.map((c) => (
                    <TableHead key={c.code} className="text-right">
                      {c.code}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((row) =>
                  ['debt', 'capital'].map((kind) => (
                    <TableRow key={`${row.date}-${kind}`}>
                      <TableCell className="text-left">
                        {kind === 'debt' ? row.date : ''}
                      </TableCell>
                      <TableCell className="text-left capitalize text-muted-foreground">
                        {kind}
                      </TableCell>
                      {currencies.map((c) => (
                        <TableCell key={c.code} className="tabular-nums">
                          {money(row[kind]?.[c.code] ?? 0)}
                        </TableCell>
                      ))}
                    </TableRow>
                  )),
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
