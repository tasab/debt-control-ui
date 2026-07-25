import { QueryClient } from '@tanstack/react-query'

// Shared across the app so imperative helpers (saveSnapshot/deleteSnapshot) can
// invalidate the same cache the hooks read from.
export const queryClient = new QueryClient()
