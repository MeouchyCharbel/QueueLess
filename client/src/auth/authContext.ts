import { createContext } from 'react'
import type { Role, User } from '../api/types'

export type SignupData = {
  name: string
  email: string
  password: string
  role: Role
}

export type AuthState = {
  user: User | null // null = logged out
  checking: boolean // true while a saved token is being checked on page load
  login: (email: string, password: string) => Promise<User>
  signup: (data: SignupData) => Promise<User>
  logout: () => void
}

// Who is logged in is app-wide data (header, protected pages, booking),
// so it is shared through context instead of being passed down by hand.
export const AuthContext = createContext<AuthState | null>(null)
