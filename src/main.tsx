import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { queryClient } from './lib/queryClient'
import { ThemeProvider, applyTheme, readStoredTheme } from './lib/theme.tsx'

// Applied before React mounts: on a dark setup the first paint is already dark,
// with no white flash to blink through.
applyTheme(readStoredTheme())

async function start() {
  // MSW is opt-in (VITE_USE_MOCKS=1) so `npm run dev` always talks to the real
  // server; mocks exist to unblock UI work, not to become the default reality.
  if (import.meta.env.VITE_USE_MOCKS === '1') {
    const { worker } = await import('./mocks/browser.ts')
    await worker.start({ onUnhandledRequest: 'bypass' })
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </StrictMode>,
  )
}

start()
