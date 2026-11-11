import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import Alert from '../components/Alert'
import Button from '../components/Button'
import PageHeader from '../components/PageHeader'
import TextField from '../components/TextField'
import { homeFor, useAuth } from '../auth/useAuth'

export default function LoginPage() {
  const { user, login } = useAuth()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // A protected page sends people here with the page they wanted in `from`.
  const from: string | undefined = location.state?.from

  // Once logged in (right after submitting), leave this page.
  if (user) {
    return <Navigate to={from ?? homeFor(user.role)} replace />
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      // On success the user is saved and the check above redirects.
      await login(form.email.trim(), form.password)
    } catch (err) {
      setError((err as Error).message)
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Log in" subtitle="Welcome back to QueueLess." />
      <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-lg border border-line bg-card p-6">
        {error && <Alert tone="error">{error}</Alert>}
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <TextField
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <Button type="submit" disabled={submitting || !form.email || !form.password} className="w-full">
          {submitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        No account yet?{' '}
        <Link to="/signup" state={location.state} className="font-medium text-brand hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  )
}
