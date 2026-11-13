import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { apiFetch } from '../api/client'
import type { AuthResponse, User } from '../api/types'
import { AuthContext, type SignupData } from './authContext'

// Browser sessions are stored as HttpOnly cookies set by the API.
// No JWT is saved in localStorage or otherwise exposed to browser JavaScript.
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)

  const saveSession = useCallback(({ user }: AuthResponse) => {
    setUser(user)
    return user
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    // Best effort: if offline, the cookie can still exist until it expires.
    void apiFetch<null>('/api/auth/logout', { method: 'POST' }).catch(() => {})
  }, [])

  // A cookie is unreadable by JS. Ask the server who owns the current session.
  useEffect(() => {
    let active = true
    apiFetch<User>('/api/auth/me')
      .then((currentUser) => { if (active) setUser(currentUser) })
      .catch(() => { if (active) setUser(null) })
      .finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [])

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
