import { useState, type FormEvent } from 'react'
import Alert from '../Alert'
import Button from '../Button'
import TextField from '../TextField'
import { EmptyState } from '../LoadStates'
import { apiFetch } from '../../api/client'
import { formatDuration, formatPrice } from '../../lib/format'
import type { OwnerService } from '../../api/types'

type Draft = { name: string; price: string; durationMinutes: string; active: boolean }
type Errors = Partial<Record<'name' | 'price' | 'durationMinutes', string>>

// Same rules as the server.
function validate(d: Draft): Errors {
  const errors: Errors = {}
  if (!d.name.trim()) errors.name = 'Enter the service name'
  const price = Number(d.price)
  if (d.price === '' || Number.isNaN(price) || price < 0) errors.price = 'Enter a price (0 or more)'
  const minutes = Number(d.durationMinutes)
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 480) errors.durationMinutes = 'Between 5 and 480 minutes'
  return errors
}

type ServiceFormProps = {
  initial: Draft
  submitLabel: string
  onSubmit: (body: { name: string; price: number; durationMinutes: number; active: boolean }) => Promise<void>
  onCancel?: () => void
}

// Used both to add a service and to edit one.
function ServiceForm({ initial, submitLabel, onSubmit, onCancel }: ServiceFormProps) {
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [serverError, setServerError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setServerError('')
    const found = validate(draft)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setSaving(true)
    try {
      await onSubmit({
        name: draft.name.trim(),
        price: Number(draft.price),
        durationMinutes: Number(draft.durationMinutes),
        active: draft.active,
      })
      setDraft(initial) // ready for the next one
    } catch (err) {
      setServerError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-lg border border-line bg-surface p-4">
      {serverError && <Alert tone="error">{serverError}</Alert>}
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label="Service name"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          error={errors.name}
        />
        <TextField
          label="Price ($)"
          type="number"
          min="0"
          step="0.5"
          value={draft.price}
          onChange={(e) => setDraft({ ...draft, price: e.target.value })}
          error={errors.price}
        />
        <TextField
          label="Duration (minutes)"
          type="number"
          min="5"
          max="480"
          step="5"
          value={draft.durationMinutes}
          onChange={(e) => setDraft({ ...draft, durationMinutes: e.target.value })}
          error={errors.durationMinutes}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.active}
          onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
          className="size-4 accent-brand"
        />
        Customers can book this service
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}

const EMPTY: Draft = { name: '', price: '', durationMinutes: '30', active: true }

type ServicesPanelProps = {
  businessId: number
  services: OwnerService[]
  onChanged: () => void
}

// The services a business offers. Services are switched off instead of
// deleted, so past appointments keep their history.
export default function ServicesPanel({ businessId, services, onChanged }: ServicesPanelProps) {
  const [editingId, setEditingId] = useState<number | null>(null)

  return (
    <div className="space-y-6">
      {services.length === 0 ? (
        <EmptyState title="No services yet">Add your first service below.</EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {services.map((s) => (
            <li key={s.id} className="p-4">
              {editingId === s.id ? (
                <ServiceForm
                  initial={{ name: s.name, price: String(s.price), durationMinutes: String(s.durationMinutes), active: s.active }}
                  submitLabel="Save service"
                  onCancel={() => setEditingId(null)}
                  onSubmit={async (body) => {
                    await apiFetch(`/api/services/${s.id}`, { method: 'PATCH', body: JSON.stringify(body) })
                    setEditingId(null)
                    onChanged()
                  }}
                />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">
                      {s.name}{' '}
                      {!s.active && <span className="ml-2 rounded-full bg-surface px-2 py-1 text-xs text-muted">Hidden</span>}
                    </p>
                    <p className="text-sm text-muted">
                      {formatDuration(s.durationMinutes)} · {formatPrice(s.price)}
                    </p>
                  </div>
                  <Button variant="secondary" onClick={() => setEditingId(s.id)}>
                    Edit
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div>
        <h3 className="mb-2 font-semibold">Add a service</h3>
        <ServiceForm
          initial={EMPTY}
          submitLabel="Add service"
          onSubmit={async (body) => {
            await apiFetch(`/api/businesses/${businessId}/services`, { method: 'POST', body: JSON.stringify(body) })
            onChanged()
          }}
        />
      </div>
    </div>
  )
}
