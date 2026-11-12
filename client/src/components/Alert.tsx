import type { ReactNode } from 'react'

type AlertProps = {
  tone?: 'error' | 'success' | 'info'
  children: ReactNode
}

const TONES = {
  error: 'border-danger bg-danger-soft text-danger',
  success: 'border-success bg-success-soft text-success',
  info: 'border-brand bg-brand-soft text-ink',
}

// A message box. Errors use role="alert" so screen readers announce them.
export default function Alert({ tone = 'info', children }: AlertProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-md border-l-4 px-4 py-2 text-sm ${TONES[tone]}`}
    >
      {children}
    </div>
  )
}
