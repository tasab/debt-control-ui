import { Link } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Percent,
  Receipt,
  Repeat,
  Snowflake,
  Undo2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Amount } from '@/components/money/Amount'
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/layout/states'
import { useTransactions } from '@/lib/hooks'
import { cn } from '@/lib/utils'

// Entry types come straight from the contract (SERVER_PLAN §2.3); each gets an
// icon and a human label so the history reads as a story, not as a log.
const TYPES = {
  transfer_out: { label: 'Переказ', icon: ArrowUpRight },
  transfer_in: { label: 'Надходження', icon: ArrowDownLeft },
  fx: { label: 'Обмін валюти', icon: Repeat },
  fee: { label: 'Комісія', icon: Receipt },
  topup: { label: 'Поповнення', icon: Banknote },
  funding_hold: { label: 'Заморожено під заявку', icon: Snowflake },
  funding_release: { label: 'Холд повернуто', icon: Undo2 },
  disbursement: { label: 'Видача позики', icon: Banknote },
  repayment_in: { label: 'Надходження за позикою', icon: Percent },
  repayment_out: { label: 'Погашення позики', icon: ArrowUpRight },
  internal_in: { label: 'Внутрішнє надходження', icon: ArrowDownLeft },
  internal_out: { label: 'Внутрішній переказ', icon: ArrowUpRight },
  interest_accrued: { label: 'Нараховано відсотки', icon: Percent },
}

const dateFormat = new Intl.DateTimeFormat('uk-UA', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export function TransactionList({ filters = {}, limit, compact = false }) {
  const query = useTransactions({ ...filters, ...(limit ? { limit } : {}) })

  if (query.isLoading) return <RowsSkeleton rows={compact ? 3 : 6} />
  if (query.isError) return <ErrorState error={query.error} onRetry={query.refetch} />

  const items = query.data.pages.flatMap((page) => page.items)
  if (!items.length) {
    return (
      <EmptyState
        title="Операцій поки немає"
        description={
          Object.keys(filters).length
            ? 'За цими фільтрами нічого не знайшлося.'
            : 'Тут з’являться перекази, обміни й рухи за позиками.'
        }
      />
    )
  }

  return (
    <div className="space-y-2">
      <ul className="divide-y rounded-lg border">
        {items.map((item) => (
          <TransactionRow key={item.id} item={item} />
        ))}
      </ul>

      {!limit && query.hasNextPage && (
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

function TransactionRow({ item }) {
  const config = TYPES[item.type] ?? { label: item.type, icon: Receipt }
  const Icon = config.icon
  const incoming = !item.amount.startsWith('-')

  return (
    <li>
      <Link
        to={`/history/${item.transactionId}`}
        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50"
      >
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-full',
            incoming ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground',
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate font-medium">
              {item.counterparty?.name ?? config.label}
            </span>
            {item.counterparty && (
              <span className="truncate text-xs text-muted-foreground">{config.label}</span>
            )}
          </div>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span>{dateFormat.format(new Date(item.createdAt))}</span>
            {item.comment && <span className="truncate">· {item.comment}</span>}
          </div>
        </div>

        <Amount value={item.amount} currency={item.currency} colored signed />
      </Link>
    </li>
  )
}
