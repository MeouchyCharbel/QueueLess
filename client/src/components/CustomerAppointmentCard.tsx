import { useState } from 'react'
import { Link } from 'react-router'
import Alert from './Alert'
import Button from './Button'
import RescheduleForm from './RescheduleForm'
import StatusBadge from './StatusBadge'
import { apiFetch } from '../api/client'
import { formatDate, formatPrice, formatTime } from '../lib/format'
import type { Appointment } from '../api/types'

type Props = {
  appointment: Appointment
  canChange: boolean // upcoming and still active
  onChanged: (message: string) => void // tells the page to reload the list
}

// One appointment on the customer's dashboard. Upcoming active appointments
// can be rescheduled or cancelled (cancel asks for confirmation first).
export default function CustomerAppointmentCard({ appointment, canChange, onChanged }: Props) {
  const [mode, setMode] = useState<'view' | 'confirm-cancel' | 'reschedule'>('view')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const { business, service, staff, status, startAt } = appointment

  async function cancel() {
    setError('')
    setBusy(true)
    try {
      await apiFetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'CANCELLED' }),
      })
      setMode('view')
      setBusy(false)
      onChanged(`Your ${service.name} at ${business.name} was cancelled.`)
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <article className="rounded-lg border border-line bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-muted">
            {formatDate(startAt)} · {formatTime(startAt)}
          </p>
          <h3 className="mt-1 text-lg">
            {service.name} with {staff.name}
          </h3>
          <p className="text-sm text-muted">
            <Link to={`/businesses/${business.id}`} className="font-medium text-brand hover:underline">
              {business.name}
            </Link>{' '}
            · {business.address}, {business.location} · {formatPrice(service.price)}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      {error && (
        <div className="mt-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {canChange && mode === 'view' && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setMode('reschedule')}>
            Reschedule
          </Button>
          <Button variant="danger" onClick={() => setMode('confirm-cancel')}>
            Cancel
          </Button>
        </div>
      )}

      {mode === 'confirm-cancel' && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-danger-soft p-4">
          <p className="mr-auto text-sm font-medium text-danger">Cancel this appointment?</p>
          <Button variant="danger" onClick={cancel} disabled={busy}>
            {busy ? 'Cancelling…' : 'Yes, cancel'}
          </Button>
          <Button variant="secondary" onClick={() => setMode('view')} disabled={busy}>
            Keep it
          </Button>
        </div>
      )}

      {mode === 'reschedule' && (
        <RescheduleForm
          appointment={appointment}
          onClose={() => setMode('view')}
          onDone={(updated) => {
            setMode('view') // close the form; the page reloads the list
            onChanged(
              `Moved to ${formatDate(updated.startAt)} at ${formatTime(updated.startAt)}. ${business.name} will confirm the new time.`,
            )
          }}
        />
      )}
    </article>
  )
}
