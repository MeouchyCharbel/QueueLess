import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { homeFor, useAuth } from '../auth/useAuth'
import type { Role } from '../api/types'

type RequireAuthProps = {
  role: Role
  children: ReactNode
}

// Protected page: logged-out visitors go to the login page (and come back
// here afterwards); a logged-in user with the wrong role goes to their own
// home page. This only hides screens — the API checks every request itself.
export default function RequireAuth({ role, children }: RequireAuthProps) {
  const { user, checking } = useAuth()
  const location = useLocation()

  if (checking) {
    return <p className="text-muted">Loading…</p>
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  if (user.role !== role) {
    return <Navigate to={homeFor(user.role)} replace />
  }
  return children
}
