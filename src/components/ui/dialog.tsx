import * as React from "react"
import { XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function Dialog({
  ...props
}) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
  ...props
}) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className
      )}
      {...props} />
  );
}

/**
 * Наскільки низ екрана зараз перекритий — клавіатурою або нижньою панеллю
 * браузера.
 *
 * На iOS клавіатура не зменшує сторінку: layout viewport лишається тієї ж
 * висоти, тож вікно, притиснуте до низу, опиняється просто під клавіатурою
 * разом зі своїми кнопками. Про справжню видиму область знає лише
 * `visualViewport` — з неї й рахуємо, на скільки підняти шторку.
 *
 * Слухачі живуть лише поки діалог відкритий — хук викликає сам вміст
 * діалога, а його Radix монтує тільки на час показу.
 */
function useViewportInset() {
  const [inset, setInset] = React.useState(0)

  React.useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null
    if (!vv) return

    const update = () => {
      // Те, що лишилося від layout viewport під видимою частиною: клавіатура,
      // панель Safari або і те, і те разом.
      setInset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)))
    }

    update()
    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)
    return () => {
      vv.removeEventListener("resize", update)
      vv.removeEventListener("scroll", update)
    }
  }, [])

  React.useEffect(() => {
    if (!inset) return
    // Поле, у яке щойно почали писати, має лишитися на видноті: шторка
    // піднялася над клавіатурою, але курсор міг опинитися нижче її краю.
    const active = document.activeElement
    if (active && typeof active.scrollIntoView === "function" && active !== document.body) {
      active.scrollIntoView({ block: "nearest" })
    }
  }, [inset])

  return inset
}

/**
 * На телефоні діалог — це нижня «шторка», на десктопі — звичайне вікно
 * посередині.
 *
 * Причина не в моді: вікно, відцентроване по вертикалі, на телефоні
 * вилітає з-під клавіатури, а його кнопки опиняються у верхній половині
 * екрана, куди великим пальцем не дістати. Шторка притиснута до низу — і
 * підіймається рівно настільки, скільки треба вмісту.
 *
 * Центрування зроблено флексом, а не translate: анімація в’їзду знизу теж
 * рухає transform, і два джерела зсуву на одному елементі дають стрибок.
 *
 * Висота шторки — відсоток від обгортки, а не від `dvh`: обгортка
 * закінчується там, де починається клавіатура, тож вміст обмежується
 * видимою частиною екрана сам, без жодних чисел у стилях.
 */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}) {
  const inset = useViewportInset()
  // Поки низ нічим не перекритий, усе лишається на класах: підняття й
  // обмеження висоти потрібні саме тоді, коли вилізла клавіатура.
  const lifted = inset > 0

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      {/* Обгортка не ловить вказівник, тож клік повз вікно доходить до
          оверлея й закриває діалог, як і має.

          `bottom` тут інлайном, а не класом: висота клавіатури — число, яке
          приходить у рантаймі й змінюється при кожному її відкритті. */}
      <div
        className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
        style={lifted ? { bottom: `${inset}px` } : undefined}
      >
        <DialogPrimitive.Content
          data-slot="dialog-content"
          // Піднята шторка стоїть над клавіатурою, а не над краєм екрана —
          // запас під домашню смугу iPhone їй уже не потрібен.
          style={lifted ? { paddingBottom: "1.25rem" } : undefined}
          className={cn(
            "pointer-events-auto relative grid max-h-[92%] w-full gap-4 overflow-y-auto overscroll-contain rounded-t-2xl border-t bg-background p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shadow-lg duration-200 outline-none",
            "sm:max-h-[85%] sm:max-w-lg sm:rounded-xl sm:border sm:p-6 sm:pb-6",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:slide-in-from-bottom-4",
            "sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95",
            className
          )}
          {...props}>
          {/* «Ручка» вгорі шторки: показує, що панель прийшла знизу і що її
              можна закрити, ще до того, як людина знайде хрестик. */}
          <div
            className="mx-auto -mt-1 h-1 w-10 shrink-0 rounded-full bg-border sm:hidden"
            aria-hidden />
          {children}
          {showCloseButton && (
            <DialogPrimitive.Close
              data-slot="dialog-close"
              className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-full opacity-70 ring-offset-background transition-opacity hover:opacity-100 hover:bg-accent focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
              <XIcon />
              <span className="sr-only">Закрити</span>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </div>
    </DialogPortal>
  );
}

function DialogHeader({
  className,
  ...props
}) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 pr-10 text-left", className)}
      {...props} />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        // На телефоні кнопки на всю ширину і головна — знизу, під великим
        // пальцем; на десктопі — звичний ряд праворуч.
        "flex flex-col-reverse gap-2 pt-2 [&>*]:w-full sm:flex-row sm:justify-end sm:pt-0 sm:[&>*]:w-auto",
        className
      )}
      {...props}>
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({
  className,
  ...props
}) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props} />
  );
}

function DialogDescription({
  className,
  ...props
}) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props} />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
