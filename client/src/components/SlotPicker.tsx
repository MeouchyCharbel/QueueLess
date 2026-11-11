import TextField from './TextField'
import { EmptyState, ErrorState, LoadingState } from './LoadStates'
import { useApi } from '../hooks/useApi'
import { formatTime, todayInBusinessTime } from '../lib/format'
import type { Availability } from '../api/types'

type SlotPickerProps = {
  businessId: number
  serviceId: number | null
  staffId: number | null
  date: string // "YYYY-MM-DD"
  onDateChange: (date: string) => void
  value: string | null // the chosen start time (ISO), or null
  onChange: (startAt: string | null) => void
}

// Date field + the free start times the availability engine offers for it.
// Used for booking and for rescheduling. Only times the server returns can
// be picked, and the server checks the time again when the form is sent.
// The parent owns the date, so reloading the times keeps the chosen day.
export default function SlotPicker({
  businessId,
  serviceId,
  staffId,
  date,
  onDateChange,
  value,
  onChange,
}: SlotPickerProps) {
  const today = todayInBusinessTime()

  const ready = serviceId !== null && staffId !== null && date >= today
  const query = new URLSearchParams({ serviceId: String(serviceId), staffId: String(staffId), date })
  const { data, error, loading, reload } = useApi<Availability>(
    ready ? `/api/businesses/${businessId}/availability?${query}` : null,
  )

  return (
    <div className="space-y-4">
      <TextField
        label="Date"
        type="date"
        min={today}
        value={date}
        onChange={(e) => {
          onDateChange(e.target.value)
          onChange(null) // a time on another day is no longer valid
        }}
        className="max-w-xs"
      />

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Time</legend>
        {!ready ? (
          <p className="text-sm text-muted">
            {date < today ? 'Pick today or a later date.' : 'Choose a service and a staff member first.'}
          </p>
        ) : loading ? (
          <LoadingState label="Finding free times…" />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : data && data.slots.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {data.slots.map((slot) => {
              const selected = slot.startAt === value
              return (
                <button
                  key={slot.startAt}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange(slot.startAt)}
                  className={[
                    'min-h-11 rounded-lg border px-2 py-2 text-sm font-semibold transition-colors duration-200',
                    selected
                      ? 'border-brand bg-brand text-white'
                      : 'border-line bg-card text-ink hover:border-brand hover:text-brand',
                  ].join(' ')}
                >
                  {formatTime(slot.startAt)}
                </button>
              )
            })}
          </div>
        ) : (
          <EmptyState title="No free times on this day">Try another date.</EmptyState>
        )}
      </fieldset>
    </div>
  )
}
