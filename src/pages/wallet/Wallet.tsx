import { Link } from 'react-router-dom'
import { ArrowLeftRight, Receipt, Repeat, Snowflake } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Amount } from '@/components/money/Amount'
import { BalanceChart } from '@/components/money/BalanceChart'
import { CardsSkeleton, ErrorState } from '@/components/layout/states'
import { ActionTileLabel, actionTileClass } from '@/components/layout/ActionTile'
import { useSummary, useWallets } from '@/lib/hooks'
import { isZero } from '@/lib/money'
import { ShareBalanceDialog } from './ShareBalance.tsx'
import { TopUpDialog } from './TopUp.tsx'
import { Investments, PendingInvites } from './Investments.tsx'
import { TransactionList } from './TransactionList.tsx'

export default function Wallet() {
  const wallets = useWallets()
  const summary = useSummary()

  return (
    <div className="space-y-6">
      {/* Заголовка «Гаманець» тут навмисно немає: на телефоні розділ уже
          названий підсвіченою вкладкою внизу, і повторювати його рядком —
          означає віддати перший екран напису замість суми. */}
      <PendingInvites />

      {summary.isLoading && !summary.data && <HeroSkeleton />}
      {summary.data && <Hero summary={summary.data} />}

      <QuickActions />

      <Investments />

      {wallets.isLoading && <CardsSkeleton />}
      {wallets.isError && <ErrorState error={wallets.error} onRetry={wallets.refetch} />}
      {wallets.data && <WalletGrid wallets={wallets.data} />}

      <BalanceChart />

      <TransactionsPreview />
    </div>
  )
}

/**
 * Перший екран — одна цифра.
 *
 * Питання, з яким сюди заходять, завжди одне: скільки в мене всього. Тому
 * чиста вартість подана суцільною плашкою на всю ширину, а розклад по
 * статтях їде під нею стрічкою — на телефоні п’ять підписів у ряд інакше
 * ламаються в три рядки дрібного тексту, який ніхто не читає.
 */
function Hero({ summary }) {
  const items = [
    { label: 'На гаманцях', value: summary.wallets },
    { label: 'Заморожено', value: summary.held },
    { label: 'У позиках', value: summary.lent },
    { label: 'Нараховано %', value: summary.accrued },
    { label: 'Заборгованість', value: summary.borrowed },
  ].filter((item) => !isZero(item.value))

  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="bg-primary/8 px-5 py-6">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-muted-foreground">Чиста вартість</p>
          {/* Кнопка стоїть біля самого числа, яким діляться, а не в меню:
              «показати баланс» — дія над цією цифрою, і шукати її десь іще
              немає причин. */}
          <ShareBalanceDialog />
        </div>
        <p className="mt-1.5">
          <Amount
            value={summary.netWorth}
            currency={summary.baseCurrency}
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
          />
        </p>
      </div>

      {items.length > 0 && (
        <ul className="no-scrollbar snap-row flex gap-6 overflow-x-auto overscroll-x-contain px-5 py-4">
          {items.map((item) => (
            <li key={item.label} className="shrink-0">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <Amount
                value={item.value}
                currency={summary.baseCurrency}
                className="text-base font-medium"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function HeroSkeleton() {
  return <div className="h-36 animate-pulse rounded-2xl border bg-muted/50" />
}

/**
 * Дії, заради яких відкривають гаманець.
 *
 * Плитками, а не дрібними кнопками в шапці: на телефоні це чверть ширини й
 * майже сантиметр висоти на кожну — промахнутися ніде. «Історія» тут тому,
 * що на неї єдину немає пункту в нижній панелі.
 *
 * «Записати» стоїть першим і не веде на сторінку: гроші в цьому додатку
 * ніяк не заходять ззовні (D1), тож поки людина не впише, скільки в неї є,
 * решта дій просто нічого не має, з чим працювати.
 */
function QuickActions() {
  const actions = [
    { to: '/transfer', label: 'Переказати', icon: ArrowLeftRight },
    { to: '/convert', label: 'Обміняти', icon: Repeat },
    { to: '/history', label: 'Історія', icon: Receipt },
  ]

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      <TopUpDialog asTile />
      {actions.map((action) => (
        <Link key={action.to} to={action.to} className={actionTileClass()}>
          <action.icon className="size-5" aria-hidden />
          <ActionTileLabel>{action.label}</ActionTileLabel>
        </Link>
      ))}
    </div>
  )
}

/**
 * Currencies the user actually holds come first and get a card each; the empty
 * ones collapse into one quiet row. Five equally sized cards, three of them
 * zero, made the funded balance harder to find, not easier.
 *
 * Картка — рядок «валюта ліворуч, сума праворуч», а не стовпчик: так на
 * телефоні три валюти займають один екран замість трьох, і суми стоять на
 * одній вертикалі, тобто читаються як стовпчик чисел.
 */
function WalletGrid({ wallets }) {
  const funded = wallets.filter((w) => !isZero(w.total))
  const empty = wallets.filter((w) => isZero(w.total))

  if (!funded.length && !empty.length) return null

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold tracking-tight">Рахунки</h2>

      {funded.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {funded.map((wallet) => (
            <Card key={wallet.currency}>
              <CardContent className="space-y-3 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{wallet.currency}</p>
                    {!isZero(wallet.held) && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Snowflake className="size-3.5 shrink-0" aria-hidden />
                        <span className="truncate">
                          Заморожено{' '}
                          <Amount
                            value={wallet.held}
                            currency={wallet.currency}
                            size="sm"
                            showCurrency={false}
                          />
                        </span>
                      </p>
                    )}
                  </div>
                  <Amount
                    value={wallet.available}
                    currency={wallet.currency}
                    size="lg"
                    showCurrency={false}
                    className="shrink-0"
                  />
                </div>

                {/* Дві дії просто в картці рахунку: саме тут людина бачить
                    суму й тут же вирішує, що вона змінилася. */}
                <div className="grid grid-cols-2 gap-2">
                  <TopUpDialog mode="topup" currency={wallet.currency} block />
                  <TopUpDialog
                    mode="withdraw"
                    currency={wallet.currency}
                    available={wallet.available}
                    block
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {empty.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
          <span>Порожні:</span>
          {empty.map((wallet) => (
            <span key={wallet.currency} className="font-medium">
              {wallet.currency}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}

function TransactionsPreview() {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight">Останні операції</h2>
        <Button asChild variant="ghost" size="sm">
          <Link to="/history">Уся історія</Link>
        </Button>
      </div>
      <TransactionList limit={8} compact />
    </section>
  )
}
