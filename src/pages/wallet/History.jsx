import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ALL_CURRENCIES, CurrencySelect } from '@/components/money/CurrencySelect'
import { Amount } from '@/components/money/Amount'
import { RowsSkeleton, ErrorState } from '@/components/layout/states'
import { TransactionList } from './TransactionList.jsx'
import { useTransaction } from '@/lib/hooks'
import * as apis from '@/lib/api'

const TYPE_OPTIONS = [
  { value: 'transfer_out', label: 'Перекази вихідні' },
  { value: 'transfer_in', label: 'Перекази вхідні' },
  { value: 'fx', label: 'Обмін валюти' },
  { value: 'fee', label: 'Комісії' },
  { value: 'topup', label: 'Поповнення' },
  { value: 'funding_hold', label: 'Заморожування' },
  { value: 'repayment_in', label: 'Надходження за позиками' },
  { value: 'repayment_out', label: 'Погашення позик' },
]

const ALL = ALL_CURRENCIES

export default function History() {
  const [filters, setFilters] = useState({})
  const set = (key, value) =>
    setFilters((current) => {
      const next = { ...current }
      if (!value || value === ALL) delete next[key]
      else next[key] = value
      return next
    })

  const download = async () => {
    const csv = await apis.stats.exportCsv()
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'transactions.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Історія</h1>
        <Button variant="outline" size="sm" onClick={download}>
          <Download className="size-4" aria-hidden /> Експорт CSV
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-4 py-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="filter-currency">Валюта</Label>
            <CurrencySelect
              id="filter-currency"
              includeAll
              value={filters.currency ?? ALL}
              onChange={(value) => set('currency', value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="filter-type">Тип</Label>
            <Select value={filters.type ?? ALL} onValueChange={(value) => set('type', value)}>
              <SelectTrigger id="filter-type">
                <SelectValue placeholder="Усі" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Усі</SelectItem>
                {TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="filter-from">Період з</Label>
            <Input
              id="filter-from"
              type="date"
              onChange={(event) =>
                set('from', event.target.value ? new Date(event.target.value).toISOString() : '')
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="filter-search">Пошук у коментарях</Label>
            <Input
              id="filter-search"
              placeholder="за оренду"
              onChange={(event) => set('search', event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <TransactionList filters={filters} />
    </div>
  )
}

/** Detail view: every leg of the transaction this user can see. */
export function TransactionDetail() {
  const { id } = useParams()
  const query = useTransaction(id)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/history">← До історії</Link>
      </Button>

      {query.isLoading && <RowsSkeleton rows={3} />}
      {query.isError && <ErrorState error={query.error} onRetry={query.refetch} />}

      {query.data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span>Транзакція</span>
              <span className="font-mono text-xs text-muted-foreground">{query.data.id}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Field label="Тип" value={query.data.type} />
              <Field
                label="Дата"
                value={new Date(query.data.createdAt).toLocaleString('uk-UA')}
              />
              {query.data.meta?.fee && <Field label="Комісія" value={query.data.meta.fee} />}
              {query.data.meta?.rate && <Field label="Курс" value={query.data.meta.rate} />}
            </dl>

            <div className="space-y-2">
              <p className="text-sm font-medium">Рухи коштів</p>
              <ul className="divide-y rounded-md border">
                {query.data.legs.map((leg) => (
                  <li key={leg.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm">
                        {leg.counterparty?.name ?? (leg.held ? 'Заморожені кошти' : 'Гаманець')}
                      </p>
                      {leg.comment && (
                        <p className="truncate text-xs text-muted-foreground">{leg.comment}</p>
                      )}
                    </div>
                    <Amount value={leg.amount} currency={leg.currency} colored signed />
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}
