import { createContext, useContext, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import * as apis from './api/index.js'
import { setUnauthorizedHandler } from './api/client.js'
import { keys } from './hooks/index.js'

const AuthContext = createContext(null)

/**
 * Session state for the whole app. The cookie is httpOnly, so the client cannot
 * read it — `GET /auth/me` is the only source of truth about who is signed in,
 * and a 401 from anywhere clears it.
 */
export function AuthProvider({ children }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data: user, isLoading } = useQuery({
    queryKey: keys.me,
    queryFn: apis.auth.me,
    retry: false,
    // A failed /auth/me means "not signed in", which is a valid state, not an
    // error to retry into.
    throwOnError: false,
  })

  useEffect(() => {
    setUnauthorizedHandler(() => {
      queryClient.setQueryData(keys.me, null)
      queryClient.clear()
      navigate('/login', { replace: true })
    })
  }, [queryClient, navigate])

  const login = useMutation({
    mutationFn: apis.auth.login,
    onSuccess: (data) => {
      queryClient.setQueryData(keys.me, data)
      navigate(landingFor(data), { replace: true })
    },
  })

  const register = useMutation({
    mutationFn: apis.auth.register,
    onSuccess: (data) => {
      queryClient.setQueryData(keys.me, data)
      navigate(landingFor(data), { replace: true })
    },
  })

  const logout = useMutation({
    mutationFn: apis.auth.logout,
    onSettled: () => {
      queryClient.clear()
      navigate('/login', { replace: true })
    },
  })

  const value = {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    can: (capability) => !!user?.capabilities?.includes(capability),
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}

/** Investors land on the marketplace, borrowers on their dashboard. */
export function landingFor(user) {
  if (user?.capabilities?.includes('borrow')) return '/business'
  return '/market'
}
