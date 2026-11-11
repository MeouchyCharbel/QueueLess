import { useState, type ChangeEvent, type FormEvent } from 'react'
import Alert from '../Alert'
import Button from '../Button'
import SelectField from '../SelectField'
import TextField from '../TextField'
import { apiFetch } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import type { BusinessProfile, Category } from '../../api/types'

type Errors = Partial<Record<keyof BusinessProfile, string>>

type FormState = Omit<BusinessProfile, 'categoryId'> & { categoryId: string }

// Same rules as the server (which checks again).
function validate(form: FormState): Errors {
  const errors: Errors = {}
  if (!form.name.trim()) errors.name = 'Enter the business name'
  if (!form.categoryId) errors.categoryId = 'Choose a category'
  if (!form.location.trim()) errors.location = 'Enter a city or area'
  if (!form.address.trim()) errors.address = 'Enter the address'
  if (!/^\+?[0-9 ()-]{6,20}$/.test(form.phone.trim())) errors.phone = 'Enter a valid phone number'
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Enter a valid email'
  return errors
}

type ProfileFormProps = {
  businessId?: number // missing = create a new business
  initial?: BusinessProfile
  onSaved: () => void
}

// Business profile: creates the business the first time, edits it afterwards.
export default function ProfileForm({ businessId, initial, onSaved }: ProfileFormProps) {
  const categories = useApi<Category[]>('/api/categories')
  const [form, setForm] = useState<FormState>({
    name: initial?.name ?? '',
    categoryId: initial ? String(initial.categoryId) : '',
    location: initial?.location ?? '',
    address: initial?.address ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
  })
  const [errors, setErrors] = useState<Errors>({})
  const [serverError, setServerError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
    setErrors({ ...errors, [name]: undefined })
    setSaved(false)
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setServerError('')
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSaving(true)
    try {
      await apiFetch(businessId ? `/api/businesses/${businessId}` : '/api/businesses', {
        method: businessId ? 'PATCH' : 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          categoryId: Number(form.categoryId),
          location: form.location.trim(),
          address: form.address.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
        }),
      })
      setSaved(true)
      onSaved()
    } catch (err) {
      setServerError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {serverError && <Alert tone="error">{serverError}</Alert>}
      {saved && <Alert tone="success">Profile saved.</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Business name" name="name" value={form.name} onChange={handleChange} error={errors.name} />
        <SelectField
          label="Category"
          name="categoryId"
          value={form.categoryId}
          onChange={handleChange}
          error={errors.categoryId}
        >
          <option value="">Choose a category</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <TextField
          label="City or area"
          name="location"
          placeholder="e.g. Beirut"
          value={form.location}
          onChange={handleChange}
          error={errors.location}
          hint="Customers search by this"
        />
        <TextField label="Address" name="address" value={form.address} onChange={handleChange} error={errors.address} />
        <TextField
          label="Phone"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={handleChange}
          error={errors.phone}
        />
        <TextField
          label="Contact email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
          hint="Booking notifications are sent here"
        />
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? 'Saving…' : businessId ? 'Save profile' : 'Create business'}
      </Button>
    </form>
  )
}
