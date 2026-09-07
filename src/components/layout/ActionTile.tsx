import { cn } from '@/lib/utils'

/**
 * Плитка головної дії розділу.
 *
 * Один вигляд на всі щоденні дії — і на гаманці, і в бізнесі: іконка над
 * підписом, висота близько сантиметра, ціль на всю ширину колонки. Дрібні
 * `size="sm"` кнопки в заголовку розділу програвали саме тут — те, що людина
 * робить щодня, має бути найбільшим об’єктом на екрані, а не найменшим.
 *
 * Це функція класів, а не компонент: плиткою буває і посилання (перехід на
 * сторінку), і кнопка діалогу, і підмінювати одне одним через `asChild`
 * заради спільного вигляду не варто.
 */
export const actionTileClass = (primary = false) =>
  cn(
    'tap flex h-20 flex-col items-center justify-center gap-1.5 rounded-xl px-1 text-center transition-colors sm:h-24',
    primary
      ? 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90'
      : 'border bg-card hover:bg-accent',
  )

/** Підпис плитки: два рядки максимум, далі обрізається. */
export function ActionTileLabel({ children }) {
  return <span className="line-clamp-2 text-xs font-medium sm:text-sm">{children}</span>
}
