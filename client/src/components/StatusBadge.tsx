import type { AppointmentStatus } from '../api/types'

// Each status has a label and a color; all pairs pass the 4.5:1 contrast rule.
const STATUS: Record<AppointmentStatus, { label: string; className: string }> = {
  PENDING: { label: 'Waiting for confirmation', className: 'bg-accent text-ink' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-brand-soft text-brand' },
  COMPLETED: { label: 'Completed', className: 'bg-success-soft text-success' },
  CANCELLED: { label: 'Cancelled', className: 'bg-surface text-muted' },
}

export default function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { label, className } = STATUS[status]
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${className}`}>{label}</span>
}
