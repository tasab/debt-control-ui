import { setupWorker } from 'msw/browser'
import { handlers } from './handlers.ts'

// Started from main.jsx only when VITE_USE_MOCKS=1.
export const worker = setupWorker(...handlers)
