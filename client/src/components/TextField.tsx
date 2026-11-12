import { useId, type InputHTMLAttributes } from 'react'

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  hint?: string
}

// A labelled input. The <label> is connected to the input (clicking it
// focuses the field, screen readers read it), and an error message is shown
// under the field and announced through aria-invalid / aria-describedby.
export default function TextField({ label, error, hint, className = '', ...inputProps }: TextFieldProps) {
  const id = useId()
  const messageId = `${id}-message`

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        {...inputProps}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={[
          'block min-h-11 w-full rounded-md border bg-card px-4 py-2 text-ink',
          'transition-colors duration-200 focus:border-brand',
          error ? 'border-danger' : 'border-line',
        ].join(' ')}
      />
      {error ? (
        <p id={messageId} className="mt-1 text-sm text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={messageId} className="mt-1 text-sm text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  )
}
