import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20',
        outline:
          'border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      // Кожен розмір на телефоні на крок більший, ніж на десктопі: палець
      // накриває близько 9 мм, і 36-піксельна кнопка означає промахи там, де
      // ціна промаху — чужий переказ. З `sm:` вище повертається щільність,
      // звична для миші.
      size: {
        default: 'h-10 px-4 py-2 has-[>svg]:px-3 sm:h-9',
        sm: 'h-9 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 sm:h-8',
        lg: 'h-11 rounded-md px-6 text-base has-[>svg]:px-4 sm:h-10 sm:text-sm',
        icon: 'size-10 sm:size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
