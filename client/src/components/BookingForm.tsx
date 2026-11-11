import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import Alert from './Alert'
import Button from './Button'
import SelectField from './SelectField'
import SlotPicker from './SlotPicker'
import { useAuth } from '../auth/useAuth'
import { apiFetch, ApiError } from '../api/client'
import { formatDate, formatDuration, formatPrice, formatTime, todayInBusinessTime } from '../lib/format'
import type { Appointment, BusinessDetail } from '../api/types'

// Booking in four choices: service -> staff member -> date -> free time.
// Each choice resets the ones after it, so the form can never hold a
// combination the server would refuse (and the server checks again anyway).
export default function BookingForm({ business }: { business: BusinessDetail }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [serviceId, setServiceId] = useState<number | null>(null)
  const [staffId, setStaffId] = useState<number | null>(null)
  const [date, setDate] = useState(todayInBusinessTime)
  const [startAt, setStartAt] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [booked, setBooked] = useState<Appointment | null>(null)
  const [slotsVersion, setSlotsVersion] = useState(0) // bump to reload the free times

  // Only staff members who perform the chosen service.
  const staffOptions = business.staff.filter((s) => serviceId !== null && s.serviceIds.includes(serviceId))

  function chooseService(id: number) {
    setServiceId(id)
    const options = business.staff.filter((s) => s.serviceIds.includes(id))
    // Pick the only person automatically (solo businesses); otherwise let the customer choose.
    setStaffId(options.length === 1 ? options[0].id : null)
    setStartAt(null)
    setError('')
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!user) {
      // Log in first, then come back to this business.
      navigate('/login', { state: { from: location.pathname } })
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const appointment = await apiFetch<Appointment>('/api/appointments', {
        method: 'POST',
        body: JSON.stringify({ businessId: business.id, serviceId, staffId, startAt }),
      })
      setBooked(appointment)
    } catch (err) {
      setError((err as Error).message)
      if (err instanceof ApiError && err.status === 409) {
        // Someone else took this time: show the updated free times.
        setStartAt(null)
        setSlotsVersion((v) => v + 1)
      }
    } finally {
      setSubmitting(false)
    }
  }

  function bookAnother() {
    setBooked(null)
    setStartAt(null)
    setSlotsVersion((v) => v + 1)
  }

  if (booked) {
    return (
      <div className="space-y-4">
        <Alert tone="success">Booking requested! {business.name} will confirm it soon.</Alert>
        <p>
          <strong>{booked.service.name}</strong> with {booked.staff.name}
          <br />
          {formatDate(booked.startAt)} at {formatTime(booked.startAt)}
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            to="/appointments"
            className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-dark"
          >
            View my appointments
          </Link>
          <Button variant="secondary" onClick={bookAnother}>
            Book another
          </Button>
        </div>
      </div>
    )
  }

  const isOwner = user?.role === 'OWNER'

  return (
    <form onSubmit={handleSubmit} className="space-y-6" aria-label="Book an appointment">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">1. Service</legend>
        <div className="space-y-2">
          {business.services.map((service) => (
            <label
              key={service.id}
              className={[
                'flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-4 transition-colors duration-200',
                serviceId === service.id ? 'border-brand bg-brand-soft' : 'border-line hover:bg-surface',
              ].join(' ')}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="service"
                  value={service.id}
                  checked={serviceId === service.id}
                  onChange={() => chooseService(service.id)}
                  className="accent-brand"
                />
                <span>
                  <span className="block font-medium">{service.name}</span>
                  <span className="block text-sm text-muted">{formatDuration(service.durationMinutes)}</span>
                </span>
              </span>
              <span className="font-semibold">{formatPrice(service.price)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <SelectField
        label="2. Staff member"
        value={staffId ?? ''}
        disabled={serviceId === null}
        onChange={(e) => {
          setStaffId(e.target.value ? Number(e.target.value) : null)
          setStartAt(null)
        }}
        className="max-w-xs"
      >
        <option value="">{serviceId === null ? 'Choose a service first' : 'Choose a staff member'}</option>
        {staffOptions.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </SelectField>

      <div>
        <p className="mb-2 text-sm font-medium">3. Date and time</p>
        <SlotPicker
          key={slotsVersion}
          businessId={business.id}
          serviceId={serviceId}
          staffId={staffId}
          date={date}
          onDateChange={setDate}
          value={startAt}
          onChange={setStartAt}
        />
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {isOwner ? (
        <Alert tone="info">You are logged in as a business owner. Log in with a customer account to book.</Alert>
      ) : (
        <div className="space-y-2">
          <Button type="submit" disabled={!startAt || submitting} className="w-full sm:w-auto">
            {submitting ? 'Booking…' : user ? 'Confirm booking' : 'Log in to book'}
          </Button>
          {!user && <p className="text-sm text-muted">You will come back to this page after logging in.</p>}
        </div>
      )}
    </form>
  )
}
