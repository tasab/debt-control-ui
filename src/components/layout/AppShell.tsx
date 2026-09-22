import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  ArrowLeftRight,
  Briefcase,
  Coins,
  LogOut,
  Menu,
  Repeat,
  ShieldCheck,
  User,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { useMemberships } from '@/lib/hooks'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ThemeToggle } from './ThemeToggle.tsx'

/**
 * Navigation is derived from capabilities (D7), not from a role: a user with
 * both `invest` and `borrow` simply sees both groups, with no special case.
 *
 * Підпис один на всі місця: у бічній панелі на телефоні й у шапці на
 * широкому екрані місця вистачає на повну назву.
 */
function navFor(user) {
  const items = [
    { to: '/', label: 'Гаманець', icon: Wallet },
    { to: '/transfer', label: 'Переказ', icon: ArrowLeftRight },
    { to: '/convert', label: 'Обмін', icon: Repeat },
  ]
  if (user?.capabilities?.includes('borrow')) {
    items.push({ to: '/business', label: 'Мій бізнес', icon: Briefcase })
  }
  // Адмінство — не capability, а окремий прапорець: права на чужі рахунки не
  // мають підмішуватися до звичайних ролей.
  if (user?.isAdmin) {
    items.push({ to: '/admin', label: 'Адмін', icon: ShieldCheck })
    items.push({ to: '/rates', label: 'Курси', icon: Coins })
  }
  return items
}

/**
 * Скільки речей чекають саме на цього користувача, по розділах.
 *
 * Без цього запрошення до бізнесу видно лише тому, хто здогадався зайти в
 * «Мої вклади»: сама сторінка нічим про себе не повідомляє, а на вузькому
 * екрані від пункту меню лишається сама іконка.
 */
function useWaiting() {
  const memberships = useMemberships()
  // Запрошення показуються на гаманці — туди ж веде й лічильник.
  return {
    '/': (memberships.data ?? []).filter((m) => m.status === 'pending').length,
  }
}

const deskLinkClass = ({ isActive }) =>
  cn(
    'flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors',
    isActive
      ? 'bg-primary text-primary-foreground shadow-xs'
      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
  )

export function AppShell() {
  const { user, logout } = useAuth()
  const items = navFor(user)
  const waiting = useWaiting()

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <header className="pt-safe sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <MobileMenu items={items} waiting={waiting} />
          <NavLink
            to="/"
            className="flex shrink-0 items-center gap-2 text-base font-semibold tracking-tight"
          >
            <span
              className="flex size-8 items-center justify-center rounded-lg bg-primary text-base leading-none font-bold text-primary-foreground"
              aria-hidden
            >
              ₴
            </span>
            <span className="hidden sm:inline">Debt Control</span>
          </NavLink>

          {/* Основна навігація на широкому екрані. На телефоні її місце —
              нижня панель: тягнутися великим пальцем до шапки незручно, а
              підписи там усе одно доводилося ховати. */}
          <nav className="hidden min-w-0 flex-1 gap-1 md:flex">
            {items.map((item) => {
              const count = waiting[item.to] ?? 0
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  // Корінь інакше вважався б активним на кожній сторінці:
                  // будь-який шлях починається з «/».
                  end={item.to === '/'}
                  className={deskLinkClass}
                >
                  <item.icon className="size-4" aria-hidden />
                  <span>{item.label}</span>
                  {count > 0 && (
                    <Badge
                      variant="secondary"
                      className="h-5 min-w-5 justify-center px-1 text-xs"
                      aria-label={`${count} чекає на вас`}
                    >
                      {count}
                    </Badge>
                  )}
                </NavLink>
              )
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 shrink-0 rounded-full sm:size-auto sm:gap-2 sm:rounded-md sm:px-3"
                  aria-label="Профіль і вихід"
                >
                  {/* На телефоні — ініціал у кружечку: один прогнозований
                      об’єкт у 40 px замість імені, яке в когось коротке, а в
                      когось займає півшапки. */}
                  <span className="flex size-8 items-center justify-center rounded-full bg-muted text-sm font-medium sm:hidden">
                    {initial(user?.displayName)}
                  </span>
                  <span className="hidden max-w-32 truncate sm:inline">{user?.displayName}</span>
                  {user?.rating && (
                    <Badge variant="secondary" className="hidden sm:inline-flex">
                      {user.rating.grade}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="truncate font-medium">{user?.displayName}</div>
                  <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <NavLink to="/profile">
                    <User className="size-4" aria-hidden />
                    Профіль і статистика
                  </NavLink>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => logout.mutate()}>
                  <LogOut className="size-4" aria-hidden />
                  Вийти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Нижній відступ — під «шторку» iPhone: інакше остання операція в
          списку назавжди лишається під нею. */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] md:py-8 md:pb-10">
        <Outlet />
      </main>
    </div>
  )
}

/**
 * Навігація на телефоні — панель, що висувається збоку.
 *
 * Нижня панель займала смугу екрана назавжди й тримала рівно п’ять пунктів:
 * шостий туди вже не вліз, а кожен новий розділ означав торг за ширину.
 * Панель збоку не коштує нічого, поки закрита, і вміщає скільки завгодно
 * пунктів із повними підписами замість обрізаних.
 */
function MobileMenu({ items, waiting }) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="size-10 shrink-0 md:hidden" aria-label="Меню">
          <Menu className="size-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="md:hidden">
        <SheetTitle className="flex items-center gap-2">
          <span
            className="flex size-8 items-center justify-center rounded-lg bg-primary text-base leading-none font-bold text-primary-foreground"
            aria-hidden
          >
            ₴
          </span>
          Debt Control
        </SheetTitle>

        <nav aria-label="Основна навігація">
          <ul className="space-y-1">
            {items.map((item) => {
              const count = waiting[item.to] ?? 0
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'tap flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      )
                    }
                  >
                    <item.icon className="size-5 shrink-0" aria-hidden />
                    <span className="truncate">{item.label}</span>
                    {count > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-auto h-5 min-w-5 justify-center px-1 text-xs"
                        aria-label={`${count} чекає на вас`}
                      >
                        {count}
                      </Badge>
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  )
}

const initial = (name) => (name ? name.trim().charAt(0).toUpperCase() : '·')
