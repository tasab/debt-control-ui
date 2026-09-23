import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const KEY = 'business-currency'

const Context = createContext({ currency: null, setCurrency: () => {} })

/**
 * У якій валюті дивитись на бізнес.
 *
 * Це не налаштування бізнесу, а спосіб подивитись на ті самі гроші, тому
 * вибір живе в браузері, а не на сервері: у бухгалтера й власника може бути
 * різна звичка, і нав'язувати її одне одному немає причин.
 *
 * Зберігається між заходами: людина, яка рахує в доларах, рахує в них
 * щодня, і повертати її щоразу до гривні означало б змушувати повторювати
 * той самий клік.
 *
 * `null` — базова валюта сервера: окремого значення «як за замовчуванням»
 * не існує, бо базова валюта може й змінитися.
 */
export function BusinessCurrencyProvider({ children }) {
  const [currency, setStored] = useState(() => {
    try {
      return localStorage.getItem(KEY)
    } catch {
      // Приватний режим забороняє читання — просто беремо базову.
      return null
    }
  })

  const setCurrency = useCallback((next) => {
    setStored(next)
    try {
      if (next) localStorage.setItem(KEY, next)
      else localStorage.removeItem(KEY)
    } catch {
      // Не зберегли — вибір діє до перезавантаження, і це краще за помилку.
    }
  }, [])

  const value = useMemo(() => ({ currency, setCurrency }), [currency, setCurrency])
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export const useBusinessCurrency = () => useContext(Context)
