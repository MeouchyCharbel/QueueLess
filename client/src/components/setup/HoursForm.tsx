import { useState, type FormEvent } from 'react'
import Alert from '../Alert'
import Button from '../Button'
import { apiFetch } from '../../api/client'
import type { Schedule } from '../../api/types'

// Shown Monday first; the numbers match the API (0 = Sunday ... 6 = Saturday).
const DAYS = [
  { weekday: 1, name: 'Monday' },
  { weekday: 2, name: 'Tuesday' },
  { weekday: 3, name: 'Wednesday' },
  { weekday: 4, name: 'Thursday' },
  { weekday: 5, name: 'Friday' },
  { weekday: 6, name: 'Saturday' },
  { weekday: 0, name: 'Sunday' },
]

type DayRow = {
  weekday: number
  open: boolean
  start: string
  end: string
  hasBreak: boolean
  breakStart: string
  breakEnd: string
}

// One row per weekday, filled from the saved schedule (one break per day).
function toRows({ hours, breaks }: Schedule): DayRow[] {
  return DAYS.map(({ weekday }) => {
    const day = hours.find((h) => h.weekday === weekday)
    const pause = breaks.find((b) => b.weekday === weekday)
    return {
      weekday,
      open: Boolean(day),
      start: day?.startTime ?? '09:00',
      end: day?.endTime ?? '17:00',
      hasBreak: Boolean(pause),
      breakStart: pause?.startTime ?? '13:00',
      breakEnd: pause?.endTime ?? '14:00',
    }
  })
}

// Back to the shape the API expects. "HH:MM" strings compare correctly.
function toSchedule(rows: DayRow[]): Schedule {
  const open = rows.filter((r) => r.open)
  return {
    hours: open.map((r) => ({ weekday: r.weekday, startTime: r.start, endTime: r.end })),
    breaks: open.filter((r) => r.hasBreak).map((r) => ({ weekday: r.weekday, startTime: r.breakStart, endTime: r.breakEnd })),
  }
}

function validateRow(r: DayRow): string | undefined {
  if (!r.open) return undefined
  if (!(r.start < r.end)) return 'Closing time must be after opening time'
  if (r.hasBreak && !(r.breakStart < r.breakEnd)) return 'The break must end after it starts'
  if (r.hasBreak && (r.breakStart < r.start || r.breakEnd > r.end)) return 'The break must be inside the opening hours'
  return undefined
}

type HoursFormProps = {
  initial: Schedule
  endpoint: string // PUT target: business hours or one staff member's hours
  note?: string
  onSaved: () => void
}

// Weekly opening hours with an optional break per day.
export default function HoursForm({ initial, endpoint, note, onSaved }: HoursFormProps) {
  const [rows, setRows] = useState(() => toRows(initial))
  const [serverError, setServerError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showErrors, setShowErrors] = useState(false)

  const errors = rows.map(validateRow)
  const hasErrors = errors.some(Boolean)

  function update(weekday: number, changes: Partial<DayRow>) {
    setRows(rows.map((r) => (r.weekday === weekday ? { ...r, ...changes } : r)))
    setSaved(false)
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setShowErrors(true)
    setServerError('')
    if (hasErrors) return
    setSaving(true)
    try {
      await apiFetch(endpoint, { method: 'PUT', body: JSON.stringify(toSchedule(rows)) })
      setSaved(true)
      onSaved()
    } catch (err) {
      setServerError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const timeClass = 'min-h-11 rounded-lg border border-line bg-card px-2 py-2 disabled:opacity-60'

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {note && <p className="text-sm text-muted">{note}</p>}
      {serverError && <Alert tone="error">{serverError}</Alert>}
      {saved && <Alert tone="success">Hours saved.</Alert>}

      <div className="divide-y divide-line rounded-lg border border-line">
        {rows.map((row, i) => {
          const day = DAYS[i].name
          return (
            <fieldset key={row.weekday} className="flex flex-wrap items-center gap-4 p-4">
              <legend className="sr-only">{day}</legend>
              <label className="flex w-32 items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  checked={row.open}
                  onChange={(e) => update(row.weekday, { open: e.target.checked })}
                  className="size-4 accent-brand"
                />
                {day}
              </label>

              {row.open ? (
                <>
                  <span className="flex items-center gap-2">
                    <input
                      type="time"
                      aria-label={`${day} opening time`}
                      value={row.start}
                      onChange={(e) => update(row.weekday, { start: e.target.value })}
                      className={timeClass}
                    />
                    <span aria-hidden="true">–</span>
                    <input
                      type="time"
                      aria-label={`${day} closing time`}
                      value={row.end}
                      onChange={(e) => update(row.weekday, { end: e.target.value })}
                      className={timeClass}
                    />
                  </span>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={row.hasBreak}
                      onChange={(e) => update(row.weekday, { hasBreak: e.target.checked })}
                      className="size-4 accent-brand"
                    />
                    Break
                  </label>
                  {row.hasBreak && (
                    <span className="flex items-center gap-2">
                      <input
                        type="time"
                        aria-label={`${day} break start`}
                        value={row.breakStart}
                        onChange={(e) => update(row.weekday, { breakStart: e.target.value })}
                        className={timeClass}
                      />
                      <span aria-hidden="true">–</span>
                      <input
                        type="time"
                        aria-label={`${day} break end`}
                        value={row.breakEnd}
                        onChange={(e) => update(row.weekday, { breakEnd: e.target.value })}
                        className={timeClass}
                      />
                    </span>
                  )}
                </>
              ) : (
                <span className="text-sm text-muted">Closed</span>
              )}

              {showErrors && errors[i] && <p className="w-full text-sm text-danger">{errors[i]}</p>}
            </fieldset>
          )
        })}
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save hours'}
      </Button>
    </form>
  )
}
