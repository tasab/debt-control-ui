import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'debt-control-theme'
const ThemeContext = createContext(null)

/** 'light' | 'dark' | 'system' — system follows the OS and keeps following it. */
export function readStoredTheme() {
  if (typeof localStorage === 'undefined') return 'system'
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : 'system'
}

export function resolveTheme(theme) {
  if (theme !== 'system') return theme
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Applies the theme to <html>. Called once from main.jsx before React mounts
 * (so the first paint is already the right colour — no white flash on a dark
 * setup) and again whenever the user picks a different one.
 */
export function applyTheme(theme, { animate = false } = {}) {
  const root = document.documentElement
  const resolved = resolveTheme(theme)

  if (animate) {
    root.classList.add('theme-transition')
    window.setTimeout(() => root.classList.remove('theme-transition'), 200)
  }
  root.classList.toggle('dark', resolved === 'dark')
  root.style.colorScheme = resolved // native form controls and scrollbars follow
  return resolved
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme)

  // Only 'system' listens to the OS; an explicit choice must survive the user
  // flipping their laptop into night mode.
  useEffect(() => {
    if (theme !== 'system') return undefined
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system', { animate: true })
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme])

  const setTheme = useCallback((next) => {
    setThemeState(next)
    if (next === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, next)
    applyTheme(next, { animate: true })
  }, [])

  const toggle = useCallback(() => {
    setTheme(resolveTheme(theme) === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  return (
    <ThemeContext.Provider value={{ theme, resolved: resolveTheme(theme), setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>')
  return context
}
