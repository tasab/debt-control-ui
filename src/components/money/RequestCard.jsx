import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Amount } from '@/components/money/Amount'
import { StatusBadge } from '@/components/money/StatusBadge'
import { formatBps } from '@/lib/money'

/**
 * One request in the marketplace list. `fundedBps` arrives from the server —
 * the client never divides amountFunded by amountTarget (CLIENT_PLAN §0).
 */
export function RequestCard({ request }) {
  const percent = request.fundedBps / 100

  return (
    <Card className="transition-colors hover:border-primary/50">
      <Link to={`/market/${request.id}`} className="block">
        <CardContent className="space-y-4 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{request.business.name}</p>
              <p className="text-xs text-muted-foreground">
                {request.termDays} днів ·{' '}
                {request.repaymentType === 'bullet' ? 'тіло в кінці' : 'гнучке тіло'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <GradeBadge rating={request.business.rating} />
              <StatusBadge status={request.status} />
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-3">
            <Amount value={request.amountTarget} currency={request.currency} size="lg" />
            <span className="text-lg font-semibold text-primary">
              {formatBps(request.rateAnnualBps)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">річних</span>
            </span>
          </div>

          <div className="space-y-1.5">
            <Progress value={percent} />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Зібрано <Amount value={request.amountFunded} currency={request.currency} size="sm" showCurrency={false} />{' '}
                ({percent.toFixed(0)}%)
              </span>
              <span className="flex items-center gap-1">
                <Users className="size-3" aria-hidden />
                {request.investorCount}
              </span>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  )
}

/**
 * Ratings are shown as a letter, never as a bare score, and always with the
 * disclaimer nearby (PLATFORM_PLAN §7) — a number reads as a guarantee.
 */
export function GradeBadge({ rating, className }) {
  if (!rating) return null
  const tone =
    rating.grade === 'A'
      ? 'bg-success/12 text-success'
      : rating.grade === 'B'
        ? 'bg-primary/12 text-primary'
        : rating.grade === 'C'
          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
          : 'bg-destructive/12 text-destructive'

  return (
    <Badge className={`border-transparent font-mono ${tone} ${className ?? ''}`} title="Рейтинг бізнесу">
      {rating.grade}
    </Badge>
  )
}
