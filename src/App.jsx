import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { cn } from '@/lib/utils'
import Dashboard from './pages/Dashboard.jsx'
import Entry from './pages/Entry.jsx'
import History from './pages/History.jsx'
import People from './pages/People.jsx'
import PersonDetail from './pages/PersonDetail.jsx'
import Currencies from './pages/Currencies.jsx'
import Audit from './pages/Audit.jsx'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/entry', label: 'Daily Entry' },
  { to: '/history', label: 'History' },
  { to: '/people', label: 'People' },
  { to: '/currencies', label: 'Currencies' },
  { to: '/audit', label: 'Audit' },
]

const linkClass = ({ isActive }) =>
  cn(
    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-primary text-primary-foreground shadow-xs'
      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
  )

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="text-base font-semibold tracking-tight">
            💱 Debt Tracker
          </span>
          <nav className="flex flex-wrap gap-1">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/entry" element={<Entry />} />
          <Route path="/history" element={<History />} />
          <Route path="/people" element={<People />} />
          <Route path="/people/:id" element={<PersonDetail />} />
          <Route path="/currencies" element={<Currencies />} />
          <Route path="/audit" element={<Audit />} />
        </Routes>
      </main>
    </div>
  )
}
