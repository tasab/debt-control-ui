import { cn } from '@/lib/utils'

/**
 * Головна дія форми, притиснута до низу екрана на телефоні.
 *
 * Форма переказу довша за екран рівно тоді, коли відкрита клавіатура, — і
 * кнопка «Підтвердити» опиняється під нею. Липка панель тримає її на видноті
 * весь час, рівно над нижньою навігацією, тож підтвердження ніколи не треба
 * шукати прокруткою. На десктопі панель стає звичайним рядом кнопок у потоці.
 */
export function ActionBar({ children, className }) {
  return (
    <div
      className={cn(
        'sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] z-30 -mx-4 flex gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur',
        'md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none',
        className,
      )}
    >
      {children}
    </div>
  )
}
