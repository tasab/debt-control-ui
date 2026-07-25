import { Link, useParams } from 'react-router-dom'
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
import { Amount } from '@/components/money/Amount'
import { StatusBadge } from '@/components/money/StatusBadge'
import { RowsSkeleton, ErrorState } from '@/components/layout/states'
import { formatBps } from '@/lib/money'
import { useLoan } from '@/lib/hooks'

export default function LoanDetail() {
  const { id } = useParams()
  const query = useLoan(id)

  if (query.isLoading) return <RowsSkeleton rows={5} />
  if (query.isError) return <ErrorState error={query.error} onRetry={query.refetch} />

  const loan = query.data

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to={-1}>← Назад</Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">{loan.business?.name}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatBps(loan.rateAnnualBps, { zeroLabel: 'Без відсотків' })}
                {loan.rateAnnualBps > 0 ? ' річних' : ''} ·{' '}
                {loan.repaymentType === 'bullet' ? 'тіло в кінці' : 'гнучке тіло'}
              </p>
            </div>
            <StatusBadge status={loan.status} />
          </div>
        </CardHeader>

        <CardContent className="grid gap-4 sm:grid-cols-4">
          <Metric label="Тіло" value={<Amount value={loan.principal} currency={loan.currency} />} />
          <Metric
            label="Залишок тіла"
            value={<Amount value={loan.outstandingPrincipal} currency={loan.currency} />}
          />
          <Metric
            label="Нараховані %"
            value={<Amount value={loan.interestOutstanding} currency={loan.currency} />}
          />
          <Metric
            label="Погашення до"
            value={new Date(loan.maturesAt).toLocaleDateString('uk-UA')}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Графік платежів</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead className="text-right">Тіло</TableHead>
                  <TableHead className="text-right">Відсотки</TableHead>
                  <TableHead className="text-right">Стан</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loan.schedule.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{new Date(row.dueAt).toLocaleDateString('uk-UA')}</TableCell>
                    <TableCell className="text-right">
                      <Amount value={row.principalDue} currency={loan.currency} size="sm" showCurrency={false} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Amount value={row.interestDue} currency={loan.currency} size="sm" showCurrency={false} />
                    </TableCell>
                    <TableCell className="text-right">
                      <StatusBadge status={row.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Синдикат</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {loan.investors.map((investor) => (
              <li key={investor.name + investor.shareBps} className="flex items-center justify-between py-2.5">
                <span className="text-sm">
                  {investor.name}
                  {investor.isMe && <span className="ml-2 text-xs text-primary">(ви)</span>}
                </span>
                <span className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    {(investor.shareBps / 100).toFixed(1)}%
                  </span>
                  <Amount value={investor.principalShare} currency={loan.currency} size="sm" />
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  )
}
