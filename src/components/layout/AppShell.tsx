import { NavLink, Outlet } from 'react-router-dom'
import {
  ArrowLeftRight,
  Briefcase,
  Coins,
  LogOut,
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
import { ThemeToggle } from './ThemeToggle.tsx'

/**
 * Navigation is derived from capabilities (D7), not from a role: a user with
 * both `invest` and `borrow` simply sees both groups, with no special case.
 *
 * `short` — підпис для нижньої панелі: там на пункт припадає близько 70 px,
 * і «Мій бізнес» у два рядки з’їдає висоту, потрібну самій іконці.
 */
function navFor(user) {
  const items = [
    { to: '/wallet', label: 'Гаманець', short: 'Гаманець', icon: Wallet },
    { to: '/transfer', label: 'Переказ', short: 'Переказ', icon: ArrowLeftRight },
    { to: '/convert', label: 'Обмін', short: 'Обмін', icon: Repeat },
  ]
  if (user?.capabilities?.includes('borrow')) {
    items.push({ to: '/business', label: 'Мій бізнес', short: 'Бізнес', icon: Briefcase })
  }
  // Адмінство — не capability, а окремий прапорець: права на чужі рахунки не
  // мають підмішуватися до звичайних ролей.
  if (user?.isAdmin) {
    items.push({ to: '/admin', label: 'Адмін', short: 'Адмін', icon: ShieldCheck })
    // `desktopOnly` — курси правлять із комп’ютера, і шостий пункт у нижній
    // панелі відібрав би ширину в п’яти щоденних. На телефоні вони за
    // кнопкою в адмінці, звідки по них і ходять.
    items.push({ to: '/rates', label: 'Курси', short: 'Курси', icon: Coins, desktopOnly: true })
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
    '/wallet': (memberships.data ?? []).filter((m) => m.status === 'pending').length,
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
          <NavLink
            to="/wallet"
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
                <NavLink key={item.to} to={item.to} className={deskLinkClass}>
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

      {/* Нижній відступ звільняє місце під панель навігації разом із «шторкою»
          iPhone — інакше остання операція в списку назавжди лишається під нею. */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:py-8 md:pb-10">
        <Outlet />
      </main>

      <MobileNav items={items} waiting={waiting} />
    </div>
  )
}

/**
 * Нижня панель — основна навігація на телефоні.
 *
 * Пунктів щонайбільше п’ять (три базові плюс бізнес і адмінка), тож усі
 * вміщаються в один ряд без «ще» і без гамбургера: кожен розділ — один дотик
 * у зоні, куди дістає великий палець. Те, що позначене `desktopOnly`, сюди не
 * потрапляє — саме щоб цих п’яти не стало шість.
 */
function MobileNav({ items, waiting }) {
  const visible = items.filter((item) => !item.desktopOnly)
  return (
    <nav
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
      aria-label="Основна навігація"
    >
      <ul className="flex items-stretch">
        {visible.map((item) => {
          const count = waiting[item.to] ?? 0
          return (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'tap relative flex h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="relative">
                      {/* Активний пункт підсвічується «пігулкою» під іконкою:
                          самого кольору на 11-піксельному підписі замало, щоб
                          з розбігу зрозуміти, де ти зараз. */}
                      <span
                        className={cn(
                          'absolute -inset-x-3 -inset-y-1 rounded-full transition-colors',
                          isActive ? 'bg-primary/12' : 'bg-transparent',
                        )}
                        aria-hidden
                      />
                      <item.icon className="relative size-5" aria-hidden />
                      {count > 0 && (
                        <span
                          className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-semibold text-primary-foreground"
                          aria-label={`${count} чекає на вас`}
                        >
                          {count}
                        </span>
                      )}
                    </span>
                    <span className="max-w-full truncate px-0.5">{item.short}</span>
                  </>
                )}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

const initial = (name) => (name ? name.trim().charAt(0).toUpperCase() : '·')
