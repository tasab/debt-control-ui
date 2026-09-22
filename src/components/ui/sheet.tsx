import { Dialog as DialogPrimitive } from 'radix-ui'
import { XIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Панель, що висувається з краю екрана.
 *
 * Це той самий діалог Radix, лише притиснутий до боку й на всю висоту: фокус
 * і Escape поводяться звично, а клік повз панель її закриває. Для навігації
 * це краще за власний `position: fixed` з нуля — інакше довелося б окремо
 * ловити клавіатуру, прокрутку тла й повернення фокуса.
 */
function Sheet({ ...props }) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }) {
  return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }) {
  return <DialogPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetTitle({ className, ...props }) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn('text-base font-semibold tracking-tight', className)}
      {...props}
    />
  )
}

function SheetDescription({ className, ...props }) {
  return (
    <DialogPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

function SheetContent({ className, children, side = 'left', showCloseButton = true, ...props }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        data-slot="sheet-overlay"
        className="fixed inset-0 z-50 bg-black/50 duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
      />
      <DialogPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          // Ширина в межах екрана: на вузькому телефоні панель на всі 20rem
          // не лишала б смужки тла, по якій зрозуміло, що це панель, а не
          // нова сторінка.
          'pt-safe pb-safe fixed inset-y-0 z-50 flex w-72 max-w-[85vw] flex-col gap-4 overflow-y-auto overscroll-contain bg-background p-4 shadow-lg duration-200 outline-none',
          side === 'right'
            ? 'right-0 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right'
            : 'left-0 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
          'data-[state=closed]:animate-out data-[state=open]:animate-in',
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full opacity-70 transition-opacity hover:bg-accent hover:opacity-100 focus:ring-2 focus:ring-ring focus:outline-hidden"
            data-slot="sheet-close"
          >
            <XIcon className="size-4" />
            <span className="sr-only">Закрити</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger }
