import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Merge conditional class names and de-dupe conflicting Tailwind utilities.
// The helper every shadcn/ui component composes with.
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
