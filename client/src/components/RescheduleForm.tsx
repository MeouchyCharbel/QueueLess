import { useState, type FormEvent } from 'react'
import Alert from './Alert'
import Button from './Button'
import SlotPicker from './SlotPicker'
import { apiFetch, ApiError } from '../api/client'
import { dateInBusinessTime, todayInBusinessTime } from '../lib/format'
import type { Appointment } from '../api/types'

type RescheduleFormProps = {
  appointment: Appointment
  onDone: (updated: Appointment) => void
  onClose: () => void
}

// Moves an appointment to another free time with the same service and
// staff member. Used by customers and by owners.
export default function RescheduleForm({ appointment, onDone, onClose }: RescheduleFormProps) {
  const today = todayInBusinessTime()
  const current = dateInBusinessTime(appointment.startAt)
  const [date, setDate] = useState(current > today ? current : today)
  const [startAt, setStartAt] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [slotsVersion, setSlotsVersion] = useState(0)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const updated = await apiFetch<Appointment>(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ startAt }),
      })
      onDone(updated)
    } catch (err) {
      setError((err as Error).message)
      if (err instanceof ApiError && err.status === 409) {
        setStartAt(null)
        setSlotsVersion((v) => v + 1) // show the updated free times
      }
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 rounded-lg border border-line bg-surface p-4">
      <p className="text-sm font-medium">Pick a new time</p>
      <SlotPicker
        key={slotsVersion}
        businessId={appointment.business.id}
        serviceId={appointment.service.id}
        staffId={appointment.staff.id}
        date={date}
        onDateChange={setDate}
        value={startAt}
        onChange={setStartAt}
      />
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!startAt || saving}>
          {saving ? 'Saving…' : 'Save new time'}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Keep current time
        </Button>
      </div>
    </form>
  )
}
