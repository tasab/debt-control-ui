import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { AmountBlock } from '@/components/money/Amount'
import { BalanceChart } from '@/components/money/BalanceChart'
import { useAuth } from '@/lib/auth'
import { useSummary } from '@/lib/hooks'

export default function Profile() {
  const { user, logout } = useAuth()
  const summary = useSummary()

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <span
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xl font-semibold text-primary"
          aria-hidden
        >
          {user?.displayName?.trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
            {user?.displayName}
          </h1>
          <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
          {user?.rating && (
            <Badge variant="secondary" className="mt-1.5">
              Рейтинг {user.rating.grade}
            </Badge>
          )}
        </div>
      </div>


      {summary.data && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card>
            <CardContent className="px-4 py-5">
              <AmountBlock
                label="Чиста вартість"
                value={summary.data.netWorth}
                currency={summary.data.baseCurrency}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="px-4 py-5">
              <AmountBlock
                label="На гаманцях"
                value={summary.data.wallets}
                currency={summary.data.baseCurrency}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="px-4 py-5">
              <AmountBlock
                label="Вкладено"
                value={summary.data.invested}
                currency={summary.data.baseCurrency}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="px-4 py-5">
              <AmountBlock
                label="Винен учасникам"
                value={summary.data.borrowed}
                currency={summary.data.baseCurrency}
              />
            </CardContent>
          </Card>
        </div>
      )}

      <BalanceChart title="Динаміка балансу" defaultRange="90" />

      {/* Вихід продубльовано тут, а не лише в меню шапки: на телефоні його
          шукають у профілі — там, де він є в кожному іншому додатку. */}
      <Button
        variant="outline"
        size="lg"
        className="w-full text-destructive sm:w-auto"
        onClick={() => logout.mutate()}
      >
        <LogOut className="size-4" aria-hidden />
        Вийти з акаунта
      </Button>
    </div>
  )
}
