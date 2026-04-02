import { createContext, useContext, useState, useEffect } from 'react'
import { settingsAPI } from '../api'

const UIContext = createContext(null)

export function UIProvider({ children }) {
  const [theme, setThemeState] = useState(() => localStorage.getItem('theme') || 'light')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState({})
  const [settings, setSettings] = useState(null)

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'deep-space' : 'light')
      : theme
    )
    localStorage.setItem('theme', theme)
  }, [theme])

  const setTheme = async (t) => {
    setThemeState(t)
    try { await settingsAPI.update({ preferences: { theme: t } }) } catch (_) {}
  }

  const loadSettings = async () => {
    try {
      const res = await settingsAPI.get()
      setSettings(res.data.settings)
      if (res.data.settings?.preferences?.theme) {
        setThemeState(res.data.settings.preferences.theme)
      }
    } catch (_) {}
  }

  return (
    <UIContext.Provider value={{
      theme, setTheme,
      sidebarCollapsed, setSidebarCollapsed,
      searchQuery, setSearchQuery,
      activeFilters, setActiveFilters,
      settings, setSettings, loadSettings,
    }}>
      {children}
    </UIContext.Provider>
  )
}

export const useUI = () => useContext(UIContext)
