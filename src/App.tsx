import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AppShell } from '@/components/layout/AppShell'
import { ConfirmProvider } from '@/components/layout/Confirm'
import { ErrorBoundary } from '@/components/layout/states'
import { AuthProvider, landingFor, useAuth } from '@/lib/auth'

import Login from '@/pages/auth/Login.tsx'
import Register from '@/pages/auth/Register.tsx'
import Wallet from '@/pages/wallet/Wallet.tsx'
import Transfer from '@/pages/wallet/Transfer.tsx'
import Convert from '@/pages/wallet/Convert.tsx'
import History, { TransactionDetail } from '@/pages/wallet/History.tsx'
import Business from '@/pages/business/Business.tsx'
import Profile from '@/pages/profile/Profile.tsx'
import Admin from '@/pages/admin/Admin.tsx'
import RatesPage from '@/pages/admin/Rates.tsx'
import SharedBalance from '@/pages/share/SharedBalance.tsx'

export default function App() {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <ErrorBoundary>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicOnly>
                  <Login />
                </PublicOnly>
              }
            />
            <Route
              path="/register"
              element={
                <PublicOnly>
                  <Register />
                </PublicOnly>
              }
            />

            {/* Публічна сторінка балансу: не під RequireAuth і не під
                PublicOnly — її відкриває і гість, і той, хто вже увійшов, і
                перекидати останнього на гаманець означало б не показати йому
                посилання, яке йому щойно надіслали. */}
            <Route path="/share/:token" element={<SharedBalance />} />

            {/* One session check for the whole app, at the shell. */}
            <Route element={<RequireAuth />}>
              <Route element={<AppShell />}>
                {/* Гаманець — корінь: це перше, заради чого відкривають
                    додаток, і окрема адреса /wallet була зайвим кроком.
                    Стару адресу лишено перенаправленням — вона вже в чиїхось
                    закладках і в посиланнях, надісланих раніше. */}
                <Route index element={<Wallet />} />
                <Route path="/wallet" element={<Navigate to="/" replace />} />
                <Route path="/transfer" element={<Transfer />} />
                <Route path="/convert" element={<Convert />} />
                <Route path="/history" element={<History />} />
                <Route path="/history/:id" element={<TransactionDetail />} />

                {/* Capability routing is navigation only — the server enforces
                    access on every endpoint regardless (PLATFORM_PLAN §8). */}

                <Route element={<RequireCapability capability="borrow" />}>
                  <Route path="/business" element={<Business />} />
                </Route>

                {/* Так само лише навігація: сервер перевіряє isAdmin на кожному
                    ендпоінті /admin/* незалежно від того, що показує клієнт. */}
                <Route element={<RequireAdmin />}>
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/rates" element={<RatesPage />} />
                </Route>

                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Route>
          </Routes>
        </ErrorBoundary>
      </ConfirmProvider>
      <Toaster richColors />
    </AuthProvider>
  )
}

function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <BootSkeleton />
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  return <Outlet />
}

function PublicOnly({ children }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  if (isLoading) return <BootSkeleton />
  if (isAuthenticated) return <Navigate to={landingFor(user)} replace />
  return children
}

function RequireCapability({ capability }) {
  const { can, user } = useAuth()
  if (!can(capability)) return <Navigate to={landingFor(user)} replace />
  return <Outlet />
}

function RequireAdmin() {
  const { user } = useAuth()
  if (!user?.isAdmin) return <Navigate to={landingFor(user)} replace />
  return <Outlet />
}

function BootSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-10">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-36 w-full rounded-2xl" />
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

function NotFound() {
  return (
    <div className="flex flex-col items-center px-4 py-20 text-center">
      <p className="text-5xl font-semibold tracking-tight text-muted-foreground">404</p>
      <h1 className="mt-4 text-lg font-medium">Такої сторінки немає</h1>
      <Button asChild size="lg" className="mt-6 w-full max-w-xs">
        <Link to="/">На гаманець</Link>
      </Button>
    </div>
  )
}
