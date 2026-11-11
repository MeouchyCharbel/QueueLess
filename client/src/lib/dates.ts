// Calendar math on "YYYY-MM-DD" strings (business dates, no time of day).
// Working in UTC means no clock change can shift a date by one.

function toUtc(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function fromUtc(day: Date) {
  return day.toISOString().slice(0, 10)
}

// addDays('2026-11-30', 1) -> '2026-12-01'
export function addDays(date: string, days: number) {
  const day = toUtc(date)
  day.setUTCDate(day.getUTCDate() + days)
  return fromUtc(day)
}

// The Monday of the week that contains `date`.
export function startOfWeek(date: string) {
  const weekday = toUtc(date).getUTCDay() // 0 = Sunday ... 6 = Saturday
  return addDays(date, weekday === 0 ? -6 : 1 - weekday)
}

// The 7 dates of a week, Monday first.
export function weekDays(date: string) {
  const monday = startOfWeek(date)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

// "Mon 16 Nov" for a date string.
export function formatDay(date: string) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(
    toUtc(date),
  )
}

// "Monday 16 November 2026" for a date string.
export function formatDayLong(date: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(toUtc(date))
}

export function isValidDate(value: string | null): value is string {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value) && fromUtc(toUtc(value)) === value
}
