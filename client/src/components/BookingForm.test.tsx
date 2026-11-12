// Front-end test (Vitest + Testing Library): the booking form.
// The API is replaced by a fake (vi.mock), so the test runs without a server.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import BookingForm from './BookingForm'
import { AuthContext, type AuthState } from '../auth/authContext'
import { apiFetch, ApiError } from '../api/client'
import type { BusinessDetail } from '../api/types'

// Keep the real ApiError class, replace only apiFetch.
vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  apiFetch: vi.fn(),
}))
const mockedFetch = vi.mocked(apiFetch)

const business: BusinessDetail = {
  id: 1,
  name: 'Fade Studio',
  location: 'Beirut',
  address: 'Hamra St',
  phone: '123456',
  email: 'fade@example.com',
  categoryId: 1,
  category: { id: 1, name: 'Barbershop' },
  services: [
    { id: 10, name: 'Haircut', price: 15, durationMinutes: 30 },
    { id: 11, name: 'Beard trim', price: 8, durationMinutes: 15 },
  ],
  staff: [
    { id: 20, name: 'Rami', serviceIds: [10, 11] },
    { id: 21, name: 'Karim', serviceIds: [10] },
  ],
}

// 08:00 UTC = 10:00 Beirut time in winter.
const TEN = '2026-12-01T08:00:00.000Z'
const TEN_THIRTY = '2026-12-01T08:30:00.000Z'

const customer: AuthState = {
  user: { id: 5, name: 'Sara', email: 'sara@example.com', role: 'CUSTOMER' },
  checking: false,
  login: vi.fn(),
  signup: vi.fn(),
  logout: vi.fn(),
}

function renderForm() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={customer}>
        <BookingForm business={business} />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockedFetch.mockReset()
  // The availability endpoint answers with two free times.
  mockedFetch.mockImplementation(async (path: string) => {
    if (path.includes('/availability')) {
      return { date: '2026-12-01', timezone: 'Asia/Beirut', slots: [{ startAt: TEN, endAt: TEN_THIRTY }, { startAt: TEN_THIRTY, endAt: TEN_THIRTY }] }
    }
    throw new Error(`unexpected request ${path}`)
  })
})

describe('BookingForm', () => {
  it('only offers staff who perform the chosen service, and picks the only one automatically', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('radio', { name: /haircut/i }))
    const staffSelect = screen.getByRole('combobox', { name: /staff member/i })
    expect(screen.getByRole('option', { name: 'Rami' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Karim' })).toBeInTheDocument()
    expect(staffSelect).toHaveValue('') // two people: the customer chooses

    await user.click(screen.getByRole('radio', { name: /beard trim/i }))
    expect(screen.queryByRole('option', { name: 'Karim' })).not.toBeInTheDocument()
    expect(staffSelect).toHaveValue('20') // only Rami does beard trims
  })

  it('keeps "Confirm booking" disabled until a free time is chosen, then sends the booking', async () => {
    const user = userEvent.setup()
    renderForm()
    const confirm = screen.getByRole('button', { name: /confirm booking/i })
    expect(confirm).toBeDisabled()

    await user.click(screen.getByRole('radio', { name: /beard trim/i })) // Rami picked automatically
    await user.click(await screen.findByRole('button', { name: '10:00' }))
    expect(confirm).toBeEnabled()

    mockedFetch.mockResolvedValueOnce({
      id: 99,
      status: 'PENDING',
      startAt: TEN,
      endAt: TEN_THIRTY,
      service: business.services[1],
      staff: { id: 20, name: 'Rami' },
    })
    await user.click(confirm)

    expect(mockedFetch).toHaveBeenLastCalledWith('/api/appointments', {
      method: 'POST',
      body: JSON.stringify({ businessId: 1, serviceId: 11, staffId: 20, startAt: TEN }),
    })
    expect(await screen.findByText(/booking requested/i)).toBeInTheDocument()
  })

  it('shows the error and clears the chosen time when the slot was just taken (409)', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.click(screen.getByRole('radio', { name: /beard trim/i }))
    await user.click(await screen.findByRole('button', { name: '10:00' }))

    mockedFetch.mockRejectedValueOnce(new ApiError(409, 'This time was just booked by someone else.'))
    await user.click(screen.getByRole('button', { name: /confirm booking/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/just booked by someone else/i)
    expect(screen.getByRole('button', { name: /confirm booking/i })).toBeDisabled()
  })
})
