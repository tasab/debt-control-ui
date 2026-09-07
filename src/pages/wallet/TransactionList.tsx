import { Link } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Percent,
  Receipt,
  Repeat,
  SlidersHorizontal,
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
  // Правка балансу адміністратором — у виписці вона видима так само, як усе
  // інше: гроші не міняються нишком.
  adjustment: { label: 'Коригування адміністратором', icon: SlidersHorizontal },
}

const timeFormat = new Intl.DateTimeFormat('uk-UA', {
  hour: '2-digit',
  minute: '2-digit',
})

const dayFormat = new Intl.DateTimeFormat('uk-UA', {
  day: 'numeric',
  month: 'long',
})

const dayWithYearFormat = new Intl.DateTimeFormat('uk-UA', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/**
 * Дата в заголовку дня, час — у рядку.
 *
 * Повторювати «12 бер., 14:32» у кожному рядку означає друкувати ту саму дату
 * по десять разів поспіль; людина ж читає виписку днями — «що було сьогодні»,
 * «що було в понеділок».
 */
function dayLabel(date) {
  const today = new Date()
  const start = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.round((start(today) - start(date)) / 86_400_000)

  if (diffDays === 0) return 'Сьогодні'
  if (diffDays === 1) return 'Вчора'
  return date.getFullYear() === today.getFullYear()
    ? dayFormat.format(date)
    : dayWithYearFormat.format(date)
}

/** Операції, згруповані по днях, у тому ж порядку, у якому прийшли. */
function groupByDay(items) {
  const groups = []
  for (const item of items) {
    const date = new Date(item.createdAt)
    const key = date.toDateString()
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.items.push(item)
    else groups.push({ key, label: dayLabel(date), items: [item] })
  }
  return groups
}

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
    <div className="space-y-4">
      {groupByDay(items).map((group) => (
        <section key={group.key} className="space-y-1.5">
          {/* Заголовок дня липне до верху під шапкою: гортаючи довгу виписку,
              завжди видно, який саме день зараз перед очима. */}
          <h3 className="sticky top-[calc(3.5rem+env(safe-area-inset-top,0px))] z-10 bg-background/90 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            {group.label}
          </h3>
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {group.items.map((item) => (
              <TransactionRow key={item.id} item={item} />
            ))}
          </ul>
        </section>
      ))}

      {!limit && query.hasNextPage && (
        <Button
          variant="outline"
          size="lg"
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
        className="tap flex min-h-16 items-center gap-3 px-3 py-3 transition-colors hover:bg-accent/50 sm:px-4"
      >
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-full',
            incoming ? 'bg-success/12 text-success' : 'bg-muted text-muted-foreground',
          )}
        >
          <Icon className="size-4.5" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{item.counterparty?.name ?? config.label}</p>
          <p className="truncate text-xs text-muted-foreground">
            {timeFormat.format(new Date(item.createdAt))}
            {item.counterparty ? ` · ${config.label}` : ''}
            {item.comment ? ` · ${item.comment}` : ''}
          </p>
        </div>

        <Amount
          value={item.amount}
          currency={item.currency}
          colored
          signed
          className="shrink-0 text-right font-medium"
        />
      </Link>
    </li>
  )
}
