import type { AppointmentStatus } from '../api/types'

// Each status has a label and a color; all pairs pass the 4.5:1 contrast rule.
// `short` gives a one-word label for tight spaces (the owner's week view).
const STATUS: Record<AppointmentStatus, { label: string; short: string; className: string }> = {
  PENDING: { label: 'Waiting for confirmation', short: 'Pending', className: 'bg-accent text-ink' },
  CONFIRMED: { label: 'Confirmed', short: 'Confirmed', className: 'bg-brand-soft text-brand' },
  COMPLETED: { label: 'Completed', short: 'Completed', className: 'bg-success-soft text-success' },
  CANCELLED: { label: 'Cancelled', short: 'Cancelled', className: 'bg-surface text-muted' },
}

export default function StatusBadge({ status, short = false }: { status: AppointmentStatus; short?: boolean }) {
  const { label, short: shortLabel, className } = STATUS[status]
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${className}`}>
      {short ? shortLabel : label}
    </span>
  )
}
