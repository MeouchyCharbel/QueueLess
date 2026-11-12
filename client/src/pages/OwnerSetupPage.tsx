import { useState } from 'react'
import { Link } from 'react-router'
import PageHeader from '../components/PageHeader'
import ProfileForm from '../components/setup/ProfileForm'
import HoursForm from '../components/setup/HoursForm'
import ServicesPanel from '../components/setup/ServicesPanel'
import StaffPanel from '../components/setup/StaffPanel'
import { ErrorState, LoadingState } from '../components/LoadStates'
import { useApi } from '../hooks/useApi'
import { ApiError } from '../api/client'
import type { OwnerBusiness } from '../api/types'

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'hours', label: 'Hours & breaks' },
  { id: 'services', label: 'Services' },
  { id: 'staff', label: 'Staff' },
] as const

type TabId = (typeof TABS)[number]['id']

// What a business still needs before customers can find and book it
// (the search only lists businesses with an active service and staff member).
function Checklist({ business }: { business: OwnerBusiness }) {
  const items = [
    { done: business.hours.length > 0, label: 'Opening hours set' },
    { done: business.services.some((s) => s.active), label: 'At least one active service' },
    {
      done: business.staff.some((m) => m.active && m.serviceIds.length > 0),
      label: 'At least one active staff member with a service',
    },
  ]
  const ready = items.every((i) => i.done)

  return (
    <div className={`mb-8 rounded-lg border p-4 ${ready ? 'border-success bg-success-soft' : 'border-line bg-card'}`}>
      <p className="font-semibold">
        {ready ? (
          <>
            Customers can find and book {business.name}.{' '}
            <Link to={`/businesses/${business.id}`} className="text-brand hover:underline">
              See your public page
            </Link>
          </>
        ) : (
          'Finish these steps so customers can find and book you:'
        )}
      </p>
      {!ready && (
        <ul className="mt-2 space-y-1 text-sm">
          {items.map((item) => (
            <li key={item.label} className={item.done ? 'text-success' : 'text-muted'}>
              {item.done ? '✓' : '○'} {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Owner business setup: profile, working hours, services and staff.
export default function OwnerSetupPage() {
  const { data: business, error, loading, reload } = useApi<OwnerBusiness>('/api/businesses/mine')
  const [tab, setTab] = useState<TabId>('profile')

  if (loading && !business) return <LoadingState label="Loading your business…" />

  // 404 = this owner has not created a business yet.
  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Create your business" subtitle="Start with your business profile. You can add hours, services and staff next." />
        <div className="rounded-lg border border-line bg-card p-6">
          <ProfileForm onSaved={reload} />
        </div>
      </div>
    )
  }
  if (error || !business) return <ErrorState error={error ?? new Error('Something went wrong')} onRetry={reload} />

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Business setup" subtitle={business.name} />
      <Checklist business={business} />

      <div role="tablist" aria-label="Setup sections" className="mb-6 flex flex-wrap gap-2 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={[
              '-mb-px min-h-11 border-b-2 px-4 py-2 text-sm font-semibold transition-colors duration-200',
              tab === t.id ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <section
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        className="rounded-lg border border-line bg-card p-4 sm:p-6"
      >
        {tab === 'profile' && <ProfileForm businessId={business.id} initial={business} onSaved={reload} />}
        {tab === 'hours' && (
          <HoursForm
            initial={{ hours: business.hours, breaks: business.breaks }}
            endpoint={`/api/businesses/${business.id}/hours`}
            note="Tick the days you are open. Times are in Beirut time."
            onSaved={reload}
          />
        )}
        {tab === 'services' && <ServicesPanel businessId={business.id} services={business.services} onChanged={reload} />}
        {tab === 'staff' && (
          <StaffPanel businessId={business.id} staff={business.staff} services={business.services} onChanged={reload} />
        )}
      </section>
    </div>
  )
}
