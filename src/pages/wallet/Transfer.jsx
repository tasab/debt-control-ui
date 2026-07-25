import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Check, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { AmountInput } from '@/components/money/AmountInput'
import { CurrencySelect } from '@/components/money/CurrencySelect'
import { Amount } from '@/components/money/Amount'
import { FieldError } from '@/pages/auth/Login'
import { cn } from '@/lib/utils'
import { transferSchema } from '@/lib/schema/forms'
import { applyServerErrors } from '@/lib/formErrors'
import { useTransfer, useUserSearch, useWallets } from '@/lib/hooks'
import * as apis from '@/lib/api'

export default function Transfer() {
  const navigate = useNavigate()
  const transfer = useTransfer()
  const { data: wallets = [] } = useWallets()
  const [recipient, setRecipient] = useState(null)
  const [confirming, setConfirming] = useState(false)

  // One key per attempt: a retry after a failed response must reuse it, or the
  // retry becomes a second transfer.
  const idempotencyKey = useRef(crypto.randomUUID())

  const form = useForm({
    resolver: zodResolver(transferSchema),
    defaultValues: { toUserId: '', currency: 'UAH', amount: '', comment: '' },
  })
  const { currency, amount } = form.watch()
  const balance = wallets.find((w) => w.currency === currency)?.available ?? '0'

  // The fee must be visible before confirming, never after (§2.4).
  const preview = useQuery({
    queryKey: ['fee-preview', currency, amount],
    queryFn: () => apis.transfers.feePreview({ kind: 'transfer', currency, amount }),
    enabled: !!amount && BigInt(amount || '0') > 0n,
  })

  const onSubmit = form.handleSubmit(async (values) => {
    if (!confirming) {
      setConfirming(true)
      return
    }
    try {
      await transfer.mutateAsync({
        body: { ...values, comment: values.comment || undefined },
        key: idempotencyKey.current,
      })
      navigate('/wallet')
    } catch (error) {
      setConfirming(false)
      applyServerErrors(form, error)
    }
  })

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Переказ</h1>

      <Card>
        <CardHeader>
          <CardTitle>Кому переказуємо</CardTitle>
          <CardDescription>Знайдіть отримувача за іменем або поштою.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <RecipientPicker
              value={recipient}
              onSelect={(user) => {
                setRecipient(user)
                form.setValue('toUserId', user?.id ?? '', { shouldValidate: true })
                setConfirming(false)
              }}
            />
            <FieldError message={form.formState.errors.toUserId?.message} />

            <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
              <div className="space-y-2">
                <Label htmlFor="amount">Сума</Label>
                <AmountInput
                  id="amount"
                  currency={currency}
                  value={amount}
                  max={balance}
                  onMax={(value) => form.setValue('amount', value, { shouldValidate: true })}
                  onChange={(value) => {
                    form.setValue('amount', value ?? '', { shouldValidate: true })
                    setConfirming(false)
                  }}
                  error={form.formState.errors.amount?.message}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Валюта</Label>
                <CurrencySelect
                  id="currency"
                  value={currency}
                  onChange={(value) => {
                    form.setValue('currency', value)
                    setConfirming(false)
                  }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Доступно: <Amount value={balance} currency={currency} size="sm" />
            </p>

            <div className="space-y-2">
              <Label htmlFor="comment">Коментар</Label>
              <Textarea
                id="comment"
                rows={2}
                maxLength={280}
                placeholder="за оренду"
                {...form.register('comment')}
              />
              <FieldError message={form.formState.errors.comment?.message} />
            </div>

            {preview.data && (
              <FeeBreakdown preview={preview.data} currency={currency} highlight={confirming} />
            )}

            <FieldError message={form.formState.errors.root?.message} />

            <div className="flex gap-2">
              {confirming && (
                <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
                  Назад
                </Button>
              )}
              <Button
                type="submit"
                className="flex-1"
                disabled={transfer.isPending || !recipient}
              >
                {transfer.isPending
                  ? 'Виконуємо…'
                  : confirming
                    ? 'Підтвердити переказ'
                    : 'Далі'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function FeeBreakdown({ preview, currency, highlight }) {
  return (
    <div
      className={cn(
        'rounded-lg border p-4 text-sm transition-colors',
        highlight && 'border-primary bg-primary/5',
      )}
    >
      <div className="flex justify-between">
        <span className="text-muted-foreground">Отримувач отримає</span>
        <Amount value={preview.received} currency={currency} />
      </div>
      <div className="mt-2 flex justify-between">
        <span className="text-muted-foreground">Комісія</span>
        <Amount value={preview.fee} currency={currency} />
      </div>
      <Separator className="my-3" />
      <div className="flex justify-between font-medium">
        <span>Спишеться з вас</span>
        <Amount value={preview.total} currency={currency} />
      </div>
    </div>
  )
}

/** Debounced search — a request per keystroke would hammer the endpoint. */
function RecipientPicker({ value, onSelect }) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const search = useUserSearch(debounced)
  const results = useMemo(() => search.data ?? [], [search.data])

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-lg border bg-accent/40 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{value.displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{value.hint}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => onSelect(null)}>
          Змінити
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="recipient">Отримувач</Label>
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id="recipient"
          className="pl-9"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ім’я або пошта"
          autoComplete="off"
        />
      </div>

      {debounced.length >= 2 && (
        <ul className="max-h-56 divide-y overflow-y-auto rounded-md border">
          {search.isLoading && <li className="px-4 py-3 text-sm text-muted-foreground">Шукаємо…</li>}
          {!search.isLoading && !results.length && (
            <li className="px-4 py-3 text-sm text-muted-foreground">Нікого не знайдено</li>
          )}
          {results.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                onClick={() => onSelect(user)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{user.displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.hint}</p>
                </div>
                <Check className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
