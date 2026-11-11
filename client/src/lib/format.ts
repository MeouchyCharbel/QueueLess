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
