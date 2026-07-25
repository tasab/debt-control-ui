import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/**
 * One badge for every state in the system (CLIENT_PLAN §C4). Statuses appear on
 * six different screens; defining them once is what keeps "overdue" from being
 * red here and grey there.
 */
const STATUSES = {
  // Funding requests
  draft: { label: 'Чернетка', tone: 'muted' },
  open: { label: 'Збирає кошти', tone: 'info' },
  funded: { label: 'Зібрано', tone: 'success' },
  disbursed: { label: 'Видано', tone: 'success' },
  expired: { label: 'Протерміновано', tone: 'muted' },
  cancelled: { label: 'Скасовано', tone: 'muted' },

  // Loans
  repaying: { label: 'Погашається', tone: 'info' },
  closed: { label: 'Закрито', tone: 'muted' },
  overdue: { label: 'Прострочено', tone: 'danger' },
  defaulted: { label: 'Дефолт', tone: 'danger' },

  // Schedule rows
  due: { label: 'До сплати', tone: 'info' },
  paid: { label: 'Сплачено', tone: 'success' },

  // Fundings
  held: { label: 'Заморожено', tone: 'warning' },
  released: { label: 'Видано', tone: 'success' },
  refunded: { label: 'Повернуто', tone: 'muted' },
}

const TONES = {
  success: 'border-transparent bg-success/12 text-success',
  info: 'border-transparent bg-primary/12 text-primary',
  warning: 'border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400',
  danger: 'border-transparent bg-destructive/12 text-destructive',
  muted: 'border-transparent bg-muted text-muted-foreground',
}

export function StatusBadge({ status, className }) {
  const config = STATUSES[status] ?? { label: status, tone: 'muted' }
  return <Badge className={cn(TONES[config.tone], className)}>{config.label}</Badge>
}
