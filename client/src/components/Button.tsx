import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark',
  secondary: 'border border-line bg-card text-ink hover:bg-surface',
  danger: 'border border-danger bg-card text-danger hover:bg-danger-soft',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }

// One button style for the whole app. Disabled buttons look faded and
// cannot be clicked twice (for example while a request is running).
export default function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={[
        'inline-flex min-h-11 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold',
        'transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        className,
      ].join(' ')}
    />
  )
}
