import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import Alert from '../components/Alert'
import Button from '../components/Button'
import OwnerAppointmentCard from '../components/OwnerAppointmentCard'
import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import { EmptyState, ErrorState, LoadingState } from '../components/LoadStates'
import { useApi } from '../hooks/useApi'
import { ApiError } from '../api/client'
import { dateInBusinessTime, formatTime, todayInBusinessTime } from '../lib/format'
import { addDays, formatDay, formatDayLong, isValidDate, weekDays } from '../lib/dates'
import type { Appointment, OwnerBusiness } from '../api/types'

type View = 'day' | 'week'

// Owner dashboard: the business's appointments in a day or week view.
// The view and date live in the URL (?view=week&date=2026-11-16), so a
// refresh or the Back button keeps the owner on the same page.
export default function OwnerDashboardPage() {
  const [params, setParams] = useSearchParams()
  const [message, setMessage] = useState('')

  const today = todayInBusinessTime()
  const view: View = params.get('view') === 'week' ? 'week' : 'day'
  const date = isValidDate(params.get('date')) ? params.get('date')! : today
  const days = view === 'week' ? weekDays(date) : [date]
  const from = days[0]
  const to = days[days.length - 1]

  const business = useApi<OwnerBusiness>('/api/businesses/mine')
  const appointments = useApi<Appointment[]>(`/api/appointments?from=${from}&to=${to}`)

  function go(nextView: View, nextDate: string) {
    setMessage('')
    setParams({ view: nextView, date: nextDate })
  }

  function handleChanged(text: string) {
    setMessage(text)
    appointments.reload()
  }

  if (business.loading) return <LoadingState label="Loading your dashboard…" />
  if (business.error instanceof ApiError && business.error.status === 404) {
    return (
      <div>
        <PageHeader title="Appointments" />
        <EmptyState title="Set up your business first">
          <Link to="/owner/setup" className="font-medium text-brand hover:underline">
            Go to business setup
          </Link>
        </EmptyState>
      </div>
    )
  }
  if (business.error) return <ErrorState error={business.error} onRetry={business.reload} />

  const list = appointments.data ?? []
  const pending = list.filter((a) => a.status === 'PENDING').length
  const active = list.filter((a) => a.status === 'PENDING' || a.status === 'CONFIRMED').length
  const step = view === 'week' ? 7 : 1
  const title = view === 'week' ? `${formatDay(from)} – ${formatDay(to)}` : formatDayLong(date)

  return (
    <div>
      <PageHeader title="Appointments" subtitle={business.data?.name} />

      {/* View switch and date navigation */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div role="group" aria-label="View" className="inline-flex rounded-lg border border-line bg-card p-1">
          {(['day', 'week'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => go(v, date)}
              className={[
                'min-h-11 rounded-md px-4 text-sm font-semibold capitalize transition-colors duration-200',
                view === v ? 'bg-ink text-white' : 'text-muted hover:text-ink',
              ].join(' ')}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" aria-label={`Previous ${view}`} onClick={() => go(view, addDays(date, -step))}>
            ←
          </Button>
          <Button variant="secondary" onClick={() => go(view, today)}>
            Today
          </Button>
          <Button variant="secondary" aria-label={`Next ${view}`} onClick={() => go(view, addDays(date, step))}>
            →
          </Button>
        </div>
      </div>

      <h2 className="text-xl">{title}</h2>
      <p className="mb-6 text-sm text-muted">
        {active} active {active === 1 ? 'appointment' : 'appointments'}
        {pending > 0 && ` · ${pending} waiting for your confirmation`}
      </p>

      {message && (
        <div className="mb-6">
          <Alert tone="success">{message}</Alert>
        </div>
      )}

      {appointments.loading && !appointments.data ? (
        <LoadingState label="Loading appointments…" />
      ) : appointments.error ? (
        <ErrorState error={appointments.error} onRetry={appointments.reload} />
      ) : view === 'day' ? (
        list.length > 0 ? (
          <div className="space-y-4">
            {list.map((a) => (
              <OwnerAppointmentCard key={a.id} appointment={a} onChanged={handleChanged} />
            ))}
          </div>
        ) : (
          <EmptyState title="No appointments on this day" />
        )
      ) : (
        // Week: one column per day (stacked on phones). Click a day or an
        // appointment to open that day, where the action buttons are.
        <div className="grid gap-4 lg:grid-cols-7">
          {days.map((day) => {
            const dayList = list.filter((a) => dateInBusinessTime(a.startAt) === day)
            return (
              <section key={day} aria-label={formatDay(day)} className="rounded-lg border border-line bg-card p-2">
                <button
                  type="button"
                  onClick={() => go('day', day)}
                  className={[
                    'mb-2 w-full rounded-md px-2 py-1 text-left text-sm font-semibold transition-colors duration-200 hover:bg-surface',
                    day === today ? 'text-brand' : 'text-ink',
                  ].join(' ')}
                >
                  {formatDay(day)}
                </button>
                {dayList.length === 0 ? (
                  <p className="px-2 pb-2 text-sm text-muted">—</p>
                ) : (
                  <ul className="space-y-2">
                    {dayList.map((a) => (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={() => go('day', day)}
                          className="w-full rounded-md border border-line p-2 text-left text-sm transition-colors duration-200 hover:border-brand"
                        >
                          <span className="block font-semibold">{formatTime(a.startAt)}</span>
                          <span className="block">{a.service.name}</span>
                          <span className="mb-1 block text-muted">{a.customer.name}</span>
                          <StatusBadge status={a.status} short />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
