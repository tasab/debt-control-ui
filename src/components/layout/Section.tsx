import { cn } from '@/lib/utils'

/**
 * Заголовок секції з іконкою і місцем для дій праворуч.
 *
 * Один компонент на всі секції сторінки бізнесу: іконки допомагають знайти
 * потрібний блок на довгій сторінці, а спільна розмітка тримає відступи
 * однаковими — інакше кожна секція «дихає» по-своєму і сторінка виглядає
 * довшою, ніж є.
 *
 * На телефоні дії переїжджають під заголовок і ділять ширину порівну: два-три
 * `size="sm"` праворуч від назви розділу тиснулися в 150 px, а третя кнопка
 * зіскакувала в окремий ряд і виглядала як щось інше, ніж дві попередні.
 */
export function SectionHeader({ icon: Icon, title, hint, children, className }) {
  // Усередині вкладки заголовок буває порожнім (назву несе сама вкладка, а
  // дій у розділі немає) — тоді він не має лишати по собі порожній рядок.
  if (!title && !hint && !children) return null

  return (
    <div
      className={cn(
        'flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-3',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {/* Усередині табки назву вже несе сама табка, тож заголовок стискається
            до однієї підказки й кнопок — повторювати «Учасники» двічі підряд
            означало б витратити рядок ні на що. */}
        {title && Icon && <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
        {title && <h2 className="truncate text-base font-semibold tracking-tight">{title}</h2>}
        {hint && <span className="truncate text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0 [&>button]:flex-1 sm:[&>button]:flex-none">
          {children}
        </div>
      )}
    </div>
  )
}
