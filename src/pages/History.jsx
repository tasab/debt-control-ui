import { useMemo } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { computeSnapshot } from '../lib/engine'
import { money } from '../lib/format'
import {
  deleteSnapshot,
  useCurrencies,
  useSnapshotDates,
  useSnapshots,
  useSnapshotsStatus,
} from '../lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function History() {
  const dates = useSnapshotDates()
  const snapshots = useSnapshots()
  const { currencies } = useCurrencies()
  const { isLoading, isError, error } = useSnapshotsStatus()

  // The main upgrade over a spreadsheet: profit trending over time.
  const series = useMemo(
    () =>
      dates.map((date) => {
        const r = computeSnapshot(snapshots[date], currencies)
        return {
          date,
          profitUsd: r.profitUsd.toNumber(),
          grandUsd: r.grandUsd.toNumber(),
        }
      }),
    [dates, snapshots, currencies],
  )

  if (isLoading) {
    return <p className="text-muted-foreground">Loading…</p>
  }

  if (isError) {
    return (
      <p className="text-destructive">
        Failed to load snapshots: {error?.message}
      </p>
    )
  }

  if (series.length === 0) {
    return <p className="text-muted-foreground">No snapshots yet.</p>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">History</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profit over time (USD)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={series}
                margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                />
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
                  formatter={(v) => `${money(v)} USD`}
                  contentStyle={{
                    background: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    color: 'var(--popover-foreground)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="profitUsd"
                  name="Profit (USD)"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  dot
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Table className="text-right">
            <TableHeader>
              <TableRow>
                <TableHead className="text-left">Date</TableHead>
                <TableHead className="text-right">Grand total (USD)</TableHead>
                <TableHead className="text-right">Profit (USD)</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {series.map((row) => (
                <TableRow key={row.date}>
                  <TableCell className="text-left">{row.date}</TableCell>
                  <TableCell className="tabular-nums">
                    {money(row.grandUsd)}
                  </TableCell>
                  <TableCell
                    className={`tabular-nums ${
                      row.profitUsd >= 0 ? 'text-success' : 'text-destructive'
                    }`}
                  >
                    {money(row.profitUsd)}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteSnapshot(row.date)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
