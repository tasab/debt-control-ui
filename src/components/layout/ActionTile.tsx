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
// Кожна дія має свій колір — так плитки розрізняються ще до того, як
// прочитали підпис. Тон приглушений, як у карток підсумків: підпис лишається
// звичайним текстом, кольорові — фон, рамка й іконка.
const TONES = {
  primary: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
  success: 'border border-success/30 bg-success/10 hover:bg-success/15 [&>svg]:text-success',
  destructive:
    'border border-destructive/30 bg-destructive/10 hover:bg-destructive/15 [&>svg]:text-destructive',
  indigo: 'border border-chart-1/30 bg-chart-1/10 hover:bg-chart-1/15 [&>svg]:text-chart-1',
  amber: 'border border-chart-4/40 bg-chart-4/12 hover:bg-chart-4/20 [&>svg]:text-chart-4',
  violet: 'border border-chart-5/30 bg-chart-5/10 hover:bg-chart-5/15 [&>svg]:text-chart-5',
}

export const actionTileClass = (tone = undefined) =>
  cn(
    'tap flex h-20 flex-col items-center justify-center gap-1.5 rounded-xl px-1 text-center transition-colors sm:h-24',
    TONES[tone] ?? 'border bg-card hover:bg-accent',
  )

/** Підпис плитки: два рядки максимум, далі обрізається. */
export function ActionTileLabel({ children }) {
  return <span className="line-clamp-2 text-xs font-medium sm:text-sm">{children}</span>
}
