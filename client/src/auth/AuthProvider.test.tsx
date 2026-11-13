import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AuthProvider from './AuthProvider'
import { useAuth } from './useAuth'
import { apiFetch } from '../api/client'

vi.mock('../api/client', () => ({ apiFetch: vi.fn() }))
const mockFetch = vi.mocked(apiFetch)
const currentUser = { id: 1, name: 'Test User', email: 'test@example.com', role: 'CUSTOMER' as const }

function Probe() {
  const { user, logout } = useAuth()
  const [error, setError] = useState('')
  return (
    <div>
      <span data-testid="session">{user ? 'authenticated' : 'signed-out'}</span>
      <span role="alert">{error}</span>
      <button onClick={() => { void logout().catch(() => setError('Logout failed')) }}>Log out</button>
    </div>
  )
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('AuthProvider logout', () => {
  it('keeps the user authenticated when logout fails', async () => {
    mockFetch.mockImplementation(async (path: string) => {
      if (path === '/api/auth/me') return currentUser
      if (path === '/api/auth/logout') throw new Error('Network unavailable')
      throw new Error('Unexpected request')
    })
    render(<AuthProvider><Probe /></AuthProvider>)
    expect(await screen.findByText('authenticated')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Log out' }))
    expect(await screen.findByText('Logout failed')).toBeInTheDocument()
    expect(screen.getByTestId('session')).toHaveTextContent('authenticated')
  })

  it('marks the user signed out only after successful logout', async () => {
    let finishLogout: ((value: null) => void) | undefined
    mockFetch.mockImplementation(async (path: string) => {
      if (path === '/api/auth/me') return currentUser
      if (path === '/api/auth/logout') return new Promise<null>((resolve) => { finishLogout = resolve })
      throw new Error('Unexpected request')
    })
    render(<AuthProvider><Probe /></AuthProvider>)
    expect(await screen.findByText('authenticated')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Log out' }))
    expect(screen.getByTestId('session')).toHaveTextContent('authenticated')
    await act(async () => { finishLogout?.(null) })
    await waitFor(() => expect(screen.getByTestId('session')).toHaveTextContent('signed-out'))
  })
})
