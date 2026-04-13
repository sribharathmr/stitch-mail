import { createContext, useContext, useEffect, useState } from 'react'
import { authAPI, setToken, clearToken, getToken } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // On mount: check if a token was passed in URL (from Google OAuth redirect)
    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get('token')
    if (urlToken) {
      setToken(urlToken)
      // Clean up the URL to remove the token (security)
      const cleanUrl = window.location.pathname
      window.history.replaceState({}, '', cleanUrl)
    }

    authAPI.me()
      .then(res => {
        setUser(res.data.user)
        // If we got a token but don't have it in session storage, save it now 
        // to isolate this tab's session
        if (res.data.token && !getToken()) {
          setToken(res.data.token)
        }
      })
      .catch(() => {
        setUser(null)
        clearToken()
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password })
    // Save the JWT from the response into sessionStorage
    if (res.data.token) {
      setToken(res.data.token)
    }
    setUser(res.data.user)
    return res.data.user
  }

  const register = async (name, email, password, appPassword) => {
    const res = await authAPI.register({ name, email, password, appPassword })
    if (res.data.token) {
      setToken(res.data.token)
    }
    setUser(res.data.user)
    return res.data.user
  }

  const logout = async () => {
    // Only clear this tab's session — other tabs with different accounts stay logged in
    clearToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
