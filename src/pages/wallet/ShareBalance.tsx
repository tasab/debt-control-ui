import { useState } from 'react'
import { Check, Copy, Link2, Plus, Share2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmptyState, RowsSkeleton } from '@/components/layout/states'
import { useConfirm } from '@/components/layout/Confirm'
import { cn } from '@/lib/utils'
import { useCreateShare, useRevokeShare, useShares } from '@/lib/hooks'

/**
 * Посилання, яким людина показує свій баланс комусь ззовні.
 *
 * Посилань може бути кілька, і кожне відкликається окремо: одне видане банку
 * живе своїм життям, і скасовувати його разом із тим, що дали партнеру, —
 * причина не давати нікому жодного.
 */
export function ShareBalanceDialog() {
  const [open, setOpen] = useState(false)
  const shares = useShares()
  const create = useCreateShare()
  const [label, setLabel] = useState('')

  const active = (shares.data ?? []).filter((share) => !share.revokedAt)

  const submit = async (event) => {
    event.preventDefault()
    await create.mutateAsync({ label: label.trim() || undefined })
    setLabel('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Share2 className="size-4" aria-hidden />
          Поділитись
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Поділитись балансом</DialogTitle>
          <DialogDescription>
            Хто відкриє посилання, побачить ваше ім’я, чисту вартість і залишки по валютах.
            Ні історії, ні пошти, ні можливості щось зробити з коштами.
          </DialogDescription>
        </DialogHeader>

        {shares.isLoading && <RowsSkeleton rows={2} />}

        {!shares.isLoading && active.length === 0 && (
          <EmptyState
            icon={Link2}
            title="Посилань ще немає"
            description="Створіть перше — і зможете відкликати його будь-коли."
            className="py-8"
          />
        )}

        {active.length > 0 && (
          <ul className="space-y-2">
            {active.map((share) => (
              <ShareRow key={share.id} share={share} />
            ))}
          </ul>
        )}

        <form onSubmit={submit} className="space-y-2 border-t pt-4">
          <Label htmlFor="share-label">Підпис (для себе)</Label>
          <div className="flex gap-2">
            <Input
              id="share-label"
              value={label}
              maxLength={60}
              placeholder="напр. для банку"
              onChange={(event) => setLabel(event.target.value)}
            />
            <Button type="submit" className="shrink-0" disabled={create.isPending}>
              <Plus className="size-4" aria-hidden />
              {create.isPending ? 'Створюємо…' : 'Створити'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Підпис бачите тільки ви — він допомагає згадати, кому яке посилання дали.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ShareRow({ share }) {
  const revoke = useRevokeShare()
  const confirm = useConfirm()
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/share/${share.token}`

  /**
   * На телефоні — системний «Поділитись», де вже є Telegram і пошта; на
   * десктопі — буфер обміну. Clipboard теж може бути недоступним (http на
   * телефоні, старий браузер), і тоді лишається поле, з якого можна виділити
   * посилання руками.
   */
  const share_ = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Мій баланс', url })
        return
      } catch {
        // Скасували системне вікно — це не помилка, просто копіюємо.
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Немає доступу до буфера — посилання й так лежить у полі поруч.
    }
  }

  return (
    <li className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{share.label ?? 'Без підпису'}</p>
          <p className="text-xs text-muted-foreground">
            {share.viewCount > 0
              ? `Відкривали ${share.viewCount} ${plural(share.viewCount)}`
              : 'Ще не відкривали'}
          </p>
        </div>
        <button
          type="button"
          aria-label="Відкликати посилання"
          className="tap -mt-1 -mr-1 flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
          onClick={async () => {
            const ok = await confirm({
              title: 'Відкликати це посилання?',
              description:
                'Воно перестане відкриватися для всіх, кому ви його дали. Решта посилань працюватимуть далі.',
              confirmLabel: 'Відкликати',
              destructive: true,
            })
            if (ok) revoke.mutate(share.id)
          }}
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>

      <div className="mt-2 flex gap-2">
        {/* Саме поле, а не тільки кнопка: коли буфер недоступний, посилання
            має лишатися тим, що можна виділити й скопіювати вручну. */}
        <Input
          readOnly
          value={url}
          onFocus={(event) => event.target.select()}
          className="h-9 font-mono text-xs"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('h-9 shrink-0', copied && 'text-success')}
          onClick={share_}
        >
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? 'Готово' : 'Копіювати'}
        </Button>
      </div>
    </li>
  )
}

const plural = (count) => {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'раз'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'рази'
  return 'разів'
}
