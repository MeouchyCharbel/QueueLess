// Small display helpers, kept apart from the components so they are easy to
// test and reuse. Times are always shown in business time (Beirut).

export const TIMEZONE = 'Asia/Beirut'

const priceFormat = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

// 15 -> "$15", 8.5 -> "$8.50"
export function formatPrice(price: number) {
  return priceFormat.format(price)
}

// 30 -> "30 min", 90 -> "1 h 30 min", 60 -> "1 h"
export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

// "09:30" — the time of a moment, in business time.
export function formatTime(iso: string) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  )
}

// "Fri 20 Nov 2026" — the date of a moment, in business time.
export function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

// Today's date as "YYYY-MM-DD" in business time (the value an <input type="date"> uses).
export function todayInBusinessTime() {
  // The en-CA locale writes dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date())
}
