import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Check, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import * as apis from '@/lib/api'

/**
 * Посилання, яким людина показує баланс комусь ззовні.
 *
 * Один дотик — і посилання в буфері. Раніше тут було вікно зі списком, де
 * треба було натиснути «Створити», потім «Копіювати», а перед тим ще
 * подивитися, чи не створив ти зайвого: три кроки заради дії, яку роблять
 * на ходу.
 *
 * Посилання одне. Якщо активне вже є — копіюється воно, а не нове: інакше
 * кожен дотик залишав би по хвосту чинних посилань, про які ніхто не
 * пам'ятає.
 *
 * Що показує саме посилання — ім'я, чисту вартість, розклад по валютах і
 * останні рухи, — вирішує сторінка `/share/:token`; кнопка про це не
 * розповідає, бо натискають її тоді, коли вже вирішили поділитися.
 */
export function ShareBalanceDialog() {
  return (
    <ShareButton
      list={apis.shares.list}
      create={apis.shares.create}
      className="gap-1.5"
      variant="outline"
      size="sm"
      label="Поділитись"
      done="Скопійовано"
    />
  )
}

/**
 * Те саме з адмінки, для чужого балансу.
 *
 * Посилання належить тому, чий це баланс: воно з'являється в його власному
 * списку з позначкою, хто його створив, і він може його відкликати сам.
 */
export function UserShareDialog({ user }) {
  return (
    <ShareButton
      list={() => apis.shares.listFor(user.id)}
      create={() => apis.shares.createFor(user.id)}
      variant="ghost"
      size="icon"
      className="size-8 text-muted-foreground"
      ariaLabel={`Скопіювати посилання на баланс ${user.displayName}`}
    />
  )
}

/**
 * Копіювання з запасним шляхом.
 *
 * `navigator.clipboard` не працює на http і в старих браузерах — саме там,
 * де телефон найчастіше й відкриває цей додаток. Прихована textarea з
 * `execCommand` некрасива, але вона працює скрізь, і краще вона, ніж
 * «скопійовано» без нічого в буфері.
 */
async function writeToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Пробуємо старий шлях нижче.
  }

  try {
    const field = document.createElement('textarea')
    field.value = text
    field.setAttribute('readonly', '')
    field.style.position = 'fixed'
    field.style.opacity = '0'
    document.body.appendChild(field)
    field.select()
    const ok = document.execCommand('copy')
    field.remove()
    return ok
  } catch {
    return false
  }
}

/**
 * Кнопка, яка кладе посилання в буфер.
 *
 * Список і створення приходять функціями, а не хуками: запит має піти в мить
 * натискання. Хук тягнув би посилання кожного учасника одразу при
 * завантаженні адмінки — десятки запитів заради дії, яку роблять раз на
 * тиждень.
 */
function ShareButton({ list, create, label, done, ariaLabel, className, variant, size }) {
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const timer = useRef(null)

  // Таймер переживає розмонтування: галочка на десять секунд не має тримати
  // після себе виклик у вже знятому компоненті.
  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    if (busy) return
    setBusy(true)
    try {
      const existing = (await list()).find((share) => !share.revokedAt)
      const share = existing ?? (await create())
      const url = `${window.location.origin}/share/${share.token}`

      if (!(await writeToClipboard(url))) throw new Error('clipboard')

      toast.success('Посилання скопійовано')
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 10_000)
    } catch {
      // Сюди приходять дві різні біди — сервер не дав посилання й буфер не
      // взяв текст, — але для людини вони однакові: у буфері нічого немає.
      toast.error('Не вдалося скопіювати посилання')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      aria-label={ariaLabel}
      disabled={busy}
      className={cn(className, copied && 'text-success')}
      onClick={copy}
    >
      {copied ? <Check className="size-4" aria-hidden /> : <Share2 className="size-4" aria-hidden />}
      {label && (copied ? done : label)}
    </Button>
  )
}
