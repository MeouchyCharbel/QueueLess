import { useState } from 'react'
import Alert from './Alert'
import Button from './Button'
import RescheduleForm from './RescheduleForm'
import StatusBadge from './StatusBadge'
import { apiFetch } from '../api/client'
import { formatDate, formatTime } from '../lib/format'
import type { Appointment, AppointmentStatus } from '../api/types'

type Props = {
  appointment: Appointment
  onChanged: (message: string) => void // tells the dashboard to reload
}

// One appointment on the owner's day view. The buttons follow the status
// rules of the API: confirm a pending one, complete a confirmed one,
// reschedule or cancel any active one.
export default function OwnerAppointmentCard({ appointment, onChanged }: Props) {
  const [mode, setMode] = useState<'view' | 'confirm-cancel' | 'reschedule'>('view')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const { service, staff, customer, status, startAt, endAt } = appointment
  const active = status === 'PENDING' || status === 'CONFIRMED'

  async function setStatus(next: AppointmentStatus, message: string) {
    setError('')
    setBusy(true)
    try {
      await apiFetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      })
      setMode('view')
      onChanged(message)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className={`rounded-lg border border-line bg-card p-4 sm:p-6 ${active ? '' : 'opacity-75'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-lg font-semibold">
            {formatTime(startAt)}–{formatTime(endAt)}
          </p>
          <p className="font-medium">
            {service.name} · {staff.name}
          </p>
          <p className="text-sm text-muted">
            {customer.name} ·{' '}
            <a href={`mailto:${customer.email}`} className="text-brand hover:underline">
              {customer.email}
            </a>
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      {error && (
        <div className="mt-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {active && mode === 'view' && (
        <div className="mt-4 flex flex-wrap gap-2">
          {status === 'PENDING' && (
            <Button disabled={busy} onClick={() => setStatus('CONFIRMED', `Confirmed ${customer.name}'s ${service.name}.`)}>
              Confirm
            </Button>
          )}
          {status === 'CONFIRMED' && (
            <Button
              disabled={busy}
              onClick={() => setStatus('COMPLETED', `Marked ${customer.name}'s ${service.name} as completed.`)}
            >
              Complete
            </Button>
          )}
          <Button variant="secondary" disabled={busy} onClick={() => setMode('reschedule')}>
            Reschedule
          </Button>
          <Button variant="danger" disabled={busy} onClick={() => setMode('confirm-cancel')}>
            Cancel
          </Button>
        </div>
      )}

      {mode === 'confirm-cancel' && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-danger-soft p-4">
          <p className="mr-auto text-sm font-medium text-danger">Cancel this appointment? The customer will be emailed.</p>
          <Button
            variant="danger"
            disabled={busy}
            onClick={() => setStatus('CANCELLED', `Cancelled ${customer.name}'s ${service.name}.`)}
          >
            {busy ? 'Cancelling…' : 'Yes, cancel'}
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => setMode('view')}>
            Keep it
          </Button>
        </div>
      )}

      {mode === 'reschedule' && (
        <RescheduleForm
          appointment={appointment}
          onClose={() => setMode('view')}
          onDone={(updated) => {
            setMode('view')
            onChanged(
              `Moved ${customer.name}'s ${service.name} to ${formatDate(updated.startAt)} at ${formatTime(updated.startAt)}.`,
            )
          }}
        />
      )}
    </article>
  )
}
