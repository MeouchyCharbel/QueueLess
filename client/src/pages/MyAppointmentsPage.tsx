import { useState } from 'react'
import { Link } from 'react-router'
import Alert from '../components/Alert'
import CustomerAppointmentCard from '../components/CustomerAppointmentCard'
import PageHeader from '../components/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../components/LoadStates'
import { useApi } from '../hooks/useApi'
import type { Appointment } from '../api/types'

// Upcoming = still active (pending or confirmed) and not started yet.
function isUpcoming(a: Appointment) {
  return (a.status === 'PENDING' || a.status === 'CONFIRMED') && new Date(a.startAt) > new Date()
}

// Customer dashboard: view, cancel and reschedule appointments.
export default function MyAppointmentsPage() {
  const { data, error, loading, reload } = useApi<Appointment[]>('/api/appointments')
  const [message, setMessage] = useState('')

  function handleChanged(text: string) {
    setMessage(text)
    reload()
  }

  // The list is derived from the data on every render, not stored in state.
  const upcoming = (data ?? []).filter(isUpcoming)
  const history = (data ?? []).filter((a) => !isUpcoming(a)).reverse() // most recent first

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="My appointments" subtitle="View, cancel or reschedule your bookings." />

      {message && (
        <div className="mb-6">
          <Alert tone="success">{message}</Alert>
        </div>
      )}

      {loading && !data ? (
        <LoadingState label="Loading your appointments…" />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : data && data.length === 0 ? (
        <EmptyState title="No appointments yet">
          <Link to="/" className="font-medium text-brand hover:underline">
            Find a business to book
          </Link>
        </EmptyState>
      ) : (
        <div className="space-y-12">
          <section aria-labelledby="upcoming-title">
            <h2 id="upcoming-title" className="mb-4 text-xl">
              Upcoming
            </h2>
            {upcoming.length > 0 ? (
              <div className="space-y-4">
                {upcoming.map((a) => (
                  <CustomerAppointmentCard key={a.id} appointment={a} canChange onChanged={handleChanged} />
                ))}
              </div>
            ) : (
              <EmptyState title="Nothing coming up">
                <Link to="/" className="font-medium text-brand hover:underline">
                  Book an appointment
                </Link>
              </EmptyState>
            )}
          </section>

          {history.length > 0 && (
            <section aria-labelledby="history-title">
              <h2 id="history-title" className="mb-4 text-xl">
                Past and cancelled
              </h2>
              <div className="space-y-4">
                {history.map((a) => (
                  <CustomerAppointmentCard key={a.id} appointment={a} canChange={false} onChanged={handleChanged} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
