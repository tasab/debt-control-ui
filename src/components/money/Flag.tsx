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
        className,
      )}
    >
      {flag}
    </span>
  )
}
