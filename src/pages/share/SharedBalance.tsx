import { useParams } from 'react-router-dom'
import { Eye, Link2Off } from 'lucide-react'
import { Amount } from '@/components/money/Amount'
import { Flag } from '@/components/money/Flag'
import { Skeleton } from '@/components/ui/skeleton'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { useSharedBalance } from '@/lib/hooks'

/**
 * Сторінка за публічним посиланням.
 *
 * Її відкриває той, у кого немає акаунта, тож тут немає ні навігації, ні
 * заклику зареєструватися: людину попросили подивитися на число, а не
 * привели на лендинг. Усе, що є, — одне велике число, розклад по валютах і
 * чесна позначка, що це лише перегляд.
 */
export default function SharedBalance() {
  const { token } = useParams()
  const query = useSharedBalance(token)

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-5 px-4 py-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="flex size-8 items-center justify-center rounded-lg bg-primary text-base leading-none font-bold text-primary-foreground"
            aria-hidden
          >
            ₴
          </span>
          <span className="text-sm font-semibold tracking-tight">Debt Control</span>
        </div>
        <ThemeToggle />
      </div>

      {query.isLoading && (
        <div className="space-y-3 rounded-2xl border bg-card p-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
      )}

      {query.isError && <Unavailable />}

      {query.data && <Balance data={query.data} />}
    </div>
  )
}

function Balance({ data }) {
  // Сервер уже дав розклад по валютах; старий список гаманців лишається в
  // відповіді для сумісності, але сторінці він більше не потрібен.
  const rows = data.byCurrency ?? []
  const converted = rows.some((row) => row.currency !== data.baseCurrency)

  return (
    <>
      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="bg-primary/8 px-5 py-6">
          <p className="text-sm text-muted-foreground">Баланс: {data.displayName}</p>
          <p className="mt-1.5">
            <Amount
              value={data.netWorth}
              currency={data.baseCurrency}
              whole
              className="text-3xl font-semibold tracking-tight sm:text-4xl"
            />
          </p>
          {/* Підсумок звести можна лише в одній валюті — і тоді про курс треба
              сказати вголос, бо самі гроші лежать не в ній. */}
          {converted && (
            <p className="mt-1 text-xs text-muted-foreground">
              Усе разом у {data.baseCurrency} за поточним курсом
            </p>
          )}
        </div>

        {/* Розклад суми. Без нього людина, яка віддала все в бізнес, бачить
            велике число й порожнечу під ним — і не розуміє, звідки воно. */}
        <Breakdown rows={rows} />
      </section>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Eye className="size-3.5" aria-hidden />
        Тільки перегляд · станом на {new Date(data.generatedAt).toLocaleString('uk-UA')}
      </p>
    </>
  )
}

/**
 * З чого складається чиста вартість — у валютах, а не в перерахунку.
 *
 * Гроші лежать у тих валютах, у яких лежать, і «скільки там доларів» — саме
 * те питання, заради якого посилання й відкривають; зведена гривня на нього
 * не відповідає.
 *
 * Під кожним рядком сказано, де ці гроші: на гаманці, у бізнесі чи це борг
 * перед учасниками. Частини друкуються лише тоді, коли їх більше однієї —
 * інакше рядок просто повторював би сам себе.
 */
function Breakdown({ rows }) {
  if (rows.length === 0) return null

  return (
    <ul className="divide-y">
      {rows.map((row) => {
        const parts = [
          { label: 'на гаманці', value: row.wallets },
          { label: 'у бізнесі', value: row.invested },
          { label: 'борг перед учасниками', value: row.borrowed, negative: true },
        ].filter((part) => part.value && part.value !== '0')

        return (
          <li key={row.currency} className="flex items-start justify-between gap-3 px-5 py-3">
            <div className="min-w-0">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Flag code={row.currency} />
                {row.currency}
              </span>
              {parts.length > 1 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {parts.map((part, index) => (
                    <span key={part.label}>
                      {index > 0 && ' · '}
                      {part.label}{' '}
                      <Amount
                        value={part.negative ? `-${part.value}` : part.value}
                        currency={row.currency}
                        size="sm"
                        showCurrency={false}
                      />
                    </span>
                  ))}
                </p>
              )}
            </div>
            <Amount
              value={row.total}
              currency={row.currency}
              showCurrency={false}
              colored={row.total.startsWith('-')}
              className="shrink-0 font-medium"
            />
          </li>
        )
      })}
    </ul>
  )
}

function Unavailable() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-14 text-center">
      <Link2Off className="size-8 text-muted-foreground" aria-hidden />
      <div>
        <p className="font-medium">Посилання не працює</p>
        {/* Не уточнюємо, чи такий токен колись існував: сама різниця між
            «не було» і «відкликали» вже щось розповідала б про чужий акаунт. */}
        <p className="mt-1 text-sm text-muted-foreground">
          Воно недійсне або його відкликали. Попросіть нове в того, хто ним поділився.
        </p>
      </div>
    </div>
  )
}
