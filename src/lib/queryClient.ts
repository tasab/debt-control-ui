import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Money changes when the user acts, not on a timer — mutations invalidate
      // explicitly (see lib/hooks), so refetching on every focus is noise.
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      // A 401 is handled globally; retrying it only delays the redirect.
      retry: (failureCount, error) => error?.status !== 401 && failureCount < 2,
    },
  },
})
