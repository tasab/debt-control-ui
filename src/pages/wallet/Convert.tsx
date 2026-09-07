import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowDown, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { AmountInput } from '@/components/money/AmountInput'
import { CurrencySelect } from '@/components/money/CurrencySelect'
import { Amount } from '@/components/money/Amount'
import { useExecuteQuote, useQuote, useRates, useWallets } from '@/lib/hooks'

const QUOTE_TTL_SECONDS = 60

export default function Convert() {
  const navigate = useNavigate()
  const { data: wallets = [] } = useWallets()
  const { data: rates = [] } = useRates()

  const [from, setFrom] = useState('UAH')
  const [to, setTo] = useState('USD')
  const [amount, setAmount] = useState('')
  const [quote, setQuote] = useState(null)
  const [error, setError] = useState(null)

  const createQuote = useQuote()
  const execute = useExecuteQuote()
  const idempotencyKey = useRef(crypto.randomUUID())

  const balance = wallets.find((w) => w.currency === from)?.available ?? '0'
  const staleRate = rates.find((r) => r.code === from || r.code === to)?.isStale

  // Any change to the inputs invalidates the locked quote — showing a stale
  // one next to fresh inputs is how people end up converting the wrong amount.
  useEffect(() => {
    setQuote(null)
    setError(null)
  }, [from, to, amount])

  const requestQuote = async () => {
    setError(null)
    try {
      const result = await createQuote.mutateAsync({ from, to, amountFrom: amount })
      setQuote(result)
    } catch (err) {
      setError(err)
    }
  }

  const confirm = async () => {
    try {
      await execute.mutateAsync({ quoteId: quote.quoteId, key: idempotencyKey.current })
      navigate('/wallet')
    } catch (err) {
      // A quote that expired mid-click is not a failure — re-quote silently and
      // keep everything the user typed (CLIENT_PLAN §C2).
      if (err.code === 'QUOTE_EXPIRED') {
        idempotencyKey.current = crypto.randomUUID()
        await requestQuote()
        setError({ message: 'Курс оновився — перевірте суму й підтвердьте ще раз.' })
        return
      }
      setError(err)
    }
  }

  const swap = () => {
    setFrom(to)
    setTo(from)
    setAmount('')
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Обмін валюти</h1>
        {staleRate && (
          <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-3" aria-hidden />
            Курс застарілий
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Скільки міняємо</CardTitle>
          <CardDescription>
            Курс фіксується на {QUOTE_TTL_SECONDS} секунд — те, що ви бачите, те й отримаєте.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-[1fr_7rem] gap-3 sm:grid-cols-[1fr_9rem] sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="from-amount">Віддаєте</Label>
              <AmountInput
                id="from-amount"
                currency={from}
                value={amount}
                max={balance}
                onMax={setAmount}
                onChange={(value) => setAmount(value ?? '')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="from-currency">З</Label>
              <CurrencySelect id="from-currency" className="w-full" value={from} onChange={setFrom} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Доступно: <Amount value={balance} currency={from} size="sm" />
          </p>

          {/* Кнопка сидить на розділювачі між «віддаєте» і «отримуєте» —
              напрямок обміну видно з самої картинки, без підпису. */}
          <div className="relative py-1">
            <div className="absolute inset-x-0 top-1/2 h-px bg-border" aria-hidden />
            <div className="relative flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="tap rounded-full bg-card shadow-xs"
                onClick={swap}
                aria-label="Поміняти валюти місцями"
              >
                <ArrowDown className="size-4" aria-hidden />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="to-currency">Отримуєте в</Label>
            <CurrencySelect id="to-currency" className="w-full" value={to} onChange={setTo} />
          </div>

          {quote ? (
            <QuoteCard
              quote={quote}
              onExpire={() => setQuote(null)}
              onRefresh={requestQuote}
              onConfirm={confirm}
              pending={execute.isPending}
            />
          ) : (
            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={requestQuote}
              disabled={!amount || createQuote.isPending || from === to}
            >
              {createQuote.isPending ? 'Рахуємо…' : 'Отримати курс'}
            </Button>
          )}

          {error && <p className="text-sm text-destructive">{error.message}</p>}

          <RateTable rates={rates} />
        </CardContent>
      </Card>
    </div>
  )
}

/** The locked quote, with the countdown that makes the lock legible. */
function QuoteCard({ quote, onExpire, onRefresh, onConfirm, pending }) {
  const [remaining, setRemaining] = useState(() => secondsLeft(quote.expiresAt))

  useEffect(() => {
    setRemaining(secondsLeft(quote.expiresAt))
    const timer = setInterval(() => {
      const left = secondsLeft(quote.expiresAt)
      setRemaining(left)
      if (left <= 0) {
        clearInterval(timer)
        onExpire()
      }
    }, 250)
    return () => clearInterval(timer)
  }, [quote.expiresAt, onExpire])

  const percent = Math.max(0, Math.min(100, (remaining / QUOTE_TTL_SECONDS) * 100))

  return (
    <div className="space-y-4 rounded-lg border border-primary bg-primary/5 p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">Отримаєте</span>
        <Amount value={quote.amountTo} currency={quote.to} size="lg" />
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
        <span className="text-muted-foreground">Курс</span>
        <span className="text-right font-medium tabular-nums">
          {quote.rate}{' '}
          <span className="text-xs text-muted-foreground">
            {/* Which side applied, and why — the difference is the platform's
                FX income, so it should never be a surprise. */}
            {quote.side === 'sell'
              ? '(ви купуєте — курс продажу)'
              : quote.side === 'bid'
                ? '(ви продаєте — курс купівлі)'
                : '(крос-курс через UAH)'}
          </span>
        </span>
      </div>

      <div className="space-y-1">
        <Progress value={percent} />
        <p className="text-xs text-muted-foreground">Дійсно ще {Math.ceil(remaining)} с</p>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={onRefresh}
          disabled={pending}
          aria-label="Оновити курс"
        >
          <RefreshCw className="size-4" aria-hidden />
          <span className="hidden sm:inline">Оновити</span>
        </Button>
        <Button type="button" size="lg" className="flex-1" onClick={onConfirm} disabled={pending}>
          {pending ? 'Виконуємо…' : 'Підтвердити обмін'}
        </Button>
      </div>
    </div>
  )
}

function RateTable({ rates }) {
  if (!rates.length) return null
  const sorted = [...rates].sort((a, b) => a.code.localeCompare(b.code))
  return (
    // Таблиця курсів возиться вбік у власному контейнері: три колонки цифр
    // на 360 px не стискаються без того, щоб склеїти суми між собою.
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[20rem] text-sm">
        <thead className="text-muted-foreground">
          <tr className="border-b">
            <th className="px-4 py-2 text-left font-medium">Валюта</th>
            <th className="px-4 py-2 text-right font-medium">Купівля</th>
            <th className="px-4 py-2 text-right font-medium">Продаж</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((rate) => (
            <tr key={rate.code} className="border-b last:border-0">
              <td className="px-4 py-2 font-medium">
                {rate.code}
                {rate.isStale && (
                  <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">застарілий</span>
                )}
              </td>
              <td className="px-4 py-2 text-right tabular-nums">{trim(rate.bid)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{trim(rate.sell)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const secondsLeft = (expiresAt) => (new Date(expiresAt).getTime() - Date.now()) / 1000
const trim = (rate) => Number(rate).toFixed(2)
