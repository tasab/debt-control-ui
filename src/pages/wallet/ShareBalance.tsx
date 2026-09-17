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
import { EmptyState, RowsSkeleton } from '@/components/layout/states'
import { useConfirm } from '@/components/layout/Confirm'
import { cn } from '@/lib/utils'
import {
  useCreateShare,
  useCreateUserShare,
  useRevokeShare,
  useRevokeUserShare,
  useShares,
  useUserShares,
} from '@/lib/hooks'

/**
 * Посилання, яким людина показує баланс комусь ззовні.
 *
 * Посилань може бути кілька, і кожне відкликається окремо: одне видане банку
 * живе своїм життям, і скасовувати його разом із тим, що дали партнеру, —
 * причина не давати нікому жодного.
 *
 * Створення — без жодного поля. Тут колись був підпис «для себе», але
 * заповнювати його щоразу заради того, щоб поділитися балансом, — робота,
 * якої ніхто не просив.
 */
export function ShareBalanceDialog() {
  const shares = useShares()
  const create = useCreateShare()
  const revoke = useRevokeShare()

  return (
    <ShareDialog
      trigger={
        <Button variant="outline" size="sm" className="gap-1.5">
          <Share2 className="size-4" aria-hidden />
          Поділитись
        </Button>
      }
      title="Поділитись балансом"
      description="Хто відкриє посилання, побачить ваше ім’я, чисту вартість і з чого вона складається. Ні історії, ні пошти, ні можливості щось зробити з коштами."
      shares={shares}
      create={create}
      revoke={revoke}
    />
  )
}

/**
 * Те саме з адмінки, для чужого балансу.
 *
 * Посилання належить тому, чий це баланс: воно з’являється в його власному
 * списку з позначкою, хто його створив, і він може його відкликати сам.
 */
export function UserShareDialog({ user }) {
  const [open, setOpen] = useState(false)
  // Список тягнеться лише коли діалог відкрили: інакше сторінка адміна робила
  // б по запиту на кожного користувача в списку одразу після завантаження.
  const shares = useUserShares(user.id, open)
  const create = useCreateUserShare(user.id)
  const revoke = useRevokeUserShare(user.id)

  return (
    <ShareDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground"
          aria-label={`Поділитись балансом ${user.displayName}`}
        >
          <Share2 className="size-4" aria-hidden />
        </Button>
      }
      title={`Баланс: ${user.displayName}`}
      description="Посилання побачить ім’я, чисту вартість і з чого вона складається. Воно з’явиться і в списку самої людини — вона зможе його відкликати."
      shares={shares}
      create={create}
      revoke={revoke}
    />
  )
}

function ShareDialog({
  trigger,
  title,
  description,
  shares,
  create,
  revoke,
  open,
  onOpenChange,
}) {
  const active = (shares.data ?? []).filter((share) => !share.revokedAt)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
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
              <ShareRow key={share.id} share={share} revoke={revoke} />
            ))}
          </ul>
        )}

        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={create.isPending}
          onClick={() => create.mutate()}
        >
          <Plus className="size-4" aria-hidden />
          {create.isPending ? 'Створюємо…' : 'Створити посилання'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}

function ShareRow({ share, revoke }) {
  const confirm = useConfirm()
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/share/${share.token}`

  /**
   * На телефоні — системний «Поділитись», де вже є Telegram і пошта; на
   * десктопі — буфер обміну. Clipboard теж може бути недоступним (http на
   * телефоні, старий браузер), і тоді лишається поле, з якого можна виділити
   * посилання руками.
   */
  const send = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Баланс', url })
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
          <p className="truncate text-sm font-medium">
            {new Date(share.createdAt).toLocaleDateString('uk-UA')}
          </p>
          <p className="text-xs text-muted-foreground">
            {share.viewCount > 0
              ? `Відкривали ${share.viewCount} ${plural(share.viewCount)}`
              : 'Ще не відкривали'}
            {/* Видно лише коли посилання зробив не сам власник — інакше це
                підпис «створив я» у власному ж списку. */}
            {share.createdByName ? ` · створив ${share.createdByName}` : ''}
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
                'Воно перестане відкриватися для всіх, кому його дали. Решта посилань працюватимуть далі.',
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
          onClick={send}
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
