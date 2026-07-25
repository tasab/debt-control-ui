import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AppShell } from '@/components/layout/AppShell'
import { ErrorBoundary } from '@/components/layout/states'
import { AuthProvider, landingFor, useAuth } from '@/lib/auth'

import Login from '@/pages/auth/Login.jsx'
import Register from '@/pages/auth/Register.jsx'
import Wallet from '@/pages/wallet/Wallet.jsx'
import Transfer from '@/pages/wallet/Transfer.jsx'
import Convert from '@/pages/wallet/Convert.jsx'
import History, { TransactionDetail } from '@/pages/wallet/History.jsx'
import Market from '@/pages/market/Market.jsx'
import RequestDetail from '@/pages/market/RequestDetail.jsx'
import Portfolio from '@/pages/invest/Portfolio.jsx'
import LoanDetail from '@/pages/invest/LoanDetail.jsx'
import Business from '@/pages/business/Business.jsx'
import NewRequest from '@/pages/business/NewRequest.jsx'
import Profile from '@/pages/profile/Profile.jsx'

export default function App() {
  return (
    <AuthProvider>
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

          {/* One session check for the whole app, at the shell. */}
          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route index element={<HomeRedirect />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/transfer" element={<Transfer />} />
              <Route path="/convert" element={<Convert />} />
              <Route path="/history" element={<History />} />
              <Route path="/history/:id" element={<TransactionDetail />} />

              {/* Capability routing is navigation only — the server enforces
                  access on every endpoint regardless (PLATFORM_PLAN §8). */}
              <Route element={<RequireCapability capability="invest" />}>
                <Route path="/market" element={<Market />} />
                <Route path="/portfolio" element={<Portfolio />} />
              </Route>
              <Route path="/market/:id" element={<RequestDetail />} />
              <Route path="/loans/:id" element={<LoanDetail />} />

              <Route element={<RequireCapability capability="borrow" />}>
                <Route path="/business" element={<Business />} />
                <Route path="/business/requests/new" element={<NewRequest />} />
              </Route>

              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
        </Routes>
      </ErrorBoundary>
      <Toaster position="top-right" richColors />
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

function HomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={landingFor(user)} replace />
}

function BootSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-10">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="text-5xl font-semibold tracking-tight text-muted-foreground">404</p>
      <h1 className="mt-4 text-lg font-medium">Такої сторінки немає</h1>
      <Button asChild className="mt-6">
        <Link to="/wallet">На гаманець</Link>
      </Button>
    </div>
  )
}
