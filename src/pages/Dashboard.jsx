import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { computeSnapshot } from '../lib/engine'
import { money } from '../lib/format'
import {
  useCurrencies,
  useSnapshotDates,
  useSnapshots,
  useSnapshotsStatus,
} from '../lib/store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function Stat({ label, value, sub, accent }) {
  return (
    <Card className="gap-2 py-4">
      <CardContent className="space-y-1">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className={cn('text-2xl font-semibold tabular-nums', accent)}>
          {value}
        </div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const dates = useSnapshotDates()
  const snapshots = useSnapshots()
  const { currencies } = useCurrencies()
  const { isLoading, isError, error } = useSnapshotsStatus()
  const [selected, setSelected] = useState(dates.at(-1) ?? '')
  const date = dates.includes(selected) ? selected : dates.at(-1) ?? ''
  const snap = date ? snapshots[date] : null

  const r = useMemo(
    () => (snap ? computeSnapshot(snap, currencies) : null),
    [snap, currencies],
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

  if (!snap || !r) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-muted-foreground">No snapshots yet.</p>
          <Button asChild>
            <Link to="/entry">Create your first entry</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const profitPositive = r.profitUsd.greaterThanOrEqualTo(0)
  const netPositive = r.netUah.greaterThanOrEqualTo(0)
  const gain = 'text-success'
  const loss = 'text-destructive'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <Select value={date} onValueChange={setSelected}>
          <SelectTrigger size="sm" className="w-[9rem]">
            <SelectValue placeholder="Select date" />
          </SelectTrigger>
          <SelectContent>
            {dates.map((dt) => (
              <SelectItem key={dt} value={dt}>
                {dt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Total debt (UAH)" value={money(r.debtUah)} />
        <Stat label="Working capital (UAH)" value={money(r.capitalUah)} />
        <Stat
          label="Net position (UAH)"
          value={money(r.netUah)}
          accent={netPositive ? gain : loss}
        />
        <Stat label="Cash registers (UAH)" value={money(r.registersTotal)} />
        <Stat label="Grand total (UAH)" value={money(r.grandUah)} />
        <Stat label="Grand total (USD)" value={money(r.grandUsd)} />
        <Stat
          label="Profit vs start (USD)"
          value={money(r.profitUsd)}
          sub={`Start ${money(r.startingUsd)} USD`}
          accent={profitPositive ? gain : loss}
        />
        <Stat
          label="Return"
          value={`${money(r.returnPct)}%`}
          accent={profitPositive ? gain : loss}
        />
      </div>

      {/* Per-currency breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-currency totals</CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="text-right">
            <TableHeader>
              <TableRow>
                <TableHead className="text-left">Currency</TableHead>
                <TableHead className="text-right">Avg rate</TableHead>
                <TableHead className="text-right">Debt</TableHead>
                <TableHead className="text-right">Capital</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currencies.map(({ code }) => (
                <TableRow key={code}>
                  <TableCell className="text-left font-medium">{code}</TableCell>
                  <TableCell className="tabular-nums">
                    {money(r.avg[code], 4)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {money(r.debtByCurrency[code])}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {money(r.capitalByCurrency[code])}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Per-person breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">People</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {snap.people.map((p) => (
              <li key={p.id} className="flex justify-between py-2">
                <span>
                  {p.name || (
                    <em className="text-muted-foreground">unnamed</em>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
