import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import Alert from '../components/Alert'
import Button from '../components/Button'
import PageHeader from '../components/PageHeader'
import TextField from '../components/TextField'
import { homeFor, useAuth } from '../auth/useAuth'
import type { SignupData } from '../auth/authContext'
import type { Role } from '../api/types'

type Errors = Partial<Record<'name' | 'email' | 'password', string>>

// The same rules the server checks. Checking here first gives instant
// feedback; the server still checks again because it cannot trust the browser.
function validateSignup(form: SignupData): Errors {
  const errors: Errors = {}
  if (!form.name.trim()) errors.name = 'Enter your name'
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Enter a valid email'
  if (form.password.length < 8) errors.password = 'Use at least 8 characters'
  return errors
}

const ROLES: { value: Role; label: string; description: string }[] = [
  { value: 'CUSTOMER', label: 'Customer', description: 'I want to book appointments' },
  { value: 'OWNER', label: 'Business owner', description: 'I want to take bookings' },
]

export default function SignupPage() {
  const { user, signup } = useAuth()
  const location = useLocation()
  const [form, setForm] = useState<SignupData>({ name: '', email: '', password: '', role: 'CUSTOMER' })
  const [errors, setErrors] = useState<Errors>({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const from: string | undefined = location.state?.from

  // Once logged in (right after signing up), leave this page:
  // owners start by setting up their business, customers go back to
  // the page they came from.
  if (user) {
    return <Navigate to={user.role === 'OWNER' ? '/owner/setup' : (from ?? homeFor(user.role))} replace />
  }

  // One handler for every field: the input's name says which key changed.
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
    setErrors({ ...errors, [name]: undefined }) // clear the error once the user edits the field
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setServerError('')
    const found = validateSignup(form)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    try {
      // On success the user is saved and the check at the top redirects.
      await signup({ ...form, name: form.name.trim(), email: form.email.trim() })
    } catch (err) {
      setServerError((err as Error).message)
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Create an account" subtitle="Book appointments or manage your business." />
      <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-lg border border-line bg-card p-6">
        {serverError && <Alert tone="error">{serverError}</Alert>}

        <fieldset>
          <legend className="mb-2 text-sm font-medium">I am a</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {ROLES.map((role) => (
              <label
                key={role.value}
                className={[
                  'flex cursor-pointer gap-2 rounded-lg border p-4 transition-colors duration-200',
                  form.role === role.value ? 'border-brand bg-brand-soft' : 'border-line hover:bg-surface',
                ].join(' ')}
              >
                <input
                  type="radio"
                  name="role"
                  value={role.value}
                  checked={form.role === role.value}
                  onChange={handleChange}
                  className="mt-1 accent-brand"
                />
                <span>
                  <span className="block text-sm font-semibold">{role.label}</span>
                  <span className="block text-sm text-muted">{role.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <TextField label="Name" name="name" autoComplete="name" value={form.name} onChange={handleChange} error={errors.name} />
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
        />
        <TextField
          label="Password"
          type="password"
          name="password"
          autoComplete="new-password"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
          hint="At least 8 characters"
        />
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Creating account…' : 'Sign up'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" state={location.state} className="font-medium text-brand hover:underline">
          Log in
        </Link>
      </p>
    </div>
  )
}
