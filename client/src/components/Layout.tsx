import { NavLink, Outlet } from 'react-router'
import Logo from './Logo'

// Header link: tangerine underline marks the page you are on.
function navClass({ isActive }: { isActive: boolean }) {
  return [
    'rounded-sm py-1 text-sm font-medium transition-colors duration-200',
    isActive ? 'text-white border-b-2 border-accent' : 'text-white/80 hover:text-white',
  ].join(' ')
}

// The frame around every page: header, the current page (<Outlet />), footer.
export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-ink">
        <nav
          aria-label="Main"
          className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4"
        >
          <Logo />
          <div className="flex flex-wrap items-center gap-6">
            <NavLink to="/" end className={navClass}>
              Find a business
            </NavLink>
            <NavLink to="/login" className={navClass}>
              Log in
            </NavLink>
            <NavLink
              to="/signup"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-dark"
            >
              Sign up
            </NavLink>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-card">
        <p className="mx-auto max-w-5xl px-4 py-6 text-sm text-muted">
          QueueLess · Book appointments without the phone calls.
        </p>
      </footer>
    </div>
  )
}
