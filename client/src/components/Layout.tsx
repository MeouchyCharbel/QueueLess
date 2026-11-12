import { NavLink, Outlet, useNavigate } from 'react-router'
import AccountMenu from './AccountMenu'
import Logo from './Logo'
import { useAuth } from '../auth/useAuth'

// Header link: a forest green underline marks the page you are on.
function navClass({ isActive }: { isActive: boolean }) {
  return [
    'border-b-2 py-2 text-[15px] font-semibold transition-colors duration-200',
    isActive ? 'border-brand text-ink' : 'border-transparent text-muted hover:text-ink',
  ].join(' ')
}

// Different links for visitors, customers and business owners.
function NavLinks() {
  const { user, checking, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  if (checking) return null

  if (!user) {
    return (
      <>
        <NavLink to="/" end className={navClass}>
          Find a business
        </NavLink>
        <NavLink to="/login" className={navClass}>
          Log in
        </NavLink>
        <NavLink
          to="/signup"
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-dark"
        >
          Sign up
        </NavLink>
      </>
    )
  }

  return (
    <>
      {user.role === 'CUSTOMER' ? (
        <>
          <NavLink to="/" end className={navClass}>
            Find a business
          </NavLink>
          <NavLink to="/appointments" className={navClass}>
            My appointments
          </NavLink>
        </>
      ) : (
        <>
          <NavLink to="/owner" end className={navClass}>
            Appointments
          </NavLink>
          <NavLink to="/owner/setup" className={navClass}>
            Business setup
          </NavLink>
        </>
      )}
      <AccountMenu user={user} onLogout={handleLogout} />
    </>
  )
}

const CONTAINER = 'mx-auto w-full max-w-[1440px] px-4 sm:px-8 lg:px-16'

// The frame around every page: header, the current page (<Outlet />), footer.
export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip">
      <header className="border-b border-line bg-card">
        <nav
          aria-label="Main"
          className={`${CONTAINER} flex min-h-[72px] flex-wrap items-center justify-between gap-x-8 gap-y-2 py-2`}
        >
          <Logo />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 sm:gap-x-8">
            <NavLinks />
          </div>
        </nav>
      </header>

      <main className={`${CONTAINER} flex-1 py-8 sm:py-12`}>
        <Outlet />
      </main>

      <footer className="border-t border-line bg-card">
        <p className={`${CONTAINER} py-6 text-center text-sm text-muted`}>QueueLess · Book appointments without the phone calls.</p>
      </footer>
    </div>
  )
}
