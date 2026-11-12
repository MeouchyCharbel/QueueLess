import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router'
import Icon from './Icons'
import { useAuth } from '../auth/useAuth'

// Phone navigation (hidden from 768px up, where the normal links show).
// The ☰ button opens a panel with the same links as the desktop navbar,
// including Log in / Sign up or the account and Log out.
export default function MobileMenu() {
  const { user, checking, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on a click outside the menu or the Escape key.
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  if (checking) return null

  const close = () => setOpen(false)
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `block rounded-md px-2 py-3 text-[15px] font-semibold ${isActive ? 'bg-brand-soft text-brand' : 'text-ink'}`

  const links = !user
    ? [{ to: '/', label: 'Find a business' }]
    : user.role === 'CUSTOMER'
      ? [
          { to: '/', label: 'Find a business' },
          { to: '/appointments', label: 'My appointments' },
        ]
      : [
          { to: '/owner', label: 'Appointments' },
          { to: '/owner/setup', label: 'Business setup' },
        ]

  return (
    <div ref={menuRef} className="md:hidden">
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((o) => !o)}
        className="flex size-11 items-center justify-center rounded-md text-ink transition-colors duration-200 hover:bg-brand-soft"
      >
        <Icon name={open ? 'close' : 'menu'} className="size-6" />
      </button>

      {open && (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-full z-20 border-b border-line bg-card px-4 pb-4 shadow-panel"
        >
          <nav aria-label="Mobile" className="pt-2">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end onClick={close} className={linkClass}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-2 border-t border-line pt-4">
            {user ? (
              <>
                <p className="px-2 text-sm font-semibold text-ink">Hi, {user.name.split(' ')[0]}</p>
                <p className="truncate px-2 text-sm text-muted">{user.email}</p>
                <button
                  type="button"
                  onClick={() => {
                    close()
                    logout()
                    navigate('/')
                  }}
                  className="mt-2 w-full rounded-md px-2 py-3 text-left text-[15px] font-semibold text-danger hover:bg-danger-soft"
                >
                  Log out
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <NavLink
                  to="/login"
                  onClick={close}
                  className="flex min-h-11 items-center justify-center rounded-md border border-line text-sm font-semibold text-ink"
                >
                  Log in
                </NavLink>
                <NavLink
                  to="/signup"
                  onClick={close}
                  className="flex min-h-11 items-center justify-center rounded-md bg-brand text-sm font-semibold text-white"
                >
                  Sign up
                </NavLink>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
