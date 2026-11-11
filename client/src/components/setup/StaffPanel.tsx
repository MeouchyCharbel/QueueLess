import { useState, type FormEvent } from 'react'
import Alert from '../Alert'
import Button from '../Button'
import TextField from '../TextField'
import HoursForm from './HoursForm'
import { EmptyState } from '../LoadStates'
import { apiFetch } from '../../api/client'
import type { OwnerService, OwnerStaff } from '../../api/types'

type Draft = { name: string; active: boolean; serviceIds: number[] }

type StaffFormProps = {
  services: OwnerService[]
  initial: Draft
  submitLabel: string
  onSubmit: (body: Draft) => Promise<void>
  onCancel?: () => void
}

// Used both to add a staff member and to edit one.
function StaffForm({ services, initial, submitLabel, onSubmit, onCancel }: StaffFormProps) {
  const [draft, setDraft] = useState(initial)
  const [error, setError] = useState('')
  const [serverError, setServerError] = useState('')
  const [saving, setSaving] = useState(false)

  function toggleService(id: number) {
    const has = draft.serviceIds.includes(id)
    setDraft({ ...draft, serviceIds: has ? draft.serviceIds.filter((s) => s !== id) : [...draft.serviceIds, id] })
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setServerError('')
    if (!draft.name.trim()) {
      setError('Enter the staff member name')
      return
    }
    setError('')
    setSaving(true)
    try {
      await onSubmit({ ...draft, name: draft.name.trim() })
      setDraft(initial)
    } catch (err) {
      setServerError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-lg border border-line bg-surface p-4">
      {serverError && <Alert tone="error">{serverError}</Alert>}
      <TextField
        label="Name"
        value={draft.name}
        onChange={(e) => {
          setDraft({ ...draft, name: e.target.value })
          setError('')
        }}
        error={error}
        className="max-w-sm"
      />
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Services this person performs</legend>
        {services.length === 0 ? (
          <p className="text-sm text-muted">Add services first, in the Services tab.</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {services.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.serviceIds.includes(s.id)}
                  onChange={() => toggleService(s.id)}
                  className="size-4 accent-brand"
                />
                {s.name}
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.active}
          onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
          className="size-4 accent-brand"
        />
        Customers can book with this person
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

type StaffPanelProps = {
  businessId: number
  staff: OwnerStaff[]
  services: OwnerService[]
  onChanged: () => void
}

// The team. A solo business adds one staff member: the owner.
export default function StaffPanel({ businessId, staff, services, onChanged }: StaffPanelProps) {
  const [open, setOpen] = useState<{ id: number; panel: 'edit' | 'hours' } | null>(null)
  const serviceName = (id: number) => services.find((s) => s.id === id)?.name ?? ''

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">Working alone? Add yourself as the only staff member.</p>

      {staff.length === 0 ? (
        <EmptyState title="No staff yet">Add the first person below.</EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {staff.map((member) => (
            <li key={member.id} className="space-y-4 p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-medium">
                    {member.name}
                    {!member.active && (
                      <span className="ml-2 rounded-full bg-surface px-2 py-1 text-xs text-muted">Hidden</span>
                    )}
                  </p>
                  <p className="text-sm text-muted">
                    {member.serviceIds.length > 0 ? member.serviceIds.map(serviceName).join(', ') : 'No services yet'}
                    {' · '}
                    {member.hours.length > 0 ? 'Own hours' : 'Business hours'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => setOpen({ id: member.id, panel: 'edit' })}>
                    Edit
                  </Button>
                  <Button variant="secondary" onClick={() => setOpen({ id: member.id, panel: 'hours' })}>
                    Hours
                  </Button>
                </div>
              </div>

              {open?.id === member.id && open.panel === 'edit' && (
                <StaffForm
                  services={services}
                  initial={{ name: member.name, active: member.active, serviceIds: member.serviceIds }}
                  submitLabel="Save staff member"
                  onCancel={() => setOpen(null)}
                  onSubmit={async (body) => {
                    await apiFetch(`/api/staff/${member.id}`, { method: 'PATCH', body: JSON.stringify(body) })
                    setOpen(null)
                    onChanged()
                  }}
                />
              )}

              {open?.id === member.id && open.panel === 'hours' && (
                <div className="rounded-lg border border-line bg-surface p-4">
                  <HoursForm
                    initial={{ hours: member.hours, breaks: member.breaks }}
                    endpoint={`/api/staff/${member.id}/hours`}
                    note={`Days ticked here replace the business hours for ${member.name}. Leave every day unticked to use the business hours.`}
                    onSaved={onChanged}
                  />
                  <Button variant="secondary" className="mt-4" onClick={() => setOpen(null)}>
                    Close
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div>
        <h3 className="mb-2 font-semibold">Add a staff member</h3>
        <StaffForm
          services={services}
          initial={{ name: '', active: true, serviceIds: [] }}
          submitLabel="Add staff member"
          onSubmit={async (body) => {
            await apiFetch(`/api/businesses/${businessId}/staff`, { method: 'POST', body: JSON.stringify(body) })
            onChanged()
          }}
        />
      </div>
    </div>
  )
}
