import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { apiFetch, TOKEN_KEY } from '../api/client'
import type { AuthResponse, User } from '../api/types'
import { AuthContext, type SignupData } from './authContext'

// Holds the login state for the whole app.
// The token lives in localStorage (survives a page refresh) AND in React
// state (makes the screen update); both are always written and cleared together.
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(() => localStorage.getItem(TOKEN_KEY) !== null)

  const saveSession = useCallback(({ token, user }: AuthResponse) => {
    localStorage.setItem(TOKEN_KEY, token)
    setUser(user)
    return user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }, [])

  // On page load, a saved token is only a guess: ask the server who it belongs to.
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return
    apiFetch<User>('/api/auth/me')
      .then(setUser)
      .catch(logout)
      .finally(() => setChecking(false))
  }, [logout])

  // The API client fires this when the server answers 401 (token expired).
  useEffect(() => {
    window.addEventListener('auth:expired', logout)
    return () => window.removeEventListener('auth:expired', logout)
  }, [logout])

  async function login(email: string, password: string) {
    const data = await apiFetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    return saveSession(data)
  }

  async function signup(form: SignupData) {
    const data = await apiFetch<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(form),
    })
    return saveSession(data)
  }

  return (
    <AuthContext.Provider value={{ user, checking, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
