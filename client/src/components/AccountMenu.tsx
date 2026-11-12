import { useEffect, useRef, useState } from 'react'
import Icon from './Icons'
import type { User } from '../api/types'

type AccountMenuProps = {
  user: User
  onLogout: () => void
}

// "Hi, name" button that opens a small menu with the account email and
// Log out. Closes on a click outside or the Escape key.
export default function AccountMenu({ user, onLogout }: AccountMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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

  const firstName = user.name.split(' ')[0]

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 items-center gap-2 rounded-md border border-line bg-brand-soft px-4 text-[15px] font-semibold text-ink transition-colors duration-200 hover:border-brand"
      >
        <Icon name="user" className="size-5 text-muted" />
        Hi, {firstName}
        <Icon name="chevronDown" className={`size-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-2 w-60 rounded-lg border border-line bg-card p-2 shadow-panel"
        >
          <p className="truncate px-2 py-2 text-sm text-muted">{user.email}</p>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onLogout()
            }}
            className="w-full rounded-md px-2 py-2 text-left text-sm font-semibold text-danger transition-colors duration-200 hover:bg-danger-soft"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  )
}
