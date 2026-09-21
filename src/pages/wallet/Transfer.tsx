import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ActionBar } from '@/components/layout/ActionBar'
import { AmountInput } from '@/components/money/AmountInput'
import { CurrencySelect } from '@/components/money/CurrencySelect'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Amount } from '@/components/money/Amount'
import { FieldError } from '@/pages/auth/Login'
import { cn } from '@/lib/utils'
import { transferSchema } from '@/lib/schema/forms'
import { applyServerErrors } from '@/lib/formErrors'
import { useTransfer, useTransferRecipients, useWallets } from '@/lib/hooks'
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
    <div className="mx-auto max-w-lg space-y-5">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Переказ</h1>

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Card>
          <CardHeader>
            <CardTitle>Кому переказуємо</CardTitle>
            <CardDescription>Оберіть отримувача зі списку.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <RecipientPicker
              value={recipient}
              onSelect={(user) => {
                setRecipient(user)
                form.setValue('toUserId', user?.id ?? '', { shouldValidate: true })
                setConfirming(false)
              }}
            />
            <FieldError message={form.formState.errors.toUserId?.message} />

            {/* Валюта — вужчою колонкою вже з телефона: сума й валюта це одне
                рішення, і розводити їх по рядках означає змусити людину двічі
                переводити погляд там, де вистачає одного. */}
            <div className="grid grid-cols-[1fr_7rem] gap-3 sm:grid-cols-[1fr_9rem] sm:gap-4">
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
                  className="w-full"
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
          </CardContent>
        </Card>

        <ActionBar>
          {confirming && (
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={() => setConfirming(false)}
            >
              Назад
            </Button>
          )}
          <Button
            type="submit"
            size="lg"
            className="flex-1"
            disabled={transfer.isPending || !recipient}
          >
            {transfer.isPending
              ? 'Виконуємо…'
              : confirming
                ? 'Підтвердити переказ'
                : 'Далі'}
          </Button>
        </ActionBar>
      </form>
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

/**
 * Кому переказати — списком, а не пошуком.
 *
 * Пошук має сенс там, де людей тисячі й імені ти не знаєш. Тут коло вузьке й
 * постійне, тож три літери щоразу набирати — зайва робота: отримувача просто
 * видно. Під ім’ям стоїть замаскована пошта — єдине, чим розрізняються два
 * однакові імені.
 */
function RecipientPicker({ value, onSelect }) {
  const recipients = useTransferRecipients()
  const people = recipients.data ?? []

  const placeholder = recipients.isLoading
    ? 'Завантажуємо…'
    : people.length === 0
      ? 'Нема кому переказувати'
      : 'Оберіть отримувача'

  return (
    <div className="space-y-2">
      <Label htmlFor="recipient">Отримувач</Label>
      <Select
        value={value?.id ?? ''}
        onValueChange={(id) => onSelect(people.find((person) => person.id === id) ?? null)}
        disabled={recipients.isLoading || people.length === 0}
      >
        {/* Висота під два рядки: ім’я й пошта під ним — те саме, що видно в
            списку, тож вибір не доводиться перевіряти, розгортаючи його знов. */}
        <SelectTrigger id="recipient" className="h-auto min-h-14 w-full py-2">
          <SelectValue placeholder={placeholder}>
            {value && <Person person={value} />}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {people.map((person) => (
            <SelectItem key={person.id} value={person.id} className="py-2">
              <Person person={person} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {recipients.isError && (
        <FieldError message="Не вдалося завантажити список. Оновіть сторінку." />
      )}
    </div>
  )
}

/** Рядок людини: кружечок з ініціалом, імʼя і замаскована пошта під ним. */
function Person({ person }) {
  return (
    <span className="flex min-w-0 items-center gap-3 text-left">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
        {person.displayName?.trim().charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium">{person.displayName}</span>
        <span className="block truncate text-xs text-muted-foreground">{person.hint}</span>
      </span>
    </span>
  )
}
