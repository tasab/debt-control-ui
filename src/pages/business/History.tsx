import { useState } from 'react'
import { History as HistoryIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Amount } from '@/components/money/Amount'
import { EmptyState, RowsSkeleton } from '@/components/layout/states'
import { useBusinessHistory } from '@/lib/hooks'

/**
 * Назви операцій людською мовою.
 *
 * У журналі тип транзакції технічний (`membership_funding`), а в стрічці має
 * стояти те, що людина насправді зробила. Незнайомий тип показується як є —
 * краще сирий рядок, ніж «інше», за яким нічого не знайдеш.
 */
const LABELS = {
  cash_count: 'Перерахунок кас',
  cash_count_reversal: 'Скасування перерахунку',
  business_expense: 'Витрата',
  business_draw: 'Забрав собі',
  business_capital: 'Вніс своє',
  contribution: 'Вклад учасника',
  membership_funding: 'Кошти учасника при вступі',
  membership_closing: 'Виплата при завершенні участі',
  membership_withdrawal: 'Зняття учасником',
  claim_transfer: 'Переказ між учасниками',
  internal_transfer: 'Переміщення коштів',
  user_deletion: 'Списання при видаленні',
}

/** Куди саме рухнулися гроші — щоб «−50 000» не висіло без пояснення. */
const PLACES = {
  business_register: (name) => name ?? 'Каса',
  business_cash: () => 'Готівка',
  business_income: () => 'Виторг',
  business_expense: () => 'Витрати',
  business_draw: () => 'Забрано собі',
  business_capital: () => 'Мій капітал',
  member_claim: () => 'Борг учаснику',
  user_wallet: () => 'Гаманець бізнесу',
}

export function BusinessHistory() {
  const [open, setOpen] = useState(false)
  const history = useBusinessHistory(open)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* Журнал стосується всього бізнесу, а не самого лише капіталу
            власника, у картці якого він раніше жив — тепер це звичайна дія
            в шапці розділу. */}
        <Button variant="outline" size="sm">
          <HistoryIcon className="size-4" aria-hidden /> Історія рахунку
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Історія рахунку</DialogTitle>
          <DialogDescription>
            Усе, що відбувалося з грошима бізнесу: перерахунки, витрати, внески, вклади
            учасників, переміщення.
          </DialogDescription>
        </DialogHeader>

        {history.isLoading && <RowsSkeleton rows={5} />}

        {history.data?.length === 0 && (
          <EmptyState
            icon={HistoryIcon}
            title="Рухів ще не було"
            description="Тут з’явиться кожна операція з моменту першої."
          />
        )}

        {history.data?.length > 0 && (
          <div className="divide-y overflow-hidden rounded-lg border">
            {history.data.map((move) => (
              <Move key={move.transactionId} move={move} />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Move({ move }) {
  const date = new Date(move.createdAt)
  // Нульові рядки не показуються: вони бувають у складених проводках і несуть
  // рівно нуль інформації.
  const lines = move.lines.filter((line) => line.amount !== '0')

  return (
    <div className="space-y-1.5 px-3 py-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="text-sm font-medium">{LABELS[move.type] ?? move.type}</span>
        <span className="text-xs text-muted-foreground">
          {date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}{' '}
          {date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {move.comment && <p className="text-xs text-muted-foreground">{move.comment}</p>}

      <div className="grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
        {lines.map((line, index) => (
          <div key={index} className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate text-muted-foreground">
              {(PLACES[line.kind] ?? (() => line.kind))(line.name)}
            </span>
            <Amount value={line.amount} currency={line.currency} size="sm" colored signed />
          </div>
        ))}
      </div>
    </div>
  )
}
