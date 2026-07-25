import { useAudit, useSnapshotDates } from '../lib/store'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function when(ts) {
  const d = new Date(ts)
  return Number.isNaN(d.getTime()) ? ts : d.toLocaleString()
}

export default function Audit() {
  const dates = useSnapshotDates()
  const { entries, isLoading, isError, error } = useAudit()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-sm text-muted-foreground">
          Every changed balance, rate, and register — recorded on each save.
        </p>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {isError && (
        <p className="text-destructive">
          Failed to load audit log: {error?.message}
        </p>
      )}

      {!isLoading && entries.length === 0 && (
        <p className="text-muted-foreground">
          No changes recorded yet.{' '}
          {dates.length === 0 && 'Save a snapshot to start.'}
        </p>
      )}

      {entries.length > 0 && (
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>What</TableHead>
                  <TableHead className="text-right">Old</TableHead>
                  <TableHead className="text-right">New</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-muted-foreground">
                      {when(e.ts)}
                    </TableCell>
                    <TableCell>{e.date}</TableCell>
                    <TableCell>
                      <span className="font-medium">{e.entity}</span>{' '}
                      <span className="font-mono text-xs text-muted-foreground">
                        {e.field}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {e.old_value === '' ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <Badge variant="destructive" className="tabular-nums">
                          {e.old_value}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {e.new_value === '' ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <Badge variant="success" className="tabular-nums">
                          {e.new_value}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
