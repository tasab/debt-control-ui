import { useState } from 'react'
import { Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { RequestCard } from '@/components/money/RequestCard'
import { CardsSkeleton, EmptyState, ErrorState } from '@/components/layout/states'
import { useRequests } from '@/lib/hooks'

const GRADES = ['A', 'B', 'C', 'D']

export default function Market() {
  const [filters, setFilters] = useState({})
  const set = (key, value) =>
    setFilters((current) => {
      const next = { ...current }
      if (!value || value === ALL_CURRENCIES) delete next[key]
      else next[key] = value
      return next
    })

  const query = useRequests(filters)
  const items = query.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Маркетплейс</h1>
        <p className="text-sm text-muted-foreground">
          Заявки бізнесів на залучення коштів. Рейтинг — оцінка, а не гарантія повернення.
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-4 py-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="f-currency">Валюта</Label>
            <CurrencySelect
              id="f-currency"
              includeAll
              value={filters.currency ?? ALL_CURRENCIES}
              onChange={(value) => set('currency', value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="f-rate">Ставка від, %</Label>
            <Input
              id="f-rate"
              type="number"
              min="0"
              step="0.5"
              placeholder="12"
              onChange={(event) =>
                set('minRate', event.target.value ? Math.round(Number(event.target.value) * 100) : '')
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="f-term">Строк до, днів</Label>
            <Input
              id="f-term"
              type="number"
              min="7"
              placeholder="365"
              onChange={(event) => set('maxTermDays', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="f-grade">Грейд не нижче</Label>
            <Select
              value={filters.minGrade ?? ALL_CURRENCIES}
              onValueChange={(value) => set('minGrade', value)}
            >
              <SelectTrigger id="f-grade">
                <SelectValue placeholder="Будь-який" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CURRENCIES}>Будь-який</SelectItem>
                {GRADES.map((grade) => (
                  <SelectItem key={grade} value={grade}>
                    {grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {query.isLoading && <CardsSkeleton />}
      {query.isError && <ErrorState error={query.error} onRetry={query.refetch} />}

      {query.data && items.length === 0 && (
        <EmptyState
          icon={Store}
          title="Заявок за цими фільтрами немає"
          description="Спробуйте послабити фільтри — нові заявки з’являються постійно."
        />
      )}

      {items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      )}

      {query.hasNextPage && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
        >
          {query.isFetchingNextPage ? 'Завантажуємо…' : 'Показати ще'}
        </Button>
      )}
    </div>
  )
}
