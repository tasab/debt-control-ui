import { Component } from 'react'
import { AlertCircle, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * Empty / loading / error states, defined once. Skeletons rather than spinners
 * (CLIENT_PLAN §C6): the page keeps its shape while data lands, so nothing
 * jumps when it arrives.
 */

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-14 text-center', className)}>
      <Icon className="size-8 text-muted-foreground" aria-hidden />
      <div>
        <p className="font-medium">{title}</p>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
      <AlertCircle className="size-8 text-destructive" aria-hidden />
      <div>
        <p className="font-medium">Не вдалося завантажити</p>
        <p className="mt-1 text-sm text-muted-foreground">{error?.message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Спробувати ще раз
        </Button>
      )}
    </div>
  )
}

export function RowsSkeleton({ rows = 4, className }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  )
}

export function CardsSkeleton({ cards = 3 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: cards }, (_, i) => (
        <Skeleton key={i} className="h-32 w-full" />
      ))}
    </div>
  )
}

/**
 * Last line of defence: a render crash shows this instead of a blank page.
 * Money screens failing silently is worse than failing loudly.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Render error:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <AlertCircle className="mx-auto size-10 text-destructive" aria-hidden />
        <h1 className="mt-4 text-lg font-semibold">Щось зламалося</h1>
        <p className="mt-2 text-sm text-muted-foreground">{this.state.error.message}</p>
        <Button className="mt-6" onClick={() => window.location.reload()}>
          Перезавантажити
        </Button>
      </div>
    )
  }
}
