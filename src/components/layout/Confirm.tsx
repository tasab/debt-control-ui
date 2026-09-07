import { createContext, useCallback, useContext, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * Підтвердження дії — модалкою, а не браузерним `confirm`.
 *
 * Нативне вікно не можна оформити, воно блокує весь потік і в різних
 * браузерах виглядає по-різному, аж до «сайт хоче показати діалог». Тут
 * натомість звичайний діалог застосунку: з назвою дії на кнопці й червоною
 * кнопкою там, де дія незворотна.
 *
 * Виклик лишається однорядковим — `if (await confirm({…}))`, — тому місця
 * виклику не обростають власним станом на кожну кнопку.
 */
const ConfirmContext = createContext(async () => false)

export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null)

  const confirm = useCallback(
    (options) => new Promise((resolve) => setRequest({ ...options, resolve })),
    [],
  )

  // Esc, клік повз вікно і «Скасувати» — одна відповідь: ні.
  const settle = (answer) => {
    request?.resolve(answer)
    setRequest(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={Boolean(request)} onOpenChange={(next) => !next && settle(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{request?.title}</DialogTitle>
            {request?.description && (
              <DialogDescription>{request.description}</DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="lg" onClick={() => settle(false)}>
              {request?.cancelLabel ?? 'Скасувати'}
            </Button>
            <Button
              size="lg"
              variant={request?.destructive ? 'destructive' : 'default'}
              onClick={() => settle(true)}
              autoFocus
            >
              {request?.confirmLabel ?? 'Підтвердити'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  )
}

export const useConfirm = () => useContext(ConfirmContext)
