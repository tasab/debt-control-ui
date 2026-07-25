import { NavLink, Outlet } from 'react-router-dom'
import {
  ArrowLeftRight,
  Briefcase,
  ChartLine,
  LogOut,
  Repeat,
  Store,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
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

/**
 * Navigation is derived from capabilities (D7), not from a role: a user with
 * both `invest` and `borrow` simply sees both groups, with no special case.
 */
function navFor(user) {
  const items = [
    { to: '/wallet', label: 'Гаманець', icon: Wallet },
    { to: '/transfer', label: 'Переказ', icon: ArrowLeftRight },
    { to: '/convert', label: 'Обмін', icon: Repeat },
  ]
  if (user?.capabilities?.includes('invest')) {
    items.push(
      { to: '/market', label: 'Маркетплейс', icon: Store },
      { to: '/portfolio', label: 'Портфель', icon: ChartLine },
    )
  }
  if (user?.capabilities?.includes('borrow')) {
    items.push({ to: '/business', label: 'Мій бізнес', icon: Briefcase })
  }
  return items
}

const linkClass = ({ isActive }) =>
  cn(
    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-primary text-primary-foreground shadow-xs'
      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
  )

export function AppShell() {
  const { user, logout } = useAuth()
  const items = navFor(user)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <NavLink to="/wallet" className="text-base font-semibold tracking-tight">
            ₴ Debt Control
          </NavLink>

          <nav className="flex flex-1 flex-wrap gap-1">
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass}>
                <item.icon className="size-4" aria-hidden />
                <span className="hidden sm:inline">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <span className="hidden max-w-40 truncate sm:inline">{user?.displayName}</span>
                {user?.rating && (
                  <Badge variant="secondary" className="font-mono">
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
                <NavLink to="/profile">Профіль і статистика</NavLink>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => logout.mutate()}>
                <LogOut className="size-4" aria-hidden />
                Вийти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
