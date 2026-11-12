import { useId, type SelectHTMLAttributes } from 'react'

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  error?: string
}

// A labelled dropdown, styled like TextField. Pass the <option>s as children.
export default function SelectField({ label, error, className = '', children, ...selectProps }: SelectFieldProps) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        {...selectProps}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={[
          'block min-h-11 w-full rounded-md border bg-card px-4 py-2 text-ink',
          'transition-colors duration-200 focus:border-brand',
          error ? 'border-danger' : 'border-line',
        ].join(' ')}
      >
        {children}
      </select>
      {error && (
        <p id={errorId} className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
