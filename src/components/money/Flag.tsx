import { cn } from '@/lib/utils'
import { flagFor } from '@/lib/currency'

/**
 * Прапорець валюти.
 *
 * Окремий компонент, щоб розмір був однаковий скрізь: емодзі малюється
 * шрифтом і на звичайному розмірі тексту виходить дрібним, тому тут воно
 * навмисно більше за сусідній підпис.
 */
export function Flag({ code, size = 'base', className }) {
  const flag = flagFor(code)
  if (!flag) return null

  return (
    <span
      aria-hidden
      className={cn(
        'leading-none',
        size === 'lg' && 'text-xl',
        size === 'base' && 'text-lg',
        size === 'sm' && 'text-base',
        // Поруч із кодом у рядку тексту — трохи більший за сам текст, але
        // від нього, щоб не розпирав рядок у дрібних підписах.
        size === 'inline' && 'text-[1.1em]',
        className,
      )}
    >
      {flag}
    </span>
  )
}

/**
 * Код валюти з прапорцем збоку — так код показується скрізь у застосунку.
 * Прапор впізнається швидше за три літери, код лишається однозначним.
 */
export function CurrencyCode({ code, className = undefined }) {
  return (
    <span className={cn('whitespace-nowrap', className)}>
      <Flag code={code} size="inline" className="mr-1" />
      {code}
    </span>
  )
}
