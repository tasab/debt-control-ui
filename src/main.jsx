import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { queryClient } from './lib/queryClient'

// shadcn/ui theming is class-based (`.dark`), so mirror the OS colour scheme
// onto <html> and keep it in sync if the user flips their system preference.
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')
const applyTheme = (dark) =>
  document.documentElement.classList.toggle('dark', dark)
applyTheme(prefersDark.matches)
prefersDark.addEventListener('change', (e) => applyTheme(e.matches))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
