import { useContext } from 'react'
import { AuthContext } from './authContext'
import type { Role } from '../api/types'

// Any component can read the login state with: const { user } = useAuth()
export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return auth
}

// Where each role lands after logging in.
export function homeFor(role: Role) {
  return role === 'OWNER' ? '/owner' : '/'
}
